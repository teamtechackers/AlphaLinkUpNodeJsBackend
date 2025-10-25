const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateJobSkills() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('🔧 Updating job skills...');

        // Update Job 47 (Test Job) with JavaScript and Java skills
        await connection.execute(
            'UPDATE user_job_details SET skill_ids = ? WHERE job_id = ?',
            ['18,25', 47]
        );
        console.log('✅ Job 47 (Test Job) updated with skills: JavaScript, Java');

        // Update Job 48 (Clean Job Test) with Node.js and React skills  
        await connection.execute(
            'UPDATE user_job_details SET skill_ids = ? WHERE job_id = ?',
            ['45,46', 48]
        );
        console.log('✅ Job 48 (Clean Job Test) updated with skills: Node.js, React');

        console.log('🎉 All jobs updated successfully!');

    } catch (error) {
        console.error('❌ Error updating job skills:', error);
    } finally {
        await connection.end();
    }
}

updateJobSkills();
