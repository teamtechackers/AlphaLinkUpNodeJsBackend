const { Server } = require('socket.io');
const { logger } = require('../utils/logger');
const { query } = require('../config/db');
const { idDecode } = require('../utils/idCodec');
const NotificationController = require('../controllers/NotificationController');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); 
    this.userSockets = new Map();
    this.activeChatSessions = new Map(); 
    this.userLastActivity = new Map();
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
        origin: "*", 
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


      socket.on('join', async (data) => {
        try {
          const { user_id, token } = data;
          
          if (!user_id || !token) {
            console.log('❌ WebSocket join - Missing user_id or token');
            socket.emit('error', { message: 'user_id and token are required' });
            return;
          }

        
          console.log('🔌 WebSocket join - user_id:', user_id, 'token:', token);
          
         
          let decodedUserId;
          if (user_id.match(/^\d+$/)) {
    
            decodedUserId = user_id;
            console.log('🔌 WebSocket join - User ID already decoded:', decodedUserId);
          } else {
            
            decodedUserId = idDecode(user_id);
            console.log('🔌 WebSocket join - decodedUserId:', decodedUserId);
          }
          
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
            console.log('❌ WebSocket join - Token Mismatch');
            socket.emit('error', { message: 'Token Mismatch Exception' });
            return;
          }

        
          this.connectedUsers.set(String(decodedUserId), socket.id);
          this.userSockets.set(socket.id, String(decodedUserId));
          this.userLastActivity.set(String(decodedUserId), Date.now());
          
          
          socket.join(`user_${decodedUserId}`);
          
          console.log('✅ WebSocket join - User registered successfully');
          console.log('🔌 Connected users after join:', Array.from(this.connectedUsers.entries()));
          
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

      socket.on('join_chat', (data) => {
        try {
          const { user1, user2 } = data;
          
          if (!user1 || !user2) {
            socket.emit('error', { message: 'user1 and user2 are required' });
            return;
          }

          const normalizedUser1 = String(user1);
          const normalizedUser2 = String(user2);

          const sessionKey = this.getChatSessionKey(normalizedUser1, normalizedUser2);
          this.activeChatSessions.set(sessionKey, {
            user1: normalizedUser1,
            user2: normalizedUser2,
            lastActivity: Date.now(),
            isActive: true
          });

          this.userLastActivity.set(normalizedUser1, Date.now());
          this.userLastActivity.set(normalizedUser2, Date.now());

          socket.emit('chat_joined', {
            message: 'Successfully joined chat session',
            user1: normalizedUser1,
            user2: normalizedUser2,
            session_key: sessionKey
          });

          logger.info(`💬 User ${normalizedUser1} joined chat with user ${normalizedUser2}`);
          console.log(`💬 Active chat sessions:`, Array.from(this.activeChatSessions.entries()));
        } catch (error) {
          logger.error('Error in join_chat event:', error);
          socket.emit('error', { message: 'Failed to join chat session' });
        }
      });

      socket.on('leave_chat', (data) => {
        try {
          const { user1, user2 } = data;
          
          if (!user1 || !user2) {
            socket.emit('error', { message: 'user1 and user2 are required' });
            return;
          }

          const normalizedUser1 = String(user1);
          const normalizedUser2 = String(user2);

          const sessionKey = this.getChatSessionKey(normalizedUser1, normalizedUser2);
          this.activeChatSessions.delete(sessionKey);

          socket.emit('chat_left', {
            message: 'Successfully left chat session',
            user1: normalizedUser1,
            user2: normalizedUser2
          });

          logger.info(`💬 User ${normalizedUser1} left chat with user ${normalizedUser2}`);
          console.log(`💬 Active chat sessions:`, Array.from(this.activeChatSessions.entries()));
        } catch (error) {
          logger.error('Error in leave_chat event:', error);
          socket.emit('error', { message: 'Failed to leave chat session' });
        }
      });

      socket.on('send_message', async (data) => {
        try {
          const { sender_id, receiver_id, message } = data;
          
          if (!sender_id || !receiver_id || !message) {
            socket.emit('error', { message: 'sender_id, receiver_id, and message are required' });
            return;
          }

          const normalizedSenderId = String(sender_id);
          const normalizedReceiverId = String(receiver_id);

          const chatResult = await query(
            'INSERT INTO user_chats (sender_id, receiver_id, message, created_dts) VALUES (?, ?, ?, NOW())',
            [normalizedSenderId, normalizedReceiverId, message]
          );

          if (chatResult.insertId > 0) {
            const senderRows = await query('SELECT full_name, profile_photo FROM users WHERE user_id = ?', [normalizedSenderId]);
            const sender = senderRows[0] || {};

            const messageData = {
              chat_id: chatResult.insertId,
              sender_id: normalizedSenderId,
              receiver_id: normalizedReceiverId,
              message: message,
              sender_name: sender.full_name || '',
              sender_image: sender.profile_photo ? `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/profiles/${sender.profile_photo}` : '',
              created_dts: new Date().toISOString(),
              timestamp: Date.now()
            };

            const isInActiveChat = this.isInActiveChatSession(normalizedReceiverId, normalizedSenderId);
            
            const receiverActiveChats = this.getUserActiveChatSessions(normalizedReceiverId);
            const isReceiverInAnyActiveChat = receiverActiveChats.length > 0;
            
            const isReceiverInOtherChat = receiverActiveChats.some(chat => 
              chat.otherUser !== normalizedSenderId
            );
            
            console.log(`💬 Receiver ${normalizedReceiverId} active chat sessions:`, receiverActiveChats);
            console.log(`💬 Receiver ${normalizedReceiverId} in any active chat: ${isReceiverInAnyActiveChat}`);
            console.log(`💬 Receiver ${normalizedReceiverId} in other chat (not with sender ${normalizedSenderId}): ${isReceiverInOtherChat}`);
            
            const receiverSocketId = this.connectedUsers.get(normalizedReceiverId);
            if (receiverSocketId) {
              if (isInActiveChat) {
                this.io.to(receiverSocketId).emit('new_message', {
                  ...messageData,
                  show_notification: false,
                  is_active_chat: true
                });
                logger.info(`💬 Message sent from ${normalizedSenderId} to ${normalizedReceiverId} (active chat - no notification)`);
              } else if (isReceiverInOtherChat) {
                this.io.to(receiverSocketId).emit('new_message', {
                  ...messageData,
                  show_notification: true,
                  is_active_chat: false,
                  notification_reason: 'receiver_in_other_chat'
                });
                logger.info(`💬 Message sent from ${normalizedSenderId} to ${normalizedReceiverId} (receiver in other chat - with notification)`);
              } else {
                this.io.to(receiverSocketId).emit('new_message', {
                  ...messageData,
                  show_notification: true,
                  is_active_chat: false
                });
                logger.info(`💬 Message sent from ${normalizedSenderId} to ${normalizedReceiverId} (with notification)`);
              }
            } else {
              this.sendFCMNotification(normalizedReceiverId, sender.full_name || 'Someone', message);
              logger.info(`📱 FCM notification sent to offline user ${normalizedReceiverId}`);
            }
            
          
            const shouldSendFCM = !receiverSocketId || (!isInActiveChat && isReceiverInOtherChat) || (!isInActiveChat && !isReceiverInOtherChat);
            console.log(`📱 Should send FCM notification: ${shouldSendFCM} (receiver connected: ${!!receiverSocketId}, in active chat with sender: ${isInActiveChat}, in other chat: ${isReceiverInOtherChat})`);
            
            if (shouldSendFCM) {
              try {
                await this.sendFCMNotification(normalizedReceiverId, sender.full_name || 'Someone', message, chatResult.insertId, 'chat');
                console.log(`📱 FCM notification sent to receiver ${normalizedReceiverId} (${!receiverSocketId ? 'not connected via WebSocket' : 'in other chat'})`);
              } catch (fcmError) {
                console.log(`❌ FCM notification error:`, fcmError.message);
              }
            }

            socket.emit('message_sent', {
              status: true,
              message: 'Message sent successfully',
              chat_id: chatResult.insertId,
              is_active_chat: isInActiveChat
            });

            logger.info(`💬 Message sent from ${normalizedSenderId} to ${normalizedReceiverId}`);
          } else {
            socket.emit('error', { message: 'Failed to save message' });
          }
        } catch (error) {
          logger.error('Error in send_message event:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('typing', (data) => {
        const { receiver_id, is_typing } = data;
        const normalizedReceiverId = String(receiver_id);
        const receiverSocketId = this.connectedUsers.get(normalizedReceiverId);
        
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('user_typing', {
            sender_id: this.userSockets.get(socket.id),
            is_typing: is_typing
          });
        }
      });

      socket.on('disconnect', () => {
        const userId = this.userSockets.get(socket.id);
        if (userId) {
          this.notifyDisconnection(userId);
          
          this.connectedUsers.delete(userId);
          this.userSockets.delete(socket.id);
          this.userLastActivity.delete(userId);
          
          this.removeUserChatSessions(userId);
          
          logger.info(`👤 User ${userId} disconnected from chat`);
        }
        logger.info(`🔌 WebSocket disconnected: ${socket.id}`);
      });

      socket.on('error', (error) => {
        logger.error('Socket error:', error);
      });
    });
  }

  isUserConnected(userId) {
    const normalizedUserId = String(userId);
    return this.connectedUsers.has(normalizedUserId);
  }

  sendMessageToUser(userId, messageData) {
    console.log(`🔌 sendMessageToUser called with userId: ${userId} (type: ${typeof userId})`);
    console.log(`🔌 sendMessageToUser - connectedUsers map:`, Array.from(this.connectedUsers.entries()));
    console.log(`🔌 sendMessageToUser - userSockets map:`, Array.from(this.userSockets.entries()));
    
    const normalizedUserId = String(userId);
    const socketId = this.connectedUsers.get(normalizedUserId);
    
    console.log(`🔌 sendMessageToUser - looking for userId: "${normalizedUserId}" -> socketId: ${socketId}`);
    
    if (socketId) {
      console.log(`🔌 Emitting new_message to socket ${socketId} with data:`, messageData);
      try {
        this.io.to(socketId).emit('new_message', messageData);
        console.log(`✅ Message emitted successfully to user ${normalizedUserId} via socket ${socketId}`);
        return true;
      } catch (error) {
        console.log(`❌ Error emitting message to socket ${socketId}:`, error.message);
        return false;
      }
    }
    console.log(`❌ No socket found for user ${normalizedUserId}`);
    return false;
  }

  broadcastMessage(messageData) {
    this.io.emit('broadcast_message', messageData);
  }

  broadcastDashboardUpdate(updateType, data) {
    if (!this.io) {
      console.log('❌ WebSocket server not initialized, cannot broadcast dashboard update');
      return;
    }

    const updateData = {
      type: 'dashboard_update',
      update_type: updateType, 
      data: data,
      timestamp: Date.now()
    };
    
    this.io.emit('dashboard_update', updateData);
    logger.info(`📊 Dashboard update broadcasted: ${updateType}`);
    console.log(`📊 Dashboard update sent to all connected users: ${updateType}`);

    console.log(`📊 Sending individual dashboard updates to ${this.connectedUsers.size} connected users`);
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      try {
        this.io.to(socketId).emit('dashboard_update', updateData);
        console.log(`📊 Dashboard update sent to user ${userId} (socket: ${socketId})`);
      } catch (error) {
        console.log(`❌ Failed to send dashboard update to user ${userId}: ${error.message}`);
      }
    }
  }

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

  getChatSessionKey(user1, user2) {
    return [user1, user2].sort().join('_');
  }

  isInActiveChatSession(user1, user2) {
    const normalizedUser1 = String(user1);
    const normalizedUser2 = String(user2);
    
    const sessionKey1 = this.getChatSessionKey(normalizedUser1, normalizedUser2);
    const sessionKey2 = this.getChatSessionKey(normalizedUser2, normalizedUser1);
    
    const sessionKeys = [sessionKey1, sessionKey2];
    
    for (const sessionKey of sessionKeys) {
      const session = this.activeChatSessions.get(sessionKey);
      if (session) {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (session.isActive && session.lastActivity > fiveMinutesAgo) {
          console.log(`💬 Found active chat session: ${sessionKey} (lastActivity: ${new Date(session.lastActivity).toISOString()})`);
          return true;
        }
      }
    }
    
    console.log(`💬 No active chat session found between ${normalizedUser1} and ${normalizedUser2}`);
    return false;
  }

  notifyDisconnection(disconnectedUserId) {
    const normalizedDisconnectedUserId = String(disconnectedUserId);
    const disconnectedUserName = this.getUserName(normalizedDisconnectedUserId);
    
    this.connectedUsers.forEach((socketId, userId) => {
      if (userId !== normalizedDisconnectedUserId) {
        this.io.to(socketId).emit('user_disconnected', {
          user_id: normalizedDisconnectedUserId,
          user_name: disconnectedUserName,
          timestamp: Date.now(),
          message: `${disconnectedUserName} has disconnected`
        });
      }
    });
  }

  removeUserChatSessions(userId) {
    const normalizedUserId = String(userId);
    const sessionsToRemove = [];
    
    this.activeChatSessions.forEach((session, key) => {
      if (session.user1 === normalizedUserId || session.user2 === normalizedUserId) {
        sessionsToRemove.push(key);
      }
    });
    
    sessionsToRemove.forEach(key => {
      this.activeChatSessions.delete(key);
    });
  }

  getUserName(userId) {
    return `User_${userId}`;
  }

  async saveNotificationToDB(notificationData) {
    try {
      const result = await NotificationController.saveNotification(notificationData);
      if (result.success) {
        logger.info(`💾 Notification saved to database: ID ${result.notification_id}`);
      } else {
        logger.error(`❌ Failed to save notification: ${result.error}`);
      }
      return result;
    } catch (error) {
      logger.error(`❌ Error saving notification to database: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendFCMNotification(userId, senderName, message, sourceId = null, sourceType = 'chat') {
    try {
      const NotificationService = require('../notification/NotificationService');
      
      const receiverRows = await query('SELECT fcm_token FROM users WHERE user_id = ? LIMIT 1', [userId]);
      
      let fcmMessageId = null;
      
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
        
        const fcmResult = await NotificationService.sendNotification(userId, notificationData.title, notificationData.body, notificationData.data);
        fcmMessageId = fcmResult?.messageId || null;
        logger.info(`📱 FCM notification sent to user ${userId}`);
      } else {
        logger.warn(`❌ No FCM token found for user ${userId}`);
      }

      await this.saveNotificationToDB({
        user_id: parseInt(userId),
        notification_type: 'chat',
        title: `New message from ${senderName}`,
        message: message,
        data: {
          type: 'chat_message',
          sender_name: senderName,
          message: message
        },
        source_id: sourceId,
        source_type: sourceType,
        fcm_message_id: fcmMessageId
      });

    } catch (error) {
      logger.error('Error sending FCM notification:', error);
    }
  }

  getUserActiveChatSessions(userId) {
    const normalizedUserId = String(userId);
    const userSessions = [];
    
    this.activeChatSessions.forEach((session, key) => {
      if (session.user1 === normalizedUserId || session.user2 === normalizedUserId) {
        userSessions.push({
          sessionKey: key,
          otherUser: session.user1 === normalizedUserId ? session.user2 : session.user1,
          lastActivity: session.lastActivity,
          isActive: session.isActive
        });
      }
    });
    
    return userSessions;
  }

  updateChatSessionActivity(user1, user2) {
    const normalizedUser1 = String(user1);
    const normalizedUser2 = String(user2);
    const sessionKey = this.getChatSessionKey(normalizedUser1, normalizedUser2);
    const session = this.activeChatSessions.get(sessionKey);
    
    if (session) {
      session.lastActivity = Date.now();
      session.isActive = true;
      this.activeChatSessions.set(sessionKey, session);
    }
  }
}

module.exports = new WebSocketService();