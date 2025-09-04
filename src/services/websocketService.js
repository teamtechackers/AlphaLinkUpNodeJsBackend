const { Server } = require('socket.io');
const { logger } = require('../utils/logger');
const { query } = require('../config/db');
const { idDecode } = require('../utils/idCodec');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map to store user_id -> socket_id
    this.userSockets = new Map(); // Map to store socket_id -> user_id
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
          const decodedUserId = idDecode(user_id);
          if (!decodedUserId) {
            socket.emit('error', { message: 'Invalid user ID' });
            return;
          }

          const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
          if (!userRows.length) {
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

            // Send to receiver if online
            const receiverSocketId = this.connectedUsers.get(receiver_id);
            if (receiverSocketId) {
              this.io.to(receiverSocketId).emit('new_message', messageData);
            }

            // Send confirmation to sender
            socket.emit('message_sent', {
              status: true,
              message: 'Message sent successfully',
              chat_id: chatResult.insertId
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
          this.connectedUsers.delete(userId);
          this.userSockets.delete(socket.id);
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

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get all connected users
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }
}

module.exports = new WebSocketService();
