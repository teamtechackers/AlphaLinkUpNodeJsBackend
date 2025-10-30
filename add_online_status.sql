-- Add online status fields to users table
USE alphalinkup;

-- Add is_online field (0 = offline, 1 = online)
ALTER TABLE users ADD COLUMN is_online TINYINT(1) DEFAULT 0;

-- Add last_seen timestamp
ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for better performance
CREATE INDEX idx_users_online ON users(is_online);
CREATE INDEX idx_users_last_seen ON users(last_seen);

-- Show the updated table structure
DESCRIBE users;

