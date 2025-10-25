#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function normalizePath(pathStr) {
  // Remove leading/trailing slashes, normalize to lowercase
  let normalized = pathStr.replace(/^\/+|\/+$/g, '');
  if (normalized === '') normalized = '/';
  else normalized = '/' + normalized.toLowerCase();
  return normalized;
}

function normalizeMethod(method) {
  return method.toUpperCase();
}

function compareRoutes(phpRoutes, nodeRoutes, postmanRoutes) {
  const result = {
    missing: [],
    mismatched: [],
    extra: [],
    conflicts: []
  };
  
  // Normalize all routes for comparison
  const normalizedPhp = phpRoutes.map(r => ({
    ...r,
    normalizedPath: normalizePath(r.path),
    normalizedMethod: normalizeMethod(r.method)
  }));
  
  const normalizedNode = nodeRoutes.map(r => ({
    ...r,
    normalizedPath: normalizePath(r.path),
    normalizedMethod: normalizeMethod(r.method)
  }));
  
  const normalizedPostman = postmanRoutes.map(r => ({
    ...r,
    normalizedPath: normalizePath(r.path),
    normalizedMethod: normalizeMethod(r.method)
  }));
  
  // Find missing routes (in PHP but not in Node)
  normalizedPhp.forEach(phpRoute => {
    const found = normalizedNode.find(nodeRoute => 
      nodeRoute.normalizedPath === phpRoute.normalizedPath &&
      nodeRoute.normalizedMethod === phpRoute.normalizedMethod
    );
    
    if (!found) {
      result.missing.push(phpRoute);
    }
  });
  
  // Find mismatched routes (same intent, different path)
  normalizedPhp.forEach(phpRoute => {
    const found = normalizedNode.find(nodeRoute => 
      nodeRoute.normalizedMethod === phpRoute.normalizedMethod &&
      nodeRoute.normalizedPath !== phpRoute.normalizedPath
    );
    
    if (found) {
      result.mismatched.push({
        node: found,
        php: phpRoute
      });
    }
  });
  
  // Find extra routes (in Node but not in PHP)
  normalizedNode.forEach(nodeRoute => {
    // Skip mount points (USE method)
    if (nodeRoute.normalizedMethod === 'USE') return;
    
    const found = normalizedPhp.find(phpRoute => 
      nodeRoute.normalizedPath === phpRoute.normalizedPath &&
      nodeRoute.normalizedMethod === phpRoute.normalizedMethod
    );
    
    if (!found) {
      result.extra.push(nodeRoute);
    }
  });
  
  // Find conflicts between PHP and Postman
  normalizedPhp.forEach(phpRoute => {
    const postmanConflict = normalizedPostman.find(postmanRoute => 
      postmanRoute.normalizedPath === phpRoute.normalizedPath &&
      postmanRoute.normalizedMethod !== phpRoute.normalizedMethod
    );
    
    if (postmanConflict) {
      result.conflicts.push({
        php: phpRoute,
        postman: postmanConflict
      });
    }
  });
  
  return result;
}

function generateReport(comparison, phpRoutes, nodeRoutes, postmanRoutes) {
  let report = `# AlphaLinkup NodeJS Routes Alignment Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **PHP Routes**: ${phpRoutes.length}\n`;
  report += `- **NodeJS Routes**: ${nodeRoutes.length}\n`;
  report += `- **Postman Requests**: ${postmanRoutes.length}\n\n`;
  
  report += `## Analysis Results\n\n`;
  report += `- **Missing in NodeJS**: ${comparison.missing.length}\n`;
  report += `- **Mismatched in NodeJS**: ${comparison.mismatched.length}\n`;
  report += `- **Extra in NodeJS**: ${comparison.extra.length}\n`;
  report += `- **PHP vs Postman Conflicts**: ${comparison.conflicts.length}\n\n`;
  
  if (comparison.missing.length > 0) {
    report += `## A. Missing in NodeJS (must be added)\n\n`;
    report += `| Method | Path | Controller | Action |\n`;
    report += `|--------|------|------------|--------|\n`;
    comparison.missing.forEach(route => {
      report += `| ${route.method} | ${route.path} | | |\n`;
    });
    report += `\n`;
  }
  
  if (comparison.mismatched.length > 0) {
    report += `## B. Mismatched in NodeJS (must be renamed/updated)\n\n`;
    report += `| NodeJS (Current) | PHP (Target) |\n`;
    report += `|------------------|--------------|\n`;
    comparison.mismatched.forEach(item => {
      report += `| ${item.node.method} ${item.node.path} | ${item.php.method} ${item.php.path} |\n`;
    });
    report += `\n`;
  }
  
  if (comparison.extra.length > 0) {
    report += `## C. Extra in NodeJS (must be removed)\n\n`;
    report += `| File | Method | Path | Handler | Line |\n`;
    report += `|------|--------|------|---------|------|\n`;
    comparison.extra.forEach(route => {
      report += `| ${route.file} | ${route.method} | ${route.path} | ${route.handler} | ${route.line} |\n`;
    });
    report += `\n`;
  }
  
  if (comparison.conflicts.length > 0) {
    report += `## D. PHP vs Postman Conflicts (PHP wins)\n\n`;
    report += `| Path | PHP Method | Postman Method |\n`;
    report += `|------|-------------|----------------|\n`;
    comparison.conflicts.forEach(conflict => {
      report += `| ${conflict.php.path} | ${conflict.php.method} | ${conflict.postman.method} |\n`;
    });
    report += `\n`;
  }
  
  report += `## Route Mapping Table\n\n`;
  report += `| NodeJS (Before) | PHP Target | HTTP Method |\n`;
  report += `|------------------|------------|-------------|\n`;
  
  // Create mapping for routes that need to be updated
  const mappingRoutes = [...comparison.missing, ...comparison.mismatched.map(m => m.php)];
  mappingRoutes.forEach(route => {
    report += `| | ${route.path} | ${route.method} |\n`;
  });
  
  report += `\n## Implementation Notes\n\n`;
  report += `1. **Only change route path strings** - do not modify controllers, services, models, or business logic\n`;
  report += `2. **Keep existing Express param names** (e.g., :userId stays :userId)\n`;
  report += `3. **PHP routes take precedence** over Postman collection\n`;
  report += `4. **Remove legacy routes** that don't match PHP endpoints\n`;
  report += `5. **Update mount paths** in app.js and route files as needed\n\n`;
  
  return report;
}

