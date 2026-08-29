const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/bg-\[#06020a\]/g, 'bg-[#0a0412]');
fs.writeFileSync('src/App.tsx', content);

let cssContent = fs.readFileSync('src/index.css', 'utf8');
cssContent = cssContent.replace(/background-color: #06020a;/g, 'background-color: #0a0412;');
fs.writeFileSync('src/index.css', cssContent);
