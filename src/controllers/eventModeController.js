const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class EventModeController {
  
  // API function - Get event mode list for users
  static async getEventModeList(req, res) {
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
      
      const rows = await query('SELECT id AS event_mode_id, name AS event_mode FROM event_mode');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        event_mode_list: rows.map(row => ({
          event_mode_id: row.event_mode_id.toString(),
          event_mode: row.event_mode || ""
        }))
      });
    } catch (error) {
      console.error('getEventModeList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get event mode list'
      });
    }
  }

  // Admin function - View event mode
  static async adminViewEventMode(req, res) {
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

      console.log('adminViewEventMode - Parameters:', { user_id, token });

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

      // Get all event modes ordered by name (matching PHP exactly)
      const eventModes = await query('SELECT * FROM event_mode WHERE deleted = 0 ORDER BY name ASC');

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        event_mode_list: eventModes || [],
        message: 'Event mode list view data retrieved successfully'
      });
    } catch (error) {
      console.error('adminViewEventMode error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve event mode list view data'
      });
    }
  }

  // Admin function - Submit event mode
  static async adminSubmitEventMode(req, res) {
    try {
      const { user_id, token, row_id, name, status } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminSubmitEventMode - Parameters:', { user_id, token, row_id, name, status });

      // Verify admin user
      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      const adminUserData = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [user_id]);
      if (!adminUserData.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid admin user'
        });
      }

      if (!name || name.trim() === '') {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Event mode name is required'
        });
      }

      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (row_id && row_id !== '') {
        // Update existing event mode (matching PHP exactly)
        await query(
          'UPDATE event_mode SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [name.trim(), status || 1, currentTime, user_id, row_id]
        );
      } else {
        // Insert new event mode (matching PHP exactly)
        await query(
          'INSERT INTO event_mode (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [name.trim(), status || 1, currentTime, user_id]
        );
      }

      return res.json({
        status: true,
        rcode: 200,
        message: 'Event mode saved successfully'
      });
    } catch (error) {
      console.error('adminSubmitEventMode error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        info: 'Failed to submit event mode'
      });
    }
  }

  // Admin function - List event mode ajax
  static async adminListEventModeAjax(req, res) {
    try {
      const { user_id, token, start, length, search, order, columns } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminListEventModeAjax - Parameters:', { user_id, token, start, length, search, order, columns });

      // Verify admin user
      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      const adminUserData = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [user_id]);
      if (!adminUserData.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid admin user'
        });
      }

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM event_mode WHERE deleted = 0');
      const totalCount = totalCountResult[0].count;

      // Build search condition
      let searchCondition = 'deleted = 0';
      let searchParams = [];

      if (search && search.value && search.value.trim() !== '') {
        searchCondition += ' AND name LIKE ?';
        searchParams.push(`%${search.value.trim()}%`);
      }

      // Build order clause
      let orderClause = 'ORDER BY name ASC';
      if (order && order.length > 0 && columns) {
        const orderColumn = columns[order[0].column];
        const orderDir = order[0].dir.toUpperCase();
        orderClause = `ORDER BY ${orderColumn.data} ${orderDir}`;
      }

      // Build data query
      const dataQuery = `
        SELECT id, name, status, created_at, created_by, updated_at, updated_by
        FROM event_mode
        WHERE ${searchCondition}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;
      const dataParams = [...searchParams, parseInt(length), parseInt(start)];

      const eventModes = await query(dataQuery, dataParams);

      // Format response data
      const formattedData = [];
      for (const row of eventModes) {
        formattedData.push({
          id: row.id,
          name: row.name || '',
          status: row.status || 0,
          created_at: row.created_at || '',
          created_by: row.created_by || '',
          updated_at: row.updated_at || '',
          updated_by: row.updated_by || ''
        });
      }

      return res.json({
        draw: parseInt(req.body.draw) || 1,
        recordsTotal: totalCount,
        recordsFiltered: totalCount,
        data: formattedData
      });
    } catch (error) {
      console.error('adminListEventModeAjax error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve event mode list'
      });
    }
  }

  // Admin function - Check duplicate event mode
  static async adminCheckDuplicateEventMode(req, res) {
    try {
      const { user_id, token, name, id } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminCheckDuplicateEventMode - Parameters:', { user_id, token, name, id });

      // Verify admin user
      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      const adminUserData = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [user_id]);
      if (!adminUserData.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid admin user'
        });
      }

      if (!name || name.trim() === '') {
        return res.json({
          status: true,
          rcode: 200,
          is_duplicate: false,
          message: 'Event mode name is required'
        });
      }

      let condition = 'name = ? AND deleted = 0';
      let params = [name.trim()];

      if (id && id !== '') {
        // Editing existing event mode - exclude current record
        condition += ' AND id != ?';
        params.push(id);
      } else {
        // Adding new event mode
        // No additional condition needed
      }

      // Check for duplicate event mode name
      const duplicateResult = await query(
        `SELECT COUNT(*) as count FROM event_mode WHERE ${condition}`,
        params
      );

      const isDuplicate = duplicateResult[0].count > 0;

      return res.json({
        status: true,
        rcode: 200,
        is_duplicate: isDuplicate,
        message: isDuplicate ? 'Event mode name already exists' : 'Event mode name is available'
      });
    } catch (error) {
      console.error('adminCheckDuplicateEventMode error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate event mode'
      });
    }
  }

  // Admin function - Delete event mode
  static async adminDeleteEventMode(req, res) {
    try {
      const { user_id, token, keys } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminDeleteEventMode - Parameters:', { user_id, token, keys });

      // Verify admin user
      const adminUser = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
      if (!adminUser.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid user'
        });
      }

      const adminUserData = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [user_id]);
      if (!adminUserData.length) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Invalid admin user'
        });
      }

      // Check if keys (event mode ID) is provided
      if (!keys || keys === '') {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Event mode ID is required'
        });
      }

      // Check if event mode is used in user_event_details (matching PHP exactly)
      const events = await query('SELECT * FROM user_event_details WHERE event_mode_id = ? AND deleted = 0', [keys]);
      if (events.length > 0) {
        return res.json({
          status: false,
          rcode: 400,
          info: 'Unable to Delete. Due to Event Mode Active in Events'
        });
      }

      // Soft delete the event mode (matching PHP exactly)
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await query(
        'UPDATE event_mode SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [1, currentTime, user_id, keys]
      );

      return res.json({
        status: true,
        rcode: 200,
        info: 'Event Mode Deleted Successfully'
      });
    } catch (error) {
      console.error('adminDeleteEventMode error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        info: 'Failed to delete event mode'
      });
    }
  }
}

module.exports = EventModeController;
