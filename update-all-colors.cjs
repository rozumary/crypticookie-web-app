const fs = require('fs');
const path = require('path');

const components = [
  'ExtensionSimulator.tsx',
  'BlockchainExplorer.tsx',
  'CMPRegistryManager.tsx',
  'SettingsView.tsx',
  'AIPrivacyBot.tsx',
  'DatabaseConsole.tsx'
];

components.forEach(comp => {
  const file = path.join('src/components', comp);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');

  // Backgrounds
  content = content.replace(/bg-\[#0b1026\]\/90/g, 'bg-[#180a2b]');
  content = content.replace(/bg-\[#0b1026\]/g, 'bg-[#180a2b]');
  content = content.replace(/bg-\[#0a0510\]\/90/g, 'bg-[#180a2b]');
  content = content.replace(/bg-\[#0a0510\]/g, 'bg-[#180a2b]');
  
  content = content.replace(/bg-\[#080d20\]/g, 'bg-[#120722]');
  content = content.replace(/bg-\[#08030d\]/g, 'bg-[#120722]');
  
  content = content.replace(/bg-\[#060a17\]/g, 'bg-[#0f051c]');
  content = content.replace(/bg-\[#06020a\]/g, 'bg-[#0f051c]');

  // Text Selection and generic blues
  content = content.replace(/blue-900/g, 'purple-900');
  content = content.replace(/blue-800/g, 'purple-800');
  content = content.replace(/blue-300/g, 'purple-300');
  content = content.replace(/blue-200/g, 'purple-200');
  content = content.replace(/blue-100/g, 'purple-100');
  content = content.replace(/blue-950/g, 'purple-950');

  // Colors
  content = content.replace(/fuchsia-/g, 'purple-');
  content = content.replace(/violet-/g, 'purple-');
  
  // Specific border fixes for the vibrant look
  content = content.replace(/border-purple-900\/30/g, 'border-purple-600/50');
  content = content.replace(/border-purple-900\/40/g, 'border-purple-600/50');
  content = content.replace(/border-purple-900\/50/g, 'border-purple-500/50');

  fs.writeFileSync(file, content);
});
