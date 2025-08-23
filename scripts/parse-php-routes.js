#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parsePHPRoutes(phpRoutesPath) {
  const content = fs.readFileSync(phpRoutesPath, 'utf8');
  const routes = [];
  
  // Handle constants
  const constants = {
    'SITEADMIN': 'admin',
    'API': 'api',
    'SITEFRONT': 'front'
  };
  
  // Parse CodeIgniter route patterns
  const routePatterns = [
    // $route['path'] = 'Controller/method';
    /\$route\['([^']+)'\]\s*=\s*([^;]+)\/([^;]+)/g,
    // $route['path'] = 'Controller';
    /\$route\['([^']+)'\]\s*=\s*([^;]+)/g,
    // $route['path'] = 'Controller/method';
    /\$route\["([^"]+)"\]\s*=\s*([^;]+)\/([^;]+)/g,
    // $route['path'] = 'Controller';
    /\$route\["([^"]+)"\]\s*=\s*([^;]+)/g
  ];
  
  routePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const [, routePath, controller, action] = match;
      
      // Normalize path
      let normalizedPath = routePath;
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
      
      // Handle CodeIgniter placeholders
      normalizedPath = normalizedPath
        .replace(/\(:num\)/g, '{id}')
        .replace(/\(:any\)/g, '{param}')
        .replace(/\(:segment\)/g, '{segment}');
      
      // Replace constants in controller path
      let controllerPath = controller || '';
      Object.entries(constants).forEach(([constant, value]) => {
        controllerPath = controllerPath.replace(new RegExp(constant + '\\.', 'g'), value + '/');
      });
      
      routes.push({
        method: 'GET', // Default to GET for CodeIgniter routes
        path: normalizedPath,
        controller: controllerPath,
        action: action || 'index'
      });
    }
  });
  
  // Also look for RESTful patterns
  const restPatterns = [
    // RESTful routes
    /\$route\[['"](GET|POST|PUT|DELETE|PATCH)['"]\]\['([^']+)'\]\s*=\s*['"]([^'"]+)\/([^'"]+)['"]/g,
    /\$route\[['"](GET|POST|PUT|DELETE|PATCH)['"]\]\["([^"]+)"\]\s*=\s*["']([^"']+)\/([^"']+)["']/g
  ];
  
  restPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const [, method, routePath, controller, action] = match;
      
      let normalizedPath = routePath;
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
      
      normalizedPath = normalizedPath
        .replace(/\(:num\)/g, '{id}')
        .replace(/\(:any\)/g, '{param}')
        .replace(/\(:segment\)/g, '{segment}');
      
      // Replace constants in controller path
      let controllerPath = controller || '';
      Object.entries(constants).forEach(([constant, value]) => {
        controllerPath = controllerPath.replace(new RegExp(constant + '\\.', 'g'), value + '/');
      });
      
      routes.push({
        method: method.toUpperCase(),
        path: normalizedPath,
        controller: controllerPath,
        action: action || 'index'
      });
    }
  });
  
  return routes;
}

function main() {
  const phpRoutesPath = path.join(__dirname, '../../AlphaLinkup_PHP_Backend/application/config/routes.php');
  
  if (!fs.existsSync(phpRoutesPath)) {
    console.error('PHP routes file not found:', phpRoutesPath);
    process.exit(1);
  }
  
  const routes = parsePHPRoutes(phpRoutesPath);
  
  // Write to CSV
  const csvContent = ['method,path,controller,action\n'];
  routes.forEach(route => {
    csvContent.push(`${route.method},${route.path},${route.controller},${route.action}\n`);
  });
  
  const outputPath = path.join(__dirname, '../tmp-routing/php_routes.csv');
  fs.writeFileSync(outputPath, csvContent.join(''));
  
  console.log(`Parsed ${routes.length} PHP routes`);
  console.log(`Output written to: ${outputPath}`);
  
  // Also output as JSON for debugging
  const jsonOutputPath = path.join(__dirname, '../tmp-routing/php_routes.json');
  fs.writeFileSync(jsonOutputPath, JSON.stringify(routes, null, 2));
  console.log(`JSON output written to: ${jsonOutputPath}`);
}

if (require.main === module) {
  main();
}
