'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { fail, ok } = require('../utils/response');

// Helper function to get image URL
const getImageUrl = (req, imagePath) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${imagePath}`;
};

class FolderController {
  
  // API function - Get folders list by type
  static async getFoldersListByType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, type } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getFoldersListByType - Parameters:', { user_id, token, type });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!type) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'type is required'
        });
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      console.log('getFoldersListByType - Decoded user ID:', decodedUserId);
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      console.log('getFoldersListByType - User data:', { 
        user_id: user.user_id, 
        network_folder_created: user.network_folder_created,
        services_folder_created: user.services_folder_created 
      });
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check folder creation status based on type
      let folderCreated = 1;
      let updateUserData = {};
      
      if (type === 'network') {
        folderCreated = user.network_folder_created || 0;
        updateUserData.network_folder_created = 1;
      } else if (type === 'services') {
        folderCreated = user.services_folder_created || 0;
        updateUserData.services_folder_created = 1;
      }

      console.log('getFoldersListByType - Folder creation status:', { type, folderCreated, updateUserData });

      // Create master folders if not created yet
      if (folderCreated === 0) {
        try {
          console.log('getFoldersListByType - Creating master folders for type:', type);
          
          // Get master folders
          const masterFolders = await query('SELECT * FROM folders WHERE status = 1 ORDER BY id ASC');
          console.log('getFoldersListByType - Master folders found:', masterFolders.length);
          
          if (masterFolders.length > 0) {
            // Insert user folders for each master folder
            for (const folder of masterFolders) {
              await query(
                `INSERT INTO user_folders (user_id, master_folder_id, type, folder_name, status, created_dts) 
                 VALUES (?, ?, ?, ?, 1, NOW())`,
                [decodedUserId, folder.id, type, folder.name]
              );
            }

            // Update user to mark folders as created
            const updateFields = Object.keys(updateUserData).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updateUserData);
            updateValues.push(decodedUserId);
            
            await query(
              `UPDATE users SET ${updateFields} WHERE user_id = ?`,
              updateValues
            );
            
            console.log('getFoldersListByType - User folders created and user updated');
          }
        } catch (error) {
          console.error('getFoldersListByType - Error creating folders:', error);
          // Continue with getting existing folders even if creation fails
        }
      }

      // Get folders list
      let foldersList = [];
      try {
        console.log('getFoldersListByType - Getting folders list for user:', decodedUserId, 'type:', type);
        
        // First try to get folders with contacts count
        foldersList = await query(
          `SELECT uf.user_folder_id, uf.folder_name, uf.master_folder_id, uf.type,
                  COALESCE(COUNT(uc.contact_user_id), 0) as contacts_count
           FROM user_folders uf
           LEFT JOIN user_contacts uc ON uf.user_folder_id = uc.user_folder_id AND uc.status = 1
           WHERE uf.user_id = ? AND uf.type = ? AND uf.status = 1
           GROUP BY uf.user_folder_id, uf.folder_name, uf.master_folder_id, uf.type
           ORDER BY uf.user_folder_id ASC`,
          [decodedUserId, type]
        );
        
        console.log('getFoldersListByType - Folders with contacts found:', foldersList.length);
      } catch (error) {
        console.error('getFoldersListByType - Error getting folders with contacts:', error);
        
        // Fallback: try to get just the folders without contacts
        try {
          foldersList = await query(
            `SELECT user_folder_id, folder_name, master_folder_id, type
             FROM user_folders 
             WHERE user_id = ? AND type = ? AND status = 1
             ORDER BY user_folder_id ASC`,
            [decodedUserId, type]
          );
          
          // Add default contacts_count
          foldersList.forEach(folder => {
            folder.contacts_count = 0;
          });
          
          console.log('getFoldersListByType - Basic folders found:', foldersList.length);
        } catch (fallbackError) {
          console.error('getFoldersListByType - Fallback query also failed:', fallbackError);
          foldersList = [];
        }
      }

      // Get visiting cards count for each folder
      const visitingCardsCount = {};
      try {
        const visitingCardsList = await query(
          `SELECT user_folder_id, COUNT(*) as visiting_cards_count 
           FROM user_contacts_visiting_cards 
           WHERE user_id = ? AND status = 1 
           GROUP BY user_folder_id`,
          [decodedUserId]
        );
        
        if (visitingCardsList.length > 0) {
          visitingCardsList.forEach(row => {
            visitingCardsCount[row.user_folder_id] = row.visiting_cards_count;
          });
        }
        
        console.log('getFoldersListByType - Visiting cards count:', visitingCardsCount);
      } catch (error) {
        console.error('getFoldersListByType - Error getting visiting cards count:', error);
        // Continue without visiting cards count
      }

      // Add visiting cards count to folders list and convert all numeric values to strings
      if (foldersList.length > 0) {
        foldersList.forEach(folder => {
          folder.visiting_cards_count = visitingCardsCount[folder.user_folder_id] || "0";
        });
      }

      // Convert all integer values to strings to match the exact response format
      const formattedFoldersList = foldersList.map(folder => ({
        user_folder_id: (folder.user_folder_id || 0).toString(),
        user_id: (decodedUserId || 0).toString(),
        master_folder_id: (folder.master_folder_id || 0).toString(),
        type: folder.type || "",
        folder_name: folder.folder_name || "",
        status: "1", // Always 1 for active folders
        created_dts: folder.created_dts || new Date().toISOString().slice(0, 19).replace('T', ' '),
        contacts_count: (folder.contacts_count || 0).toString(),
        visiting_cards_count: (folder.visiting_cards_count || 0).toString()
      }));

      console.log('getFoldersListByType - Final folders list:', formattedFoldersList);
      
      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        folders_list: formattedFoldersList
      });
      
    } catch (error) {
      console.error('getFoldersListByType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get folders list'
      });
    }
  }

  // API function - Save folder by type
  static async saveFolderByType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, type, folder_name, user_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveFolderByType - Parameters:', { user_id, token, type, folder_name, user_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!type || !folder_name) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      let finalUserFolderId = user_folder_id || 0;

      if (finalUserFolderId == 0) {
        // Insert new folder
        const folderData = {
          user_id: decodedUserId,
          master_folder_id: 0,
          type: type,
          folder_name: folder_name,
          status: 1
        };
        
        const result = await query(
          `INSERT INTO user_folders (user_id, master_folder_id, type, folder_name, status, created_dts) 
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [folderData.user_id, folderData.master_folder_id, folderData.type, folderData.folder_name, folderData.status]
        );
        
        finalUserFolderId = result.insertId;
        console.log('saveFolderByType - New folder created with ID:', finalUserFolderId);
      } else {
        // Update existing folder
        await query(
          `UPDATE user_folders SET master_folder_id = ?, type = ?, folder_name = ?, status = ? 
           WHERE user_folder_id = ? AND user_id = ?`,
          [0, type, folder_name, 1, finalUserFolderId, decodedUserId]
        );
        
        console.log('saveFolderByType - Existing folder updated:', finalUserFolderId);
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_folder_id: finalUserFolderId,
        message: 'Folder saved successfully'
      });
      
    } catch (error) {
      console.error('saveFolderByType error:', error);
      return fail(res, 500, 'Failed to save folder');
    }
  }

  // API function - Get sub folders list
  static async getSubFoldersList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getSubFoldersList - Parameters:', { user_id, token, user_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!user_folder_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_folder_id is required'
        });
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Get visiting cards count for each sub folder
      const visitingCardsCount = {};
      try {
        const visitingCardsList = await query(
          `SELECT user_sub_folder_id, COUNT(*) as visiting_cards_count 
           FROM user_contacts_visiting_cards 
           WHERE user_id = ? AND status = 1 
           GROUP BY user_sub_folder_id`,
          [decodedUserId]
        );
        
        if (visitingCardsList.length > 0) {
          visitingCardsList.forEach(row => {
            visitingCardsCount[row.user_sub_folder_id] = row.visiting_cards_count;
          });
        }
        
        console.log('getSubFoldersList - Visiting cards count:', visitingCardsCount);
      } catch (error) {
        console.error('getSubFoldersList - Error getting visiting cards count:', error);
        // Continue without visiting cards count
      }

      // Get sub folders list with contacts count
      let subFoldersList = [];
      try {
        subFoldersList = await query(
          `SELECT usf.user_sub_folder_id, usf.folder_name, usf.user_folder_id,
                  COALESCE(COUNT(uc.contact_user_id), 0) as contacts_count
           FROM user_sub_folders usf
           LEFT JOIN user_contacts uc ON usf.user_sub_folder_id = uc.user_sub_folder_id AND uc.status = 1
           WHERE usf.user_id = ? AND usf.user_folder_id = ? AND usf.status = 1
           GROUP BY usf.user_sub_folder_id, usf.folder_name, usf.user_folder_id
           ORDER BY usf.user_sub_folder_id ASC`,
          [decodedUserId, user_folder_id]
        );
        
        console.log('getSubFoldersList - Sub folders with contacts found:', subFoldersList.length);
      } catch (error) {
        console.error('getSubFoldersList - Error getting sub folders with contacts:', error);
        
        // Fallback: try to get just the sub folders without contacts
        try {
          subFoldersList = await query(
            `SELECT user_sub_folder_id, folder_name, user_folder_id
             FROM user_sub_folders 
             WHERE user_id = ? AND user_folder_id = ? AND status = 1
             ORDER BY user_sub_folder_id ASC`,
            [decodedUserId, user_folder_id]
          );
          
          // Add default contacts_count
          subFoldersList.forEach(folder => {
            folder.contacts_count = 0;
          });
          
          console.log('getSubFoldersList - Basic sub folders found:', subFoldersList.length);
        } catch (fallbackError) {
          console.error('getSubFoldersList - Fallback query also failed:', fallbackError);
          subFoldersList = [];
        }
      }

      // Add visiting cards count to sub folders list and convert all numeric values to strings
      if (subFoldersList.length > 0) {
        subFoldersList.forEach(folder => {
          folder.visiting_cards_count = visitingCardsCount[folder.user_sub_folder_id] || "0";
        });
      }

      // Convert all integer values to strings to match the exact response format
      const formattedSubFoldersList = subFoldersList.map(folder => ({
        user_sub_folder_id: (folder.user_sub_folder_id || 0).toString(),
        user_id: (decodedUserId || 0).toString(),
        user_folder_id: (folder.user_folder_id || 0).toString(),
        folder_name: folder.folder_name || "",
        status: "1", // Always 1 for active sub folders
        created_dts: folder.created_dts || new Date().toISOString().slice(0, 19).replace('T', ' '),
        contacts_count: (folder.contacts_count || 0).toString(),
        visiting_cards_count: (folder.visiting_cards_count || 0).toString()
      }));

      console.log('getSubFoldersList - Final sub folders list:', formattedSubFoldersList);
      
      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        sub_folders_list: formattedSubFoldersList
      });
      
    } catch (error) {
      console.error('getSubFoldersList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get sub folders list'
      });
    }
  }

  // API function - Save sub folder
  static async saveSubFolder(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, folder_name, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveSubFolder - Parameters:', { user_id, token, folder_name, user_folder_id, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_folder_id || user_folder_id <= 0 || !folder_name) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      let finalUserSubFolderId = user_sub_folder_id || 0;

      if (finalUserSubFolderId == 0) {
        // Insert new sub folder
        const subFolderData = {
          user_id: decodedUserId,
          user_folder_id: user_folder_id,
          folder_name: folder_name,
          status: 1
        };
        
        const result = await query(
          `INSERT INTO user_sub_folders (user_id, user_folder_id, folder_name, status, created_dts) 
           VALUES (?, ?, ?, ?, NOW())`,
          [subFolderData.user_id, subFolderData.user_folder_id, subFolderData.folder_name, subFolderData.status]
        );
        
        finalUserSubFolderId = result.insertId;
        console.log('saveSubFolder - New sub folder created with ID:', finalUserSubFolderId);
      } else {
        // Update existing sub folder
        await query(
          `UPDATE user_sub_folders SET user_folder_id = ?, folder_name = ?, status = ? 
           WHERE user_sub_folder_id = ? AND user_id = ?`,
          [user_folder_id, folder_name, 1, finalUserSubFolderId, decodedUserId]
        );
        
        console.log('saveSubFolder - Existing sub folder updated:', finalUserSubFolderId);
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_folder_id: user_folder_id,
        user_sub_folder_id: finalUserSubFolderId,
        message: 'Sub Folder saved successfully'
      });
      
    } catch (error) {
      console.error('saveSubFolder error:', error);
      return fail(res, 500, 'Failed to save sub folder');
    }
  }

  // API function - Get contacts list
  static async getContactsList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getContactsList - Parameters:', { user_id, token, user_folder_id, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get contacts list
      const contactsList = await query(`
        SELECT 
          uc.contact_user_id,
          uc.user_folder_id,
          uc.user_sub_folder_id,
          COALESCE(u.full_name, '') as full_name,
          COALESCE(u.email, '') as email,
          u.mobile,
          CASE 
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || 'http://192.168.0.100:3000'}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo
        FROM user_contacts uc
        JOIN users u ON u.user_id = uc.contact_user_id
        WHERE uc.user_id = ? 
        AND uc.user_folder_id = ? 
        AND uc.user_sub_folder_id = ? 
        AND uc.status = 1
      `, [decodedUserId, user_folder_id, user_sub_folder_id]);

      // Format contacts list to convert all numeric fields to strings
      const formattedContactsList = (contactsList || []).map(contact => ({
        contact_user_id: String(contact.contact_user_id),
        user_folder_id: String(contact.user_folder_id),
        user_sub_folder_id: String(contact.user_sub_folder_id),
        full_name: contact.full_name || '',
        email: contact.email || '',
        mobile: contact.mobile || '',
        profile_photo: contact.profile_photo || ''
      }));

      // Return response in standard format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        contacts_list: formattedContactsList
      });
      
    } catch (error) {
      console.error('getContactsList error:', error);
      return fail(res, 500, 'Failed to get contacts list');
    }
  }

  // API function - Get contact visiting card information
  static async getContactVisitingCardInformation(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getContactVisitingCardInformation - Parameters:', { user_id, token, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!user_sub_folder_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_sub_folder_id is required'
        });
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Get contact visiting card information
      const contactCardInfo = await query(`
        SELECT 
          ucvc.*
        FROM user_contacts_visiting_cards ucvc
        WHERE ucvc.user_id = ? 
        AND ucvc.user_sub_folder_id = ? 
        AND ucvc.status = 1
      `, [decodedUserId, user_sub_folder_id]);

      // Convert all integer values to strings and generate proper image URLs to match Flutter model
      const formattedContactCardInfo = contactCardInfo.map(card => ({
        ucvc_id: String(card.ucvc_id || 0),
        user_id: String(card.user_id || 0),
        user_folder_id: String(card.user_folder_id || 0),
        user_sub_folder_id: String(card.user_sub_folder_id || 0),
        visiting_card_front: card.visiting_card_front ? getImageUrl(req, `uploads/visiting_cards/${card.visiting_card_front}`) : "",
        visiting_card_back: card.visiting_card_back ? getImageUrl(req, `uploads/visiting_cards/${card.visiting_card_back}`) : "",
        status: String(card.status || 0),
        created_dts: card.created_dts || ""
      }));

      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        contact_card_info: formattedContactCardInfo
      });
      
    } catch (error) {
      console.error('getContactVisitingCardInformation error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get contact visiting card information'
      });
    }
  }

  // Admin function - View folders
  static async viewFolders(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewFolders - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all folders ordered by name (matching PHP exactly)
      const folders = await query('SELECT * FROM folders WHERE deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        folders_list: folders,
        message: 'Folders list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewFolders error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve folders list view data'
      });
    }
  }

  // Admin function - Submit folders
  static async submitFolders(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitFolders - Parameters:', { user_id, token, row_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new folder (matching PHP exactly)
        const insertData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO folders (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing folder (matching PHP exactly)
        const updateData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE folders SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitFolders error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit folder'
      });
    }
  }

  // Admin function - List folders ajax
  static async listFoldersAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listFoldersAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get DataTables parameters (matching PHP exactly)
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM folders WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE name LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM folders
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          id,
          name,
          status
        FROM folders
        ${searchQuery}
        ORDER BY id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const folders = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of folders) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, row.id.toString(), action]);
      }

      // Return DataTables response (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listFoldersAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve folders data'
      });
    }
  }

  // Admin function - Delete folders
  static async deleteFolders(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteFolders - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if folder ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Folder ID is required'
        });
      }

      // Check if folder is used in user_service_provider_services (matching PHP exactly)
      const serviceProviderDetails = await query('SELECT * FROM user_service_provider_services WHERE service_id = ?', [keys]);
      
      if (serviceProviderDetails.length > 0) {
        return res.json({
          status: 'Error',
          info: 'Unable to Delete. Due to Folder Active in Service Provider'
        });
      }

      // Soft delete the folder (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE folders SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Folder Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteFolders error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete folder'
      });
    }
  }

  // API function - Delete sub folder
  static async deleteSubFolder(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('deleteSubFolder - Parameters:', { user_id, token, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_sub_folder_id || user_sub_folder_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Delete sub folder (soft delete - set status to 0)
      const result = await query(
        'UPDATE user_sub_folders SET status = 0 WHERE user_sub_folder_id = ? AND user_id = ?',
        [user_sub_folder_id, decodedUserId]
      );

      if (result.affectedRows === 0) {
        return fail(res, 500, 'Sub folder not found or access denied');
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Sub Folder deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteSubFolder error:', error);
      return fail(res, 500, 'Failed to delete sub folder');
    }
  }

  // Check duplicate folders - PHP compatible version
  static async checkDuplicateFolders(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateFolders - Parameters:', { user_id, token, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      // Check if name is provided
      if (!name || name.trim() === '') {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
        });
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check for duplicate name (matching PHP exactly)
      let duplicateCheckQuery = 'SELECT COUNT(*) as count FROM folders WHERE name = ? AND deleted = 0';
      let duplicateCheckParams = [name.trim()];
      
      if (id && id > 0) {
        duplicateCheckQuery += ' AND id != ?';
        duplicateCheckParams.push(id);
      }
      
      const duplicateResult = await query(duplicateCheckQuery, duplicateCheckParams);
      const isDuplicate = duplicateResult[0].count > 0;

      // Return response matching PHP exactly
      return res.json({
        validate: isDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateFolders error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate folders'
      });
    }
  }
}

module.exports = FolderController;
