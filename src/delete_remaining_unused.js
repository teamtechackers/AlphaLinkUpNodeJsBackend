const fs = require('fs');

// Read the AdminController.js file
let content = fs.readFileSync('controllers/AdminController.js', 'utf8');

// List of remaining unused functions to delete
const remainingUnusedFunctions = [
  'submitPay',
  'listPayAjax', 
  'checkDuplicatePay',
  'deletePay',
  'viewFundSize',
  'submitFundSize',
  'listFundSizeAjax',
  'checkDuplicateFundSize',
  'deleteFundSize',
  'viewEmploymentType',
  'submitEmploymentType',
  'listEmploymentTypeAjax',
  'checkDuplicateEmploymentType',
  'deleteEmploymentType',
  'viewJobs',
  'submitJobs',
  'editJobs',
  'deleteJobs',
  'viewJobsDetails'
];

console.log('Starting to remove remaining unused functions...\n');

// Function to find and remove a complete function
function removeFunction(functionName) {
  // Pattern to match the complete function including comments
  const regex = new RegExp(
    `\\s*// [^\\n]*\\n\\s*static async ${functionName}\\(req, res\\) \\{[\\s\\S]*?^\\s*\\}`,
    'gm'
  );
  
  const beforeLength = content.length;
  content = content.replace(regex, '');
  const afterLength = content.length;
  
  if (beforeLength !== afterLength) {
    console.log(`✓ Removed function: ${functionName}`);
    return true;
  } else {
    console.log(`✗ Function not found: ${functionName}`);
    return false;
  }
}

// Remove all remaining unused functions
let removedCount = 0;
remainingUnusedFunctions.forEach(funcName => {
  if (removeFunction(funcName)) {
    removedCount++;
  }
});

// Clean up extra empty lines (more than 2 consecutive)
content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n\n');

// Write the cleaned content back to the file
fs.writeFileSync('controllers/AdminController.js', content);

console.log(`\n✅ Successfully removed ${removedCount} remaining unused functions from AdminController.js`);
console.log('📁 File cleaned and saved successfully!');
