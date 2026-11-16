# Alauddin Khan — Interactive 3D Portfolio

An original, responsive, internship-oriented portfolio for **Alauddin Khan**, based on the provided portfolio ZIP and inspired by the editorial layout of abdessamad.me. This is **not a copy** of that site.

## Highlights

- Black-and-white editorial aesthetic with a subtle green 3D accent; light/dark themes.
- Interactive **3D particle portrait** made from Alauddin's actual cutout photo using perspective projection and image-sampled point geometry. Drag to rotate, or move your mouse. No external 3D library required.
- Original-photo / particle view switch; respects `prefers-reduced-motion`.
- Responsive navigation, typography, and four 3D-tilt project cards.
- All four original projects, a live Connect 4 demo link, the original contact links, COMSATS background, and honest internship-focused writing.
- A working two-player Connect 4 game with horizontal, vertical and diagonal wins, draw detection, and reset.
- Accessible focus states, mobile navigation, semantic HTML and reduced-motion fallbacks.

## Run locally

Open `index.html` in a modern browser. No installation or build step is needed.

For a development server:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Deploy

Upload `index.html`, `styles.css`, `script.js`, and `assets/` to any static host, including Vercel, GitHub Pages, or Netlify. On Vercel, choose **Other** as the framework preset and leave the build command empty.

## Change your details

- Main content and project URLs: `index.html`
- Colors, layout and design: `styles.css` (`:root` variables)
- Particle portrait, animation and Connect 4 logic: `script.js`
- Photo: `assets/alauddin-portrait.webp`
- Avatar: `assets/avatar.webp`

The three projects without live demo URLs use **Ask about this project** email links rather than inventing demo links. Replace those links with real live demos when they are available.

## Technical notes

The particle effect uses browser Canvas 2D with manually calculated 3D perspective transforms, not Three.js/WebGL. It is interactive depth rather than a full 3D mesh reconstruction. When disabled or unsupported, the original photo remains available. Fonts are fetched from Google Fonts when the device is online; system fonts serve as fallback.

This build does not contain the original ZIP's `.git` history or temporary files. The original portfolio was not altered.
