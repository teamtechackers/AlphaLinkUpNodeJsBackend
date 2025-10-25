const { query } = require('./src/config/db');

async function testIuId() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const testResult = await query('SELECT 1 as test');
    console.log('Database connection test:', testResult);
    
    // Check user_investors_unlocked table for user 68 and investor 60
    const unlockData = await query('SELECT * FROM user_investors_unlocked WHERE user_id = ? AND investor_id = ?', [68, 60]);
    console.log('user_investors_unlocked data for user 68, investor 60:', unlockData);
    
    // Check all records in user_investors_unlocked
    const allUnlocks = await query('SELECT * FROM user_investors_unlocked LIMIT 5');
    console.log('First 5 records from user_investors_unlocked:', allUnlocks);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testIuId();
