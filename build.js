// Builds a static copy of the site into dist/ (for GitHub Pages or any static host).
// The open/closed status is computed in the browser, so nothing needs a server.
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { openStatus } = require('./server');

const root = __dirname;
const out = path.join(root, 'dist');
const biz = JSON.parse(fs.readFileSync(path.join(root, 'data', 'business.json'), 'utf8'));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// Page, with relative asset paths so it works from any sub-folder (e.g. /moto-barbershop/)
const html = ejs.render(
  fs.readFileSync(path.join(root, 'views', 'index.ejs'), 'utf8'),
  { biz, status: openStatus(biz), year: new Date().getFullYear(), base: './' },
  { filename: path.join(root, 'views', 'index.ejs') },
);
fs.writeFileSync(path.join(out, 'index.html'), html);

// Static files
fs.cpSync(path.join(root, 'public'), out, { recursive: true });

// GSAP plugins the page loads
const gsapDir = path.join(root, 'node_modules', 'gsap', 'dist');
const vendor = path.join(out, 'vendor', 'gsap');
fs.mkdirSync(vendor, { recursive: true });
for (const f of ['gsap', 'ScrollTrigger', 'SplitText', 'ScrollSmoother', 'CustomEase']) {
  fs.copyFileSync(path.join(gsapDir, `${f}.min.js`), path.join(vendor, `${f}.min.js`));
}

// Tell GitHub Pages not to run Jekyll on the output
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`Built ${path.relative(root, out)}/ (${fs.readdirSync(out).length} entries)`);
