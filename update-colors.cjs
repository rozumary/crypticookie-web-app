const fs = require('fs');

let content = fs.readFileSync('src/components/OverviewDashboard.tsx', 'utf8');

// Backgrounds
content = content.replace(/bg-\[#0a0510\]\/90/g, 'bg-[#180a2b]');
content = content.replace(/bg-\[#0a0510\]/g, 'bg-[#180a2b]');
content = content.replace(/bg-\[#08030d\]/g, 'bg-[#120722]');
content = content.replace(/bg-\[#06020a\]/g, 'bg-[#0f051c]');

// Borders
// Replace the subtle fuchsia borders with a brighter, more distinct purple matching the screenshot
content = content.replace(/border-fuchsia-900\/30/g, 'border-purple-600/50');
content = content.replace(/border-fuchsia-900\/40/g, 'border-purple-600/50');
content = content.replace(/border-fuchsia-900\/50/g, 'border-purple-500/50');
content = content.replace(/border-fuchsia-700\/40/g, 'border-purple-400/60');
content = content.replace(/border-fuchsia-700\/50/g, 'border-purple-400/60');
content = content.replace(/border-fuchsia-500\/30/g, 'border-purple-500/40');

// Hover border colors
content = content.replace(/hover:border-fuchsia-700\/40/g, 'hover:border-purple-400/80');

// Buttons / Badges
content = content.replace(/bg-fuchsia-600/g, 'bg-purple-600');
content = content.replace(/hover:bg-fuchsia-500/g, 'hover:bg-purple-500');
content = content.replace(/bg-fuchsia-500\/10/g, 'bg-purple-500/20');
content = content.replace(/text-fuchsia-300/g, 'text-purple-300');
content = content.replace(/text-fuchsia-200/g, 'text-purple-200');
content = content.replace(/text-fuchsia-400/g, 'text-purple-400');
content = content.replace(/text-fuchsia-100/g, 'text-purple-100');

fs.writeFileSync('src/components/OverviewDashboard.tsx', content);
