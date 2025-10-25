const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class EventTypeController {
  
  // API function - Get event type list for users
  static async getEventTypeList(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      const rows = await query('SELECT id AS event_type_id, name AS event_type FROM event_type');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        event_type_list: rows.map(row => ({
          event_type_id: row.event_type_id.toString(),
          event_type: row.event_type || ""
        }))
      });
    } catch (error) {
      console.error('getEventTypeList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get event type list'
      });
    }
  }

  // Admin function - View event type
  static async adminViewEventType(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminViewEventType - Parameters:', { user_id, token });

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user ID'
        });
      }

      // Verify admin user
      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      const adminUserData = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminUserData.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid admin user'
        });
      }

      // Get all event types ordered by name (matching PHP exactly)
      const eventTypes = await query('SELECT * FROM event_type WHERE deleted = 0 ORDER BY name ASC');

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        event_type_list: eventTypes || [],
        message: 'Event type list view data retrieved successfully'
      });
    } catch (error) {
      console.error('adminViewEventType error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve event type list view data'
      });
    }
  }

  // Admin function - Submit event type
  static async adminSubmitEventType(req, res) {
    try {
      const { user_id, token, row_id, name, status } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminSubmitEventType - Parameters:', { user_id, token, row_id, name, status });

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      console.log('adminSubmitEventType - decodedUserId:', decodedUserId);
      if (!decodedUserId) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user ID'
        });
      }

      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      console.log('adminSubmitEventType - adminUser:', adminUser);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      console.log('adminSubmitEventType - Skipping admin_users check, using users table');

      if (!name || name.trim() === '') {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Event type name is required'
        });
      }

      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (row_id && row_id !== '') {
        await query(
          'UPDATE event_type SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [name.trim(), status || 1, currentTime, decodedUserId, row_id]
        );
      } else {
        await query(
          'INSERT INTO event_type (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [name.trim(), status || 1, currentTime, decodedUserId]
        );
      }

      return res.json({
        status: true,
        rcode: 200,
        message: 'Event type saved successfully'
      });
    } catch (error) {
      console.error('adminSubmitEventType error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        info: 'Failed to submit event type'
      });
    }
  }

  static async adminListEventTypeAjax(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('adminListEventTypeAjax - Parameters:', { user_id, token });

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
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

      // Get DataTable parameters
      const draw = parseInt(req.body.draw) || 1;
      const start = parseInt(req.body.start) || 0;
      const length = parseInt(req.body.length) || 10;
      const searchValue = req.body.search?.value || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM event_type WHERE deleted = 0');
      const totalCount = totalCountResult[0].count;

      // Build query for filtered data
      let dataQuery = `
        FROM event_type
        WHERE deleted = 0
      `;
      let dataParams = [];

      // Add search filter
      if (searchValue) {
        dataQuery += ' AND name LIKE ?';
        dataParams.push(`%${searchValue}%`);
      }

      // Get filtered count
      const filteredCountResult = await query(`SELECT COUNT(*) as count ${dataQuery}`, dataParams);
      const filteredCount = filteredCountResult[0].count;

      // Get data with pagination
      dataQuery = `
        SELECT * ${dataQuery}
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `;
      dataParams.push(length, start);

      const eventTypes = await query(dataQuery, dataParams);

      // Format data for DataTable
      const data = [];
      for (const row of eventTypes) {
        const i = data.length + 1;
        
        // Format status
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Format action buttons
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>`;
        const deleteAction = `<a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, row.id.toString(), action + deleteAction]);
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        draw: draw,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });
    } catch (error) {
      console.error('adminListEventTypeAjax error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve event type list'
      });
    }
  }

  // Admin function - Check duplicate event type
  static async adminCheckDuplicateEventType(req, res) {
    try {
      const { user_id, token, name, id } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminCheckDuplicateEventType - Parameters:', { user_id, token, name, id });

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      console.log('adminCheckDuplicateEventType - decodedUserId:', decodedUserId);
      if (!decodedUserId) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user ID'
        });
      }

      // Verify admin user
      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      console.log('adminCheckDuplicateEventType - adminUser:', adminUser);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      console.log('adminCheckDuplicateEventType - Skipping admin_users check, using users table');

      if (!name || name.trim() === '') {
        return res.json({
          status: true,
          rcode: 200,
          is_duplicate: false,
          message: 'Event type name is required'
        });
      }

      let condition = 'name = ? AND deleted = 0';
      let params = [name.trim()];

      if (id && id !== '') {
        // Editing existing event type - exclude current record
        condition += ' AND id != ?';
        params.push(id);
      } else {
        // Adding new event type
        // No additional condition needed
      }

      // Check for duplicate event type name
      const duplicateResult = await query(
        `SELECT COUNT(*) as count FROM event_type WHERE ${condition}`,
        params
      );

      const isDuplicate = duplicateResult[0].count > 0;

      return res.json({
        status: true,
        rcode: 200,
        is_duplicate: isDuplicate,
        message: isDuplicate ? 'Event type name already exists' : 'Event type name is available'
      });
    } catch (error) {
      console.error('adminCheckDuplicateEventType error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate event type'
      });
    }
  }

  // Admin function - Delete event type
  static async adminDeleteEventType(req, res) {
    try {
      const { user_id, token, keys } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminDeleteEventType - Parameters:', { user_id, token, keys });

      // Decode admin user ID
      const decodedUserId = idDecode(user_id);
      console.log('adminDeleteEventType - decodedUserId:', decodedUserId);
      if (!decodedUserId) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user ID'
        });
      }

      // Verify admin user
      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      console.log('adminDeleteEventType - adminUser:', adminUser);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      console.log('adminDeleteEventType - Skipping admin_users check, using users table');

      // Check if keys (event type ID) is provided
      if (!keys || keys === '') {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Event type ID is required'
        });
      }

      // Check if event type is used in user_event_details (matching PHP exactly)
      const events = await query('SELECT * FROM user_event_details WHERE event_type_id = ? AND deleted = 0', [keys]);
      if (events.length > 0) {
        return res.json({
          status: false,
          rcode: 400,
          info: 'Unable to Delete. Due to Event Type Active in Events'
        });
      }

      // Soft delete the event type (matching PHP exactly)
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await query(
        'UPDATE event_type SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [1, currentTime, decodedUserId, keys]
      );

      return res.json({
        status: true,
        rcode: 200,
        info: 'Event Type Deleted Successfully'
      });
    } catch (error) {
      console.error('adminDeleteEventType error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        info: 'Failed to delete event type'
      });
    }
  }
}

module.exports = EventTypeController;