const { query } = require('./src/config/db');

async function testToken() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const testResult = await query('SELECT 1 as test');
    console.log('Database connection test:', testResult);
    
    // Check user with ID 68
    const userResult = await query('SELECT user_id, mobile, unique_token FROM users WHERE user_id = ?', [68]);
    console.log('User 68 result:', userResult);
    
    // Check if there are any users with mobile +923014150486
    const mobileResult = await query('SELECT user_id, mobile, unique_token FROM users WHERE mobile = ?', ['+923014150486']);
    console.log('Mobile +923014150486 result:', mobileResult);
    
    // Check what user IDs exist (limit to 10)
    const allUsers = await query('SELECT user_id, mobile, unique_token FROM users ORDER BY user_id LIMIT 10');
    console.log('First 10 users:', allUsers);
    
    // Check if user ID 61 exists
    const user61Result = await query('SELECT user_id, mobile, unique_token FROM users WHERE user_id = ?', [61]);
    console.log('User 61 result:', user61Result);
    
    // Check if user ID 60 exists (from the mobile result)
    const user60Result = await query('SELECT user_id, mobile, unique_token FROM users WHERE user_id = ?', [60]);
    console.log('User 60 result:', user60Result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testToken();
