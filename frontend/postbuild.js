import fs from 'fs';

if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.cpSync('build/client', 'dist', { recursive: true });
if (fs.existsSync('dist/__spa-fallback.html')) {
  fs.copyFileSync('dist/__spa-fallback.html', 'dist/404.html');
}

