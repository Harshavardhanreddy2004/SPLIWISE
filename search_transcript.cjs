const fs = require('fs');

const transcriptPath = 'C:\\Users\\Harsh\\.gemini\\antigravity\\brain\\2344767d-d7a9-43d4-a4ab-10d8ff80783b\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(transcriptPath)) {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('signin') || lowerLine.includes('signup') || lowerLine.includes('password') || lowerLine.includes('katlaharshavardhanreddy')) {
      if (line.includes('CommandLine') || line.includes('args') || line.includes('content')) {
        console.log(`Line ${index + 1}: ${line.substring(0, 800)}...`);
      }
    }
  });
} else {
  console.log('Transcript file not found.');
}
