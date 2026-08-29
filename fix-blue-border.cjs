const fs = require('fs');
let content = fs.readFileSync('src/components/OverviewDashboard.tsx', 'utf8');
content = content.replace(/border-blue-800\/40/g, 'border-purple-600/50');
fs.writeFileSync('src/components/OverviewDashboard.tsx', content);