function main() {
  try {
    // Read the CSV files
    const phpRoutesPath = path.join(__dirname, '../tmp-routing/php_routes.csv');
    const nodeRoutesPath = path.join(__dirname, '../tmp-routing/node_routes_before.csv');
    const postmanRoutesPath = path.join(__dirname, '../tmp-routing/postman_routes.csv');
    
    if (!fs.existsSync(phpRoutesPath) || !fs.existsSync(nodeRoutesPath) || !fs.existsSync(postmanRoutesPath)) {
      console.error('Required CSV files not found. Please run the parsing scripts first.');
      process.exit(1);
    }
    
    // Parse PHP routes
    const phpContent = fs.readFileSync(phpRoutesPath, 'utf8');
    const phpRoutes = [];
    const phpLines = phpContent.split('\n').slice(1); // Skip header
    phpLines.forEach(line => {
      if (line.trim()) {
        const [method, path, controller, action] = line.split(',');
        phpRoutes.push({ method, path, controller, action });
      }
    });
    
    // Parse NodeJS routes
    const nodeContent = fs.readFileSync(nodeRoutesPath, 'utf8');
    const nodeRoutes = [];
    const nodeLines = nodeContent.split('\n').slice(1); // Skip header
    nodeLines.forEach(line => {
      if (line.trim()) {
        const [file, method, path, handler, lineNum] = line.split(',');
        nodeRoutes.push({ file, method, path, handler, line: parseInt(lineNum) });
      }
    });
    
    // Parse Postman routes
    const postmanContent = fs.readFileSync(postmanRoutesPath, 'utf8');
    const postmanRoutes = [];
    const postmanLines = postmanContent.split('\n').slice(1); // Skip header
    postmanLines.forEach(line => {
      if (line.trim()) {
        const [method, path, name, folder] = line.split(',');
        postmanRoutes.push({ method, path });
      }
    });
    
    console.log(`Parsed ${phpRoutes.length} PHP routes, ${nodeRoutes.length} NodeJS routes, ${postmanRoutes.length} Postman requests`);
    
    // Compare routes
    const comparison = compareRoutes(phpRoutes, nodeRoutes, postmanRoutes);
    
    // Generate report
    const report = generateReport(comparison, phpRoutes, nodeRoutes, postmanRoutes);
    
    // Write report
    const reportPath = path.join(__dirname, '../tmp-routing/routing_alignment_report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`\nComparison completed:`);
    console.log(`- Missing: ${comparison.missing.length}`);
    console.log(`- Mismatched: ${comparison.mismatched.length}`);
    console.log(`- Extra: ${comparison.missing.length}`);
    console.log(`- Conflicts: ${comparison.conflicts.length}`);
    console.log(`\nReport written to: ${reportPath}`);
    
    // Write comparison results to CSV files
    if (comparison.missing.length > 0) {
      const missingCsv = ['method,path,controller,action\n'];
      comparison.missing.forEach(route => {
        missingCsv.push(`${route.method},${route.path},,,\n`);
      });
      fs.writeFileSync(path.join(__dirname, '../tmp-routing/missing_routes.csv'), missingCsv.join(''));
    }
    
    if (comparison.mismatched.length > 0) {
      const mismatchedCsv = ['node_method,node_path,php_method,php_path\n'];
      comparison.mismatched.forEach(item => {
        mismatchedCsv.push(`${item.node.method},${item.node.path},${item.php.method},${item.php.path}\n`);
      });
      fs.writeFileSync(path.join(__dirname, '../tmp-routing/mismatched_routes.csv'), mismatchedCsv.join(''));
    }
    
    if (comparison.extra.length > 0) {
      const extraCsv = ['file,method,path,handler,line\n'];
      comparison.extra.forEach(route => {
        extraCsv.push(`${route.file},${route.method},${route.path},${route.handler},${route.line}\n`);
      });
      fs.writeFileSync(path.join(__dirname, '../tmp-routing/extra_routes.csv'), extraCsv.join(''));
    }
    
  } catch (error) {
    console.error('Error during comparison:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
