const fs = require('fs');
const path = require('path');

function searchDir(dir, searchPatterns) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchDir(fullPath, searchPatterns);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of searchPatterns) {
        if (content.includes(pattern)) {
          console.log(`Found pattern "${pattern}" in: ${fullPath}`);
        }
      }
    }
  }
}

const targetDir = 'C:\\Users\\Harsh\\.gemini\\antigravity\\scratch\\splitid';
const patterns = ['harsha@gmail.com', 'katlaharshavardhanreddy', 'Password123!'];

searchDir(targetDir, patterns);
console.log('Search complete.');
