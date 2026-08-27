import fs from 'fs';
if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
fs.renameSync('build/client', 'dist');
if (fs.existsSync('dist/__spa-fallback.html')) {
  fs.renameSync('dist/__spa-fallback.html', 'dist/404.html');
}
