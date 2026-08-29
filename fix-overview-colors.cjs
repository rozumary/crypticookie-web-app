const fs = require('fs');
const file = 'src/components/OverviewDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace remaining dark blues/violets to match the deep purple theme
content = content.replace(/blue-950/g, 'purple-950');
content = content.replace(/blue-900/g, 'purple-900');
content = content.replace(/blue-300/g, 'purple-300');
content = content.replace(/blue-200/g, 'purple-200');
content = content.replace(/blue-100/g, 'purple-100');
content = content.replace(/border-purple-900\/30/g, 'border-purple-600/50');
content = content.replace(/border-purple-900\/40/g, 'border-purple-600/50');

fs.writeFileSync(file, content);
