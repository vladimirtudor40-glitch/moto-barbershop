# Moto Barbershop · site

Site pentru Moto Barbershop, Constanța. Node.js + Express, animații GSAP.

## Pornire

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # repornește singur la modificări
```

Portul se schimbă cu `PORT=8080 npm start`.

## Online (GitHub Pages)

La fiecare push pe `main`, GitHub Actions construiește varianta statică (`npm run build` → `dist/`) și o publică pe GitHub Pages:
https://vladimirtudor40-glitch.github.io/moto-barbershop/

Varianta statică arată la fel ca serverul Node. Statusul „Deschis / Închis” e calculat în browser, cu ora României.

## Unde schimbi lucrurile

Totul ține de un singur fișier: **`data/business.json`**.

- **Prețuri și servicii:** lista `services` (nume, detalii, preț, minute). Serviciul cu `"featured": true` apare în cardul mare.
- **Program:** lista `hours`, de luni până duminică. Pentru o zi liberă pui `null` la `open` și `close`.
- **Adresă, rating, link de programare:** câmpurile de sus.

Modificările apar la următorul refresh, fără repornirea serverului.

## Ce face serverul

- `GET /`: pagina, randată pe server, cu servicii, program și starea „Deschis acum / Închis” calculată în ora României
- `GET /api/business`: toate datele în JSON
- `GET /api/status`: doar starea deschis/închis; pagina o reîmprospătează la fiecare minut
- `GET /healthz`: verificare pentru hosting

## Structură

```
server.js            Express, logica de program
data/business.json   servicii, prețuri, program, adresă
views/index.ejs      pagina
public/css/style.css stiluri
public/js/main.js    animații (GSAP + ScrollTrigger + SplitText)
```

## Animații

Toate folosesc GSAP (inclusiv pluginurile ScrollSmoother, SplitText, Flip și CustomEase, gratuite din 3.13), servit local din `node_modules`.

- **Intro:** turometrul urcă până la zona roșie, apoi logo-ul strălucește și zboară în centrul roții din hero
- **Scroll fin** cu inerție pe tot site-ul, parallax pe straturi (roată, dungi de viteză)
- **Cursor de lumină** care crește peste linkuri și arată „Rezervă” peste butoanele de programare
- **Hero:** roata și logo-ul se mișcă după mouse, lumina urmărește cursorul, o rază trece peste logo
- **Bandă cu servicii** pe două rânduri, în sensuri opuse, care se înclină după viteza de scroll
- **Titluri** care se ridică literă cu literă, texte care ies din blur cuvânt cu cuvânt
- **Servicii:** cardul Final Boss se deschide ca o fereastră și rămâne fixat cât trece lista
- **Pit stop:** secțiune orizontală cu carduri care se rotesc în 3D
- **Harta** se aprinde ca un far, programul intră rând cu rând
- **Meniu:** o pastilă de sticlă care alunecă la secțiunea activă
- Lumini difuze care plutesc în fundal și o granulație fină

Toate animațiile folosesc același easing („premium”, definit cu CustomEase în `public/js/main.js`).
Cu „reduce motion” activat în sistem, totul se oprește și pagina se afișează static.
Pe telefon, scroll-ul rămâne cel nativ, iar cursorul și efectele de mouse sunt dezactivate.

## De adăugat

- Poze reale din salon (hero și „Ritualul”). Acum totul e grafică SVG.
- Număr de telefon și link-uri de Instagram/Facebook, dacă există.
