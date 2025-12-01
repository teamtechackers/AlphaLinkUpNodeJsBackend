-- ============================================
-- AlphaLinkup Admin Permission System Migration
-- ============================================

-- Step 1: Update admin_users table to add is_super_admin column
-- Check if column exists first
SET @col_exists = (SELECT COUNT(*) 
                   FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = 'alphalinkup' 
                   AND TABLE_NAME = 'admin_users' 
                   AND COLUMN_NAME = 'is_super_admin');

SET @sql_add_column = IF(@col_exists = 0, 
  'ALTER TABLE admin_users ADD COLUMN is_super_admin TINYINT(1) DEFAULT 0 COMMENT ''1=SuperAdmin, 0=SubAdmin''',
  'SELECT "Column is_super_admin already exists"');

PREPARE stmt FROM @sql_add_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Set existing admin as SuperAdmin (update the ID as needed)
UPDATE admin_users SET is_super_admin = 1 WHERE id = 1;

-- Step 2: Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  status TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default roles
INSERT INTO admin_roles (role_name, description) VALUES
('Super Admin', 'Full system access with all permissions'),
('Sub Admin', 'Limited access based on assigned permissions')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Step 3: Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  module_name VARCHAR(100) NOT NULL COMMENT 'users, jobs, events, cards, etc',
  permission_key VARCHAR(100) NOT NULL COMMENT 'users.view, users.create, users.edit, users.delete',
  permission_name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_permission_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 4: Insert all permissions
INSERT INTO admin_permissions (module_name, permission_key, permission_name, description) VALUES
-- User Management
('users', 'users.view', 'View Users', 'Can view user list and details'),
('users', 'users.create', 'Create User', 'Can create new users'),
('users', 'users.edit', 'Edit User', 'Can edit user details'),
('users', 'users.delete', 'Delete User', 'Can delete users'),

-- Job Management
('jobs', 'jobs.view', 'View Jobs', 'Can view job listings'),
('jobs', 'jobs.create', 'Create Job', 'Can create new jobs'),
('jobs', 'jobs.edit', 'Edit Job', 'Can edit job details'),
('jobs', 'jobs.delete', 'Delete Job', 'Can delete jobs'),
('jobs', 'jobs.approve', 'Approve Job', 'Can approve job postings'),

-- Event Management
('events', 'events.view', 'View Events', 'Can view events'),
('events', 'events.create', 'Create Event', 'Can create new events'),
('events', 'events.edit', 'Edit Event', 'Can edit event details'),
('events', 'events.delete', 'Delete Event', 'Can delete events'),
('events', 'events.approve', 'Approve Event', 'Can approve events'),

-- Card Activation
('cards', 'cards.view', 'View Card Requests', 'Can view card activation requests'),
('cards', 'cards.approve', 'Approve Card', 'Can approve/reject card activation'),

-- Investor Management
('investors', 'investors.view', 'View Investors', 'Can view investor list'),
('investors', 'investors.create', 'Create Investor', 'Can create investor profiles'),
('investors', 'investors.edit', 'Edit Investor', 'Can edit investor details'),
('investors', 'investors.delete', 'Delete Investor', 'Can delete investors'),
('investors', 'investors.approve', 'Approve Investor', 'Can approve investor profiles'),

-- Service Provider Management
('services', 'services.view', 'View Services', 'Can view service providers'),
('services', 'services.create', 'Create Service', 'Can create service providers'),
('services', 'services.edit', 'Edit Service', 'Can edit service details'),
('services', 'services.delete', 'Delete Service', 'Can delete services'),
('services', 'services.approve', 'Approve Service', 'Can approve service providers'),

-- Meeting Management
('meetings', 'meetings.view', 'View Meetings', 'Can view meeting requests'),
('meetings', 'meetings.schedule', 'Schedule Meeting', 'Can schedule meetings'),
('meetings', 'meetings.update', 'Update Meeting', 'Can update meeting details'),
('meetings', 'meetings.cancel', 'Cancel Meeting', 'Can cancel meetings'),

-- Master Data Management
('master_data', 'master_data.view', 'View Master Data', 'Can view master data (countries, cities, etc)'),
('master_data', 'master_data.create', 'Create Master Data', 'Can create master data entries'),
('master_data', 'master_data.edit', 'Edit Master Data', 'Can edit master data'),
('master_data', 'master_data.delete', 'Delete Master Data', 'Can delete master data entries'),

-- Admin Management (SuperAdmin Only)
('admins', 'admins.view', 'View Admins', 'Can view admin list'),
('admins', 'admins.create', 'Create Admin', 'Can create sub-admins'),
('admins', 'admins.edit', 'Edit Admin', 'Can edit admin details'),
('admins', 'admins.delete', 'Delete Admin', 'Can delete admins'),
('admins', 'admins.permissions', 'Manage Permissions', 'Can assign permissions to admins'),

-- Reports & Analytics
('reports', 'reports.view', 'View Reports', 'Can view analytics and reports'),
('reports', 'reports.export', 'Export Reports', 'Can export reports')

ON DUPLICATE KEY UPDATE 
  permission_name = VALUES(permission_name),
  description = VALUES(description);

-- Step 5: Create admin_user_permissions table (Junction table)
CREATE TABLE IF NOT EXISTS admin_user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_by INT COMMENT 'SuperAdmin ID who granted this permission',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES admin_permissions(permission_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_admin_permission (admin_user_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Migration Complete
-- ============================================
