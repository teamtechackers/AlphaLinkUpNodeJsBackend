const fs = require('fs');

// Read the AdminController.js file
let content = fs.readFileSync('controllers/AdminController.js', 'utf8');

// Remove orphaned code fragments (lines that start with console.log but are not inside functions)
const lines = content.split('\n');
const cleanedLines = [];
let inFunction = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if we're entering a function
  if (line.includes('static async') && line.includes('(req, res)')) {
    inFunction = true;
    braceCount = 0;
  }
  
  // Count braces to track function boundaries
  if (inFunction) {
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    
    // If we've closed all braces, we're out of the function
    if (braceCount <= 0) {
      inFunction = false;
    }
  }
  
  // Skip orphaned console.log statements and related code
  if (!inFunction && (
    line.trim().startsWith('console.log(') ||
    line.trim().startsWith('// Check if user_id') ||
    line.trim().startsWith('if (!user_id') ||
    line.trim().startsWith('return res.json({') ||
    line.trim().startsWith('status: false') ||
    line.trim().startsWith('rcode: 500') ||
    line.trim().startsWith('message:') ||
    line.trim().startsWith('});') ||
    line.trim().startsWith('// Decode user ID') ||
    line.trim().startsWith('const decodedUserId') ||
    line.trim().startsWith('if (!decodedUserId') ||
    line.trim().startsWith('// Get user details') ||
    line.trim().startsWith('const userRows') ||
    line.trim().startsWith('if (!userRows.length') ||
    line.trim().startsWith('const user = userRows[0]') ||
    line.trim().startsWith('// Validate token') ||
    line.trim().startsWith('if (user.unique_token') ||
    line.trim().startsWith('// Check if user is admin') ||
    line.trim().startsWith('const adminRows') ||
    line.trim().startsWith('if (!adminRows.length') ||
    line.trim().startsWith('// Check if required fields') ||
    line.trim().startsWith('if (!name)') ||
    line.trim().startsWith('if (!keys)') ||
    line.trim().startsWith('if (!investment_range)') ||
    line.trim().startsWith('// Build condition') ||
    line.trim().startsWith('let condition') ||
    line.trim().startsWith('let params') ||
    line.trim().startsWith('if (parseInt(id)') ||
    line.trim().startsWith('condition =') ||
    line.trim().startsWith('params =') ||
    line.trim().startsWith('// Check for duplicate') ||
    line.trim().startsWith('const duplicateRows') ||
    line.trim().startsWith('const hasDuplicate') ||
    line.trim().startsWith('// Return response') ||
    line.trim().startsWith('return res.json({') ||
    line.trim().startsWith('validate: hasDuplicate') ||
    line.trim().startsWith('} catch (error)') ||
    line.trim().startsWith('console.error(') ||
    line.trim().startsWith('Failed to') ||
    line.trim().startsWith('}') && line.trim() === '}'
  )) {
    continue;
  }
  
  cleanedLines.push(line);
}

// Join the cleaned lines
let cleanedContent = cleanedLines.join('\n');

// Clean up extra empty lines (more than 2 consecutive)
cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n\n');

// Write the cleaned content back to the file
fs.writeFileSync('controllers/AdminController.js', cleanedContent);

console.log('Cleaned up orphaned code fragments from AdminController.js');
console.log('File cleaned and saved successfully!');
