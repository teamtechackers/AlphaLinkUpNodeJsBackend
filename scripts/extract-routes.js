#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function extractRoutesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const routes = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Match router.METHOD('/path', handler)
    const routerMethodMatch = line.match(/router\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*([^,\n]+)/i);
    if (routerMethodMatch) {
      const [, method, routePath, handler] = routerMethodMatch;
      routes.push({
        file: path.relative(process.cwd(), filePath),
        method: method.toUpperCase(),
        path: routePath,
        handler: handler.trim(),
        line: lineNum
      });
    }
    
    // Match app.METHOD('/path', handler)
    const appMethodMatch = line.match(/app\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*([^,\n]+)/i);
    if (appMethodMatch) {
      const [, method, routePath, handler] = appMethodMatch;
      routes.push({
        file: path.relative(process.cwd(), filePath),
        method: method.toUpperCase(),
        path: routePath,
        handler: handler.trim(),
        line: lineNum
      });
    }
    
    // Match app.use('/prefix', router) - these are mount points
    const appUseMatch = line.match(/app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*([^,\n]+)/i);
    if (appUseMatch) {
      const [, mountPath, router] = appUseMatch;
      routes.push({
        file: path.relative(process.cwd(), filePath),
        method: 'USE',
        path: mountPath,
        handler: router.trim(),
        line: lineNum
      });
    }
    
    // Match router.use('/prefix', ...) - these are also mount points
    const routerUseMatch = line.match(/router\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*([^,\n]+)/i);
    if (routerUseMatch) {
      const [, mountPath, router] = routerUseMatch;
      routes.push({
        file: path.relative(process.cwd(), filePath),
        method: 'USE',
        path: mountPath,
        handler: router.trim(),
        line: lineNum
      });
    }
  });
  
  return routes;
}

function findRouteFiles(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (!['node_modules', '.git', 'tmp-routing', 'scripts'].includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile() && /\.(js|ts)$/.test(item)) {
        // Only process JavaScript and TypeScript files
        if (!item.includes('.test.') && !item.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    });
  }
  
  scanDirectory(dir);
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const outputType = args[0] || 'before';
  
  const srcDir = path.join(__dirname, '../src');
  const routeFiles = findRouteFiles(srcDir);
  
  console.log(`Found ${routeFiles.length} potential route files`);
  
  const allRoutes = [];
  
  routeFiles.forEach(filePath => {
    try {
      const routes = extractRoutesFromFile(filePath);
      allRoutes.push(...routes);
    } catch (error) {
      console.warn(`Warning: Could not parse ${filePath}:`, error.message);
    }
  });
  
  // Write to CSV
  const csvContent = ['file,method,path,handler,line\n'];
  allRoutes.forEach(route => {
    csvContent.push(`${route.file},${route.method},${route.path},${route.handler},${route.line}\n`);
  });
  
  const outputPath = path.join(__dirname, `../tmp-routing/node_routes_${outputType}.csv`);
  fs.writeFileSync(outputPath, csvContent.join(''));
  
  console.log(`Extracted ${allRoutes.length} routes`);
  console.log(`Output written to: ${outputPath}`);
  
  // Also output as JSON for debugging
  const jsonOutputPath = path.join(__dirname, `../tmp-routing/node_routes_${outputType}.json`);
  fs.writeFileSync(jsonOutputPath, JSON.stringify(allRoutes, null, 2));
  console.log(`JSON output written to: ${jsonOutputPath}`);
}

if (require.main === module) {
  main();
}
