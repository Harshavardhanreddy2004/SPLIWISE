const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\Harsh\\.gemini\\antigravity\\brain\\2344767d-d7a9-43d4-a4ab-10d8ff80783b\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(transcriptPath)) {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines in transcript: ${lines.length}`);
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('password') || line.toLowerCase().includes('postgresql') || line.toLowerCase().includes('ccsgbqbvkqymbsvvplkc')) {
      // Print first 500 characters of matching line to avoid giant dumps
      console.log(`Line ${index + 1}: ${line.substring(0, 500)}...`);
    }
  });
} else {
  console.log('Transcript file not found.');
}
