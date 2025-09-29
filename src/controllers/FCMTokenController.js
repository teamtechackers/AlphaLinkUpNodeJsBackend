const { query } = require('../config/db');
const { idDecode } = require('../utils/idCodec');

class FCMTokenController {

  static async updateFCMToken(req, res) {
    try {
      const { user_id, token, fcm_token } = {
        ...req.query,
        ...req.body
      };

      console.log('updateFCMToken - Parameters:', { user_id, token, fcm_token });

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      if (!fcm_token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'fcm_token is required'
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

      const userRows = await query(
        'SELECT user_id FROM users WHERE user_id = ? AND token = ? LIMIT 1',
        [decodedUserId, token]
      );

      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user or token'
        });
      }

      await query(
        'UPDATE users SET fcm_token = ?, updated_at = NOW() WHERE user_id = ?',
        [fcm_token, decodedUserId]
      );

      console.log('FCM token updated for user:', decodedUserId);

      return res.json({
        status: true,
        rcode: 200,
        message: 'FCM token updated successfully',
        data: {
          user_id: user_id,
          fcm_token: fcm_token
        }
      });

    } catch (error) {
      console.error('updateFCMToken error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to update FCM token'
      });
    }
  }

 
  static async getFCMToken(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('getFCMToken - Parameters:', { user_id, token });

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

      const userRows = await query(
        'SELECT fcm_token FROM users WHERE user_id = ? AND token = ? LIMIT 1',
        [decodedUserId, token]
      );

      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user or token'
        });
      }

      return res.json({
        status: true,
        rcode: 200,
        message: 'FCM token retrieved successfully',
        data: {
          user_id: user_id,
          fcm_token: userRows[0].fcm_token
        }
      });

    } catch (error) {
      console.error('getFCMToken error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get FCM token'
      });
    }
  }
}

module.exports = FCMTokenController;
