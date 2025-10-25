const fs = require('fs');

// Read the AdminController.js file
let content = fs.readFileSync('controllers/AdminController.js', 'utf8');

// Split into lines for easier processing
const lines = content.split('\n');
const fixedLines = [];

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  
  // Check if this is a function declaration
  if (line.includes('static async') && line.includes('(req, res)')) {
    // Find the matching closing brace for this function
    let braceCount = 0;
    let j = i;
    let foundClosingBrace = false;
    
    while (j < lines.length) {
      const currentLine = lines[j];
      
      // Count opening braces
      braceCount += (currentLine.match(/\{/g) || []).length;
      // Count closing braces
      braceCount -= (currentLine.match(/\}/g) || []).length;
      
      // If we've closed all braces, we found the end of the function
      if (braceCount <= 0 && j > i) {
        foundClosingBrace = true;
        break;
      }
      
      j++;
    }
    
    // If we didn't find a closing brace, add one
    if (!foundClosingBrace) {
      // Add the missing closing brace
      fixedLines.push(line);
      i++;
      
      // Add all lines until we find the next function or end of file
      while (i < lines.length && !lines[i].includes('static async')) {
        fixedLines.push(lines[i]);
        i++;
      }
      
      // Add the missing closing brace
      fixedLines.push('  }');
      continue;
    } else {
      // Function has proper closing brace, add all lines
      while (i <= j) {
        fixedLines.push(lines[i]);
        i++;
      }
      continue;
    }
  }
  
  // Not a function declaration, just add the line
  fixedLines.push(line);
  i++;
}

// Join the fixed lines
let fixedContent = fixedLines.join('\n');

// Clean up extra empty lines
fixedContent = fixedContent.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n\n');

// Write the fixed content back to the file
fs.writeFileSync('controllers/AdminController.js', fixedContent);

console.log('Fixed missing closing braces in AdminController.js');
console.log('File fixed and saved successfully!');
