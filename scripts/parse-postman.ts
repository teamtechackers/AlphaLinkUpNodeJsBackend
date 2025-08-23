#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface PostmanRequest {
  method: string;
  path: string;
  name: string;
  folder?: string;
}

interface PostmanItem {
  name: string;
  request?: {
    method: string;
    url: {
      path: string[];
      raw: string;
    };
  };
  item?: PostmanItem[];
  folder?: string;
}

function extractRequestsFromItem(item: PostmanItem, folder?: string): PostmanRequest[] {
  const requests: PostmanRequest[] = [];
  
  if (item.request) {
    // Handle path array vs raw URL
    let pathString = '';
    if (item.request.url.path && Array.isArray(item.request.url.path)) {
      pathString = '/' + item.request.url.path.join('/');
    } else if (item.request.url.raw) {
      // Extract path from raw URL
      try {
        const url = new URL(item.request.url.raw);
        pathString = url.pathname;
      } catch {
        pathString = item.request.url.raw;
      }
    }
    
    // Normalize path
    if (pathString && !pathString.startsWith('/')) {
      pathString = '/' + pathString;
    }
    
    if (pathString) {
      requests.push({
        method: item.request.method.toUpperCase(),
        path: pathString,
        name: item.name,
        folder: folder
      });
    }
  }
  
  // Recursively process nested items
  if (item.item && Array.isArray(item.item)) {
    item.item.forEach(nestedItem => {
      requests.push(...extractRequestsFromItem(nestedItem, item.name));
    });
  }
  
  return requests;
}

function parsePostmanCollection(postmanPath: string): PostmanRequest[] {
  const content = fs.readFileSync(postmanPath, 'utf8');
  const collection = JSON.parse(content);
  
  const requests: PostmanRequest[] = [];
  
  if (collection.item && Array.isArray(collection.item)) {
    collection.item.forEach(item => {
      requests.push(...extractRequestsFromItem(item));
    });
  }
  
  return requests;
}

function main() {
  const postmanPath = path.join(__dirname, '../../Alpha Linkup.postman_collection.json');
  
  if (!fs.existsSync(postmanPath)) {
    console.error('Postman collection file not found:', postmanPath);
    process.exit(1);
  }
  
  const requests = parsePostmanCollection(postmanPath);
  
  // Write to CSV
  const csvContent = ['method,path,name,folder\n'];
  requests.forEach(request => {
    csvContent.push(`${request.method},${request.path},${request.name},${request.folder || ''}\n`);
  });
  
  const outputPath = path.join(__dirname, '../tmp-routing/postman_routes.csv');
  fs.writeFileSync(outputPath, csvContent.join(''));
  
  console.log(`Parsed ${requests.length} Postman requests`);
  console.log(`Output written to: ${outputPath}`);
  
  // Also output as JSON for debugging
  const jsonOutputPath = path.join(__dirname, '../tmp-routing/postman_routes.json');
  fs.writeFileSync(jsonOutputPath, JSON.stringify(requests, null, 2));
  console.log(`JSON output written to: ${jsonOutputPath}`);
}

if (require.main === module) {
  main();
}
