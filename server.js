const path = require('path');
const fs = require('fs');
const express = require('express');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'business.json');

// Re-read the data file on each request so price/hour edits show up without a restart.
function loadBusiness() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Open/closed status in the shop's own time zone, whatever the server's zone is.
function openStatus(biz, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: biz.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

  const today = biz.hours[idx];
  if (today.open && minutes >= toMin(today.open) && minutes < toMin(today.close)) {
    return { open: true, todayIndex: idx, label: `Deschis acum · până la ${today.close}` };
  }
  // Find the next opening.
  for (let i = 0; i < 8; i++) {
    const d = biz.hours[(idx + i) % 7];
    if (!d.open) continue;
    if (i === 0 && minutes >= toMin(d.open)) continue;
    const when = i === 0 ? 'azi' : i === 1 ? 'mâine' : d.day.toLowerCase();
    return { open: false, todayIndex: idx, label: `Închis · deschidem ${when} la ${d.open}` };
  }
  return { open: false, todayIndex: idx, label: 'Închis' };
}

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(compression());

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
// GSAP is served from node_modules, so the site needs no CDN.
app.use('/vendor/gsap', express.static(path.join(__dirname, 'node_modules', 'gsap', 'dist'), { maxAge: '30d' }));

app.get('/', (req, res) => {
  const biz = loadBusiness();
  res.render('index', { biz, status: openStatus(biz), year: new Date().getFullYear(), base: '/' });
});

app.get('/api/business', (req, res) => {
  const biz = loadBusiness();
  res.json({ ...biz, status: openStatus(biz) });
});

app.get('/api/status', (req, res) => res.json(openStatus(loadBusiness())));

app.get('/healthz', (req, res) => res.send('ok'));

app.use((req, res) => res.status(404).redirect('/'));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Moto Barbershop → http://localhost:${PORT}`));
}

module.exports = { app, openStatus };
