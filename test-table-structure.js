const { query } = require('./src/config/db');

async function testTableStructure() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const testResult = await query('SELECT 1 as test');
    console.log('Database connection test:', testResult);
    
    // Check table structure
    const tableStructure = await query('DESCRIBE user_investors_unlocked');
    console.log('user_investors_unlocked table structure:', tableStructure);
    
    // Check if table exists and has data
    const tableData = await query('SELECT * FROM user_investors_unlocked LIMIT 1');
    console.log('Sample data from user_investors_unlocked:', tableData);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testTableStructure();
