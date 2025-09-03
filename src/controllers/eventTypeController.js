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
          message: 'Event type name is required'
        });
      }

      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (row_id && row_id !== '') {
        // Update existing event type (matching PHP exactly)
        await query(
          'UPDATE event_type SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [name.trim(), status || 1, currentTime, user_id, row_id]
        );
      } else {
        // Insert new event type (matching PHP exactly)
        await query(
          'INSERT INTO event_type (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [name.trim(), status || 1, currentTime, user_id]
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

  // Admin function - List event type ajax
  static async adminListEventTypeAjax(req, res) {
    try {
      const { user_id, token, start, length, search, order, columns } = req.body;
      
      if (!user_id || !token) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'User ID and token are required'
        });
      }

      console.log('adminListEventTypeAjax - Parameters:', { user_id, token, start, length, search, order, columns });

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
      const totalCountResult = await query('SELECT COUNT(*) as count FROM event_type WHERE deleted = 0');
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
        FROM event_type
        WHERE ${searchCondition}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;
      const dataParams = [...searchParams, parseInt(length), parseInt(start)];

      const eventTypes = await query(dataQuery, dataParams);

      // Format response data
      const formattedData = [];
      for (const row of eventTypes) {
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
        [1, currentTime, user_id, keys]
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
