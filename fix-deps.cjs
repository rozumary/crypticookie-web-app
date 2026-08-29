const fs = require('fs');

let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.dependencies && pkg.dependencies.vite) {
  delete pkg.dependencies.vite;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
}

let serverTs = fs.readFileSync('server.ts', 'utf8');
serverTs = serverTs.replace(/import\s*\{\s*createServer\s*as\s*createViteServer\s*\}\s*from\s*"vite";\n?/g, '');
serverTs = serverTs.replace(
  /const\s*vite\s*=\s*await\s*createViteServer\(/g,
  'const { createServer: createViteServer } = await import("vite");\n    const vite = await createViteServer('
);
fs.writeFileSync('server.ts', serverTs);

