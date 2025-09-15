const { Server } = require('socket.io');
const { logger } = require('../utils/logger');
const { query } = require('../config/db');
const { idDecode } = require('../utils/idCodec');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); 
    this.userSockets = new Map();
    this.activeChatSessions = new Map(); // Track active chat sessions
    this.userLastActivity = new Map(); // Track user activity timestamps
  }

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // Allow all origins for now, configure properly in production
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('🔌 WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 New WebSocket connection: ${socket.id}`);

      // Handle user authentication and join
      socket.on('join', async (data) => {
        try {
          const { user_id, token } = data;
          
          if (!user_id || !token) {
            socket.emit('error', { message: 'user_id and token are required' });
            return;
          }

          // Validate user and token
          console.log('🔌 WebSocket join - user_id:', user_id, 'token:', token);
          
          const decodedUserId = idDecode(user_id);
          console.log('🔌 WebSocket join - decodedUserId:', decodedUserId);
          
          if (!decodedUserId) {
            console.log('❌ WebSocket join - Invalid user ID');
            socket.emit('error', { message: 'Invalid user ID' });
            return;
          }

          const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
          console.log('🔌 WebSocket join - userRows:', userRows.length);
          
          if (!userRows.length) {
            console.log('❌ WebSocket join - Not A Valid User');
            socket.emit('error', { message: 'Not A Valid User' });
            return;
          }

          const user = userRows[0];
          if (user.unique_token !== token) {
            socket.emit('error', { message: 'Token Mismatch Exception' });
            return;
          }

          // Store user connection
          this.connectedUsers.set(decodedUserId, socket.id);
          this.userSockets.set(socket.id, decodedUserId);
          this.userLastActivity.set(decodedUserId, Date.now());
          
          // Join user to their personal room
          socket.join(`user_${decodedUserId}`);
          
          socket.emit('joined', { 
            message: 'Successfully joined chat',
            user_id: user_id,
            socket_id: socket.id
          });

          logger.info(`👤 User ${decodedUserId} joined chat with socket ${socket.id}`);
        } catch (error) {
          logger.error('Error in join event:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      // Handle joining a specific chat session
      socket.on('join_chat', (data) => {
        try {
          const { user_id, chat_with_user_id } = data;
          const decodedUserId = idDecode(user_id);
          
          if (!decodedUserId || !chat_with_user_id) {
            socket.emit('error', { message: 'user_id and chat_with_user_id are required' });
            return;
          }

          // Create or update active chat session
          const sessionKey = this.getChatSessionKey(decodedUserId, chat_with_user_id);
          this.activeChatSessions.set(sessionKey, {
            user1: decodedUserId,
            user2: chat_with_user_id,
            lastActivity: Date.now(),
            isActive: true
          });

          // Update user's last activity
          this.userLastActivity.set(decodedUserId, Date.now());

          socket.emit('chat_joined', {
            message: 'Successfully joined chat session',
            chat_with_user_id: chat_with_user_id,
            session_key: sessionKey
          });

          logger.info(`💬 User ${decodedUserId} joined chat with user ${chat_with_user_id}`);
        } catch (error) {
          logger.error('Error in join_chat event:', error);
          socket.emit('error', { message: 'Failed to join chat session' });
        }
      });

      // Handle leaving a specific chat session
      socket.on('leave_chat', (data) => {
        try {
          const { user_id, chat_with_user_id } = data;
          const decodedUserId = idDecode(user_id);
          
          if (!decodedUserId || !chat_with_user_id) {
            socket.emit('error', { message: 'user_id and chat_with_user_id are required' });
            return;
          }

          // Remove active chat session
          const sessionKey = this.getChatSessionKey(decodedUserId, chat_with_user_id);
          this.activeChatSessions.delete(sessionKey);

          socket.emit('chat_left', {
            message: 'Successfully left chat session',
            chat_with_user_id: chat_with_user_id
          });

          logger.info(`💬 User ${decodedUserId} left chat with user ${chat_with_user_id}`);
        } catch (error) {
          logger.error('Error in leave_chat event:', error);
          socket.emit('error', { message: 'Failed to leave chat session' });
        }
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          const { sender_id, receiver_id, message } = data;
          
          if (!sender_id || !receiver_id || !message) {
            socket.emit('error', { message: 'sender_id, receiver_id, and message are required' });
            return;
          }

          // Save message to database
          const chatResult = await query(
            'INSERT INTO user_chats (sender_id, receiver_id, message, created_dts) VALUES (?, ?, ?, NOW())',
            [sender_id, receiver_id, message]
          );

          if (chatResult.insertId > 0) {
            // Get sender details
            const senderRows = await query('SELECT full_name, profile_photo FROM users WHERE user_id = ?', [sender_id]);
            const sender = senderRows[0] || {};

            // Prepare message data
            const messageData = {
              chat_id: chatResult.insertId,
              sender_id: sender_id,
              receiver_id: receiver_id,
              message: message,
              sender_name: sender.full_name || '',
              sender_image: sender.profile_photo ? `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/profiles/${sender.profile_photo}` : '',
              created_dts: new Date().toISOString(),
              timestamp: Date.now()
            };

            // Check if receiver is in active chat session with sender
            const isInActiveChat = this.isInActiveChatSession(receiver_id, sender_id);
            
            // Send to receiver if online
            const receiverSocketId = this.connectedUsers.get(receiver_id);
            if (receiverSocketId) {
              if (isInActiveChat) {
                // Both users are in active chat - send message without notification
                this.io.to(receiverSocketId).emit('new_message', {
                  ...messageData,
                  show_notification: false,
                  is_active_chat: true
                });
                logger.info(`💬 Message sent from ${sender_id} to ${receiver_id} (active chat - no notification)`);
              } else {
                // Receiver not in active chat - send with notification
                this.io.to(receiverSocketId).emit('new_message', {
                  ...messageData,
                  show_notification: true,
                  is_active_chat: false
                });
                logger.info(`💬 Message sent from ${sender_id} to ${receiver_id} (with notification)`);
              }
            } else {
              // Receiver offline - send FCM notification
              this.sendFCMNotification(receiver_id, sender.full_name || 'Someone', message);
              logger.info(`📱 FCM notification sent to offline user ${receiver_id}`);
            }

            // Send confirmation to sender
            socket.emit('message_sent', {
              status: true,
              message: 'Message sent successfully',
              chat_id: chatResult.insertId,
              is_active_chat: isInActiveChat
            });

            logger.info(`💬 Message sent from ${sender_id} to ${receiver_id}`);
          } else {
            socket.emit('error', { message: 'Failed to save message' });
          }
        } catch (error) {
          logger.error('Error in send_message event:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data) => {
        const { receiver_id, is_typing } = data;
        const receiverSocketId = this.connectedUsers.get(receiver_id);
        
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('user_typing', {
            sender_id: this.userSockets.get(socket.id),
            is_typing: is_typing
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const userId = this.userSockets.get(socket.id);
        if (userId) {
          // Send disconnect notification to all users who have active chat sessions with this user
          this.notifyDisconnection(userId);
          
          // Clean up user data
          this.connectedUsers.delete(userId);
          this.userSockets.delete(socket.id);
          this.userLastActivity.delete(userId);
          
          // Remove all active chat sessions for this user
          this.removeUserChatSessions(userId);
          
          logger.info(`👤 User ${userId} disconnected from chat`);
        }
        logger.info(`🔌 WebSocket disconnected: ${socket.id}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error:', error);
      });
    });
  }

  // Method to check if user is connected via WebSocket
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // Method to send message to specific user
  sendMessageToUser(userId, messageData) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('new_message', messageData);
      return true;
    }
    return false;
  }

  // Method to broadcast message to all connected users
  broadcastMessage(messageData) {
    this.io.emit('broadcast_message', messageData);
  }

  // Method to broadcast dashboard updates to all connected users
  broadcastDashboardUpdate(updateType, data) {
    const updateData = {
      type: 'dashboard_update',
      update_type: updateType, // 'new_job', 'new_event', 'job_updated', 'event_updated', etc.
      data: data,
      timestamp: Date.now()
    };
    
    this.io.emit('dashboard_update', updateData);
    logger.info(`📊 Dashboard update broadcasted: ${updateType}`);
  }

  // Method to send dashboard update to specific user
  sendDashboardUpdateToUser(userId, updateType, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const updateData = {
        type: 'dashboard_update',
        update_type: updateType,
        data: data,
        timestamp: Date.now()
      };
      
      this.io.to(socketId).emit('dashboard_update', updateData);
      logger.info(`📊 Dashboard update sent to user ${userId}: ${updateType}`);
      return true;
    }
    return false;
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get all connected users
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Get connected users info for debugging
  getConnectedUsersInfo() {
    return {
      totalConnected: this.connectedUsers.size,
      connectedUsers: Array.from(this.connectedUsers.entries()),
      userSockets: Array.from(this.userSockets.entries()),
      socketCount: this.io.sockets.sockets.size,
      activeChatSessions: Array.from(this.activeChatSessions.entries())
    };
  }

  // Helper method to generate chat session key
  getChatSessionKey(user1, user2) {
    return [user1, user2].sort().join('_');
  }

  // Check if two users are in active chat session
  isInActiveChatSession(user1, user2) {
    const sessionKey = this.getChatSessionKey(user1, user2);
    const session = this.activeChatSessions.get(sessionKey);
    
    if (!session) return false;
    
    // Check if session is still active (within last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return session.isActive && session.lastActivity > fiveMinutesAgo;
  }

  // Notify all users about disconnection
  notifyDisconnection(disconnectedUserId) {
    const disconnectedUserName = this.getUserName(disconnectedUserId);
    
    // Notify all connected users about the disconnection
    this.connectedUsers.forEach((socketId, userId) => {
      if (userId !== disconnectedUserId) {
        this.io.to(socketId).emit('user_disconnected', {
          user_id: disconnectedUserId,
          user_name: disconnectedUserName,
          timestamp: Date.now(),
          message: `${disconnectedUserName} has disconnected`
        });
      }
    });
  }

  // Remove all chat sessions for a specific user
  removeUserChatSessions(userId) {
    const sessionsToRemove = [];
    
    this.activeChatSessions.forEach((session, key) => {
      if (session.user1 === userId || session.user2 === userId) {
        sessionsToRemove.push(key);
      }
    });
    
    sessionsToRemove.forEach(key => {
      this.activeChatSessions.delete(key);
    });
  }

  // Get user name by ID (you might want to cache this)
  getUserName(userId) {
    // This is a simple implementation - you might want to cache user names
    return `User_${userId}`;
  }

  // Send FCM notification
  async sendFCMNotification(userId, senderName, message) {
    try {
      const NotificationService = require('../notification/NotificationService');
      
      // Get receiver's FCM token
      const receiverRows = await query('SELECT fcm_token FROM users WHERE user_id = ? LIMIT 1', [userId]);
      
      if (receiverRows.length > 0 && receiverRows[0].fcm_token) {
        const notificationData = {
          title: `New message from ${senderName}`,
          body: message,
          data: {
            type: 'chat_message',
            sender_id: userId,
            message: message
          }
        };
        
        await NotificationService.sendNotification(userId, notificationData.title, notificationData.body, notificationData.data);
        logger.info(`📱 FCM notification sent to user ${userId}`);
      } else {
        logger.warn(`❌ No FCM token found for user ${userId}`);
      }
    } catch (error) {
      logger.error('Error sending FCM notification:', error);
    }
  }

  // Get active chat sessions for a user
  getUserActiveChatSessions(userId) {
    const userSessions = [];
    
    this.activeChatSessions.forEach((session, key) => {
      if (session.user1 === userId || session.user2 === userId) {
        userSessions.push({
          sessionKey: key,
          otherUser: session.user1 === userId ? session.user2 : session.user1,
          lastActivity: session.lastActivity,
          isActive: session.isActive
        });
      }
    });
    
    return userSessions;
  }

  // Update chat session activity
  updateChatSessionActivity(user1, user2) {
    const sessionKey = this.getChatSessionKey(user1, user2);
    const session = this.activeChatSessions.get(sessionKey);
    
    if (session) {
      session.lastActivity = Date.now();
      session.isActive = true;
      this.activeChatSessions.set(sessionKey, session);
    }
  }
}

module.exports = new WebSocketService();