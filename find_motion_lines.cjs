const fs = require('fs');

const file1 = 'C:\\Users\\Harsh\\.gemini\\antigravity\\scratch\\splitid\\src\\pages\\GroupDetailsPage.tsx';
const file2 = 'C:\\Users\\Harsh\\.gemini\antigravity\\scratch\\splitid\\src\\pages\\ProfilePage.tsx';

function findLines(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${filePath}`);
    return;
  }
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.includes('motion.div')) {
      console.log(`${filePath} - Line ${index + 1}: ${line.trim()}`);
    }
  });
}

findLines(file1);
findLines(file2);
