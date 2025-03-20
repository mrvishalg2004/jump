const fs = require('fs');
const path = require('path');

console.log('Running Vercel build helper...');

// Ensure build directory exists
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  console.error('Build directory does not exist. Build may have failed.');
  process.exit(1);
}

// Function to copy file with a message
function copyFile(source, dest) {
  try {
    fs.copyFileSync(source, dest);
    console.log(`Copied ${source} to ${dest}`);
  } catch (err) {
    console.error(`Error copying ${source} to ${dest}:`, err);
  }
}

// Ensure fallback files exist in the build directory
const publicDir = path.join(__dirname, 'public');

// Copy fallback files if they exist
const filesToCopy = [
  'fallback-index.html',
  '404.html',
  'vercel-init.js'
];

filesToCopy.forEach(file => {
  const sourcePath = path.join(publicDir, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(sourcePath)) {
    copyFile(sourcePath, destPath);
  } else {
    console.warn(`Warning: ${sourcePath} does not exist`);
  }
});

// Create a diagnostic file in the build directory
const diagnosticFile = path.join(buildDir, 'vercel-build-info.json');
const diagnosticData = {
  buildTime: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'unknown',
    CI: process.env.CI || 'unknown',
    VERCEL: process.env.VERCEL || 'unknown'
  },
  buildFiles: fs.readdirSync(buildDir).slice(0, 20) // List first 20 files
};

fs.writeFileSync(
  diagnosticFile,
  JSON.stringify(diagnosticData, null, 2)
);
console.log(`Created diagnostic file at ${diagnosticFile}`);

// Create a minimal HTML file that will definitely load
const minimalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Minimal Vercel Page</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; text-align: center; padding: 20px; }
  </style>
</head>
<body>
  <h1>Minimal Page Loaded Successfully</h1>
  <p>If you're seeing this, the minimal page is working correctly.</p>
  <p>Build time: ${new Date().toISOString()}</p>
  <p><a href="/">Go to main application</a></p>
  <script>
    console.log('Minimal page loaded successfully');
  </script>
</body>
</html>`;

fs.writeFileSync(
  path.join(buildDir, 'minimal.html'),
  minimalHtml
);
console.log('Created minimal.html');

// Add route for minimal.html to vercel.json if it exists
const vercelJsonPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelJsonPath)) {
  try {
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    // Check if minimal.html route already exists
    const hasMinimalRoute = vercelJson.routes.some(
      route => route.src === '/minimal' || route.src === '/minimal.html'
    );
    
    if (!hasMinimalRoute) {
      // Add minimal.html route before the catch-all route
      const catchAllIndex = vercelJson.routes.findIndex(
        route => route.src === '/(.*)'
      );
      
      if (catchAllIndex !== -1) {
        vercelJson.routes.splice(catchAllIndex, 0, {
          src: '/minimal',
          dest: '/minimal.html'
        });
        
        fs.writeFileSync(
          vercelJsonPath,
          JSON.stringify(vercelJson, null, 2)
        );
        console.log('Added minimal.html route to vercel.json');
      }
    }
  } catch (err) {
    console.error('Error updating vercel.json:', err);
  }
}

console.log('Vercel build helper completed successfully'); 