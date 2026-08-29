const fs = require('fs');

let content = fs.readFileSync('src/components/OverviewDashboard.tsx', 'utf8');
content = content.replace(/fuchsia/g, 'purple');
fs.writeFileSync('src/components/OverviewDashboard.tsx', content);

