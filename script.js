/* Progressive enhancement: every section remains usable without WebGL or a build step. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const themeButton = document.getElementById('theme-toggle');
  const menuButton = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-nav');
  const setTheme = theme => {
    root.dataset.theme = theme;
    themeButton?.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    try { localStorage.setItem('ak-portfolio-theme', theme); } catch (_) {}
    window.dispatchEvent(new Event('portfolio-theme-change'));
  };
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem('ak-portfolio-theme') || 'light'; } catch (_) {}
  setTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeButton?.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileMenu.hidden = !open;
  });
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    mobileMenu.hidden = true;
  }));
  document.getElementById('current-year').textContent = String(new Date().getFullYear());

  /* Reveal motion is progressive; respect reduced motion and old browsers. */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observe = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); observe.unobserve(e.target); } });
    }, {rootMargin: '0px 0px -50px 0px', threshold: 0.07});
    root.classList.add('motion-ready');
    revealEls.forEach(el => observe.observe(el));
  } else revealEls.forEach(el => el.classList.add('in-view'));

  /* Small perspective interaction, no expensive animation during scroll. */
  const hoverAllowed = matchMedia('(hover:hover) and (pointer:fine)').matches && !reduced.matches;
  if (hoverAllowed) document.querySelectorAll('.tilt-card').forEach(card => {
    let raf = 0;
    card.addEventListener('pointermove', event => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - .5;
      const y = (event.clientY - box.top) / box.height - .5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { card.style.transform = `perspective(1050px) rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(-y * 5).toFixed(2)}deg) translateY(-6px)`; });
    });
    card.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); card.style.transform = ''; });
  });

  /* True projected 3D particle cloud sampled from the user's transparent portrait.
     No external rendering library, network request, or build step required. */
  const shell = document.getElementById('portrait-shell');
  const canvas = document.getElementById('portrait-canvas');
  const source = document.getElementById('portrait-fallback');
  const toggles = document.querySelectorAll('[data-portrait]');
  const ctx = canvas?.getContext('2d', {alpha: true});
  let mode = 'particles';
  let particles = [];
  let frameId = 0;
  let drawable = true;
  let yaw = -0.09, pitch = 0.015;
  let targetYaw = yaw, targetPitch = pitch;
  let drag = null, lastPaint = 0;
  let cw = 0, ch = 0, scale = 1;
  const isDark = () => root.dataset.theme === 'dark';

  function samplePortrait() {
    if (!ctx || !source.naturalWidth) return false;
    try {
      const s = document.createElement('canvas');
      s.width = 420; s.height = 420;
      const c = s.getContext('2d', {willReadFrequently: true});
      // Square fit retains the supplied cut-out silhouette.
      c.drawImage(source, 0, 0, 420, 420);
      const data = c.getImageData(0, 0, 420, 420).data;
      particles = [];
      // Head and shoulder portrait, with the upper regions intentionally denser.
      // In source-space this is ~4,500–6,000 lightweight points.
      for (let y = 3; y < 417; y += 5) {
        for (let x = 3; x < 417; x += 5) {
          const idx = (y * 420 + x) * 4;
          const a = data[idx+3] / 255;
          if (a < .24) continue;
          const luminance = (.2126 * data[idx] + .7152 * data[idx+1] + .0722 * data[idx+2]) / 255;
          const nx = (x - 210) / 210;
          const ny = (y - 210) / 210;
          // Curved surface + small contrast bumps yields honest parallax, not just a CSS tilt.
          const bulge = (1 - Math.min(1, nx * nx)) * 57;
          const z = (bulge + (1 - luminance) * 38 + Math.sin(x * .06 + y * .09) * 3) - 46;
          particles.push({ x: x - 210, y: y - 210, z, value:luminance, opacity: Math.min(1, a * 1.2), size: (luminance < .45 ? 1.7 : 1.35) });
        }
      }
      return particles.length > 500;
    } catch (err) { return false; }
  }
  function resize() {
    if (!ctx) return;
    const rect = shell.getBoundingClientRect();
    cw = rect.width; ch = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    scale = Math.min(cw * .94 / 420, ch * .95 / 420);
  }
  function draw(t) {
    frameId = 0;
    if (!ctx || mode !== 'particles' || !drawable || reduced.matches || !particles.length || document.hidden) return;
    if (t - lastPaint < 30) { frameId = requestAnimationFrame(draw); return; }
    lastPaint = t;
    const dy = targetYaw - yaw, dp = targetPitch - pitch;
    yaw += dy * .075; pitch += dp * .075;
    ctx.clearRect(0,0,cw,ch);
    const dark = isDark();
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sx = Math.sin(pitch), cx = Math.cos(pitch);
    const centerX = cw * .5, centerY = ch * .48;
    const base = dark ? 228 : 29;
    // Render projected points with depth scaling; luminance from the person's photo
    // determines the tiny dots' opacity, preserving recognizable facial structure.
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const xx = p.x * cy + p.z * sy;
      const zz = -p.x * sy + p.z * cy;
      const yy = p.y * cx - zz * sx;
      const depth = p.y * sx + zz * cx;
      const perspective = 600 / (600 - depth);
      const x = centerX + xx * scale * perspective;
      const y = centerY + yy * scale * perspective;
      if (x < -5 || x > cw + 5 || y < -5 || y > ch + 5) continue;
      const shade = p.value;
      const alpha = p.opacity * (.33 + (dark ? shade : 1 - shade) * .64);
      ctx.fillStyle = `rgba(${base},${base+(dark?0:3)},${base},${Math.min(1,alpha).toFixed(2)})`;
      const radius = p.size * scale * perspective * (dark ? 1.02 : .98);
      ctx.fillRect(x,y,Math.max(.75,radius),Math.max(.75,radius));
    }
    // One subtle companion halo, distinct from flat image alpha silhouette.
    if (Math.abs(dy) > .0005 || Math.abs(dp) > .0005 || t < 1800) frameId = requestAnimationFrame(draw);
  }
  function redraw() { if (frameId) cancelAnimationFrame(frameId); frameId = requestAnimationFrame(draw); }
  function setPortrait(next) {
    mode = next;
    shell.classList.toggle('show-photo', next === 'photo');
    toggles.forEach(button => {
      const on = button.dataset.portrait === next;
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    });
    if (next === 'particles') redraw(); else if (frameId) cancelAnimationFrame(frameId);
  }
  toggles.forEach(button => button.addEventListener('click', () => setPortrait(button.dataset.portrait)));
  function pointerValue(e) {
    const rect = shell.getBoundingClientRect();
    return {x:(e.clientX-rect.left)/rect.width-.5, y:(e.clientY-rect.top)/rect.height-.5};
  }
  if (shell) {
    shell.addEventListener('pointerdown', e => { if (mode !== 'particles') return; drag = {id:e.pointerId,startX:e.clientX,startY:e.clientY,yaw:targetYaw,pitch:targetPitch}; shell.setPointerCapture?.(e.pointerId); });
    shell.addEventListener('pointermove', e => {
      if (mode !== 'particles' || reduced.matches) return;
      if (drag && drag.id === e.pointerId) {
        targetYaw = Math.max(-.60,Math.min(.60,drag.yaw + (e.clientX-drag.startX)/Math.max(280,cw)*1.2));
        targetPitch = Math.max(-.33,Math.min(.33,drag.pitch + (e.clientY-drag.startY)/Math.max(280,ch)*.7));
      } else if (e.pointerType !== 'touch') {
        const p = pointerValue(e); targetYaw = p.x * .55; targetPitch = -p.y * .26;
      }
      redraw();
    });
    const release = () => { drag = null; };
    shell.addEventListener('pointerup', release); shell.addEventListener('pointercancel', release);
    shell.addEventListener('pointerleave', () => { if (!drag && !reduced.matches) { targetYaw = -.09;targetPitch=.015;redraw(); }});
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => { drawable = entries[0].isIntersecting; if (drawable) redraw(); }, {threshold:.02});
      io.observe(shell);
    }
  }
  if (!ctx || reduced.matches) {
    shell.classList.add('canvas-unavailable');
    setPortrait('photo');
    if (reduced.matches) {
      const particlesToggle = document.querySelector('[data-portrait="particles"]');
      if (particlesToggle) {particlesToggle.disabled = true; particlesToggle.title = 'Particle animation is disabled by your reduced-motion preference';}
    }
  }
  else {
    const start = () => {
      if (!samplePortrait()) { shell.classList.add('canvas-unavailable'); return; }
      resize(); redraw();
      if ('ResizeObserver' in window) new ResizeObserver(() => {resize();redraw();}).observe(shell);
      else window.addEventListener('resize',()=>{resize();redraw();});
      window.addEventListener('portfolio-theme-change', redraw);
      document.addEventListener('visibilitychange', () => {if(!document.hidden) redraw();});
    };
    if (source.complete) start(); else source.addEventListener('load',start,{once:true});
  }

  /* Fully playable 2-person local Connect 4 with win/draw logic and clean resets. */
  const boardNode = document.getElementById('connect4-board');
  const statusNode = document.getElementById('game-status');
  const turnDisc = document.getElementById('game-disc');
  const reset = document.getElementById('game-reset');
  const ROWS = 6, COLS = 7;
  let board = [], player = 1, ended = false, totalMoves = 0;
  const names = ['','Purple','Gold'];
  function announce(message) {
    statusNode.textContent = message;
    turnDisc.className = 'turn-disc ' + (player === 1 ? 'player-one' : 'player-two');
  }
  function checkWin(row,col,current) {
    const directions = [[1,0],[0,1],[1,1],[1,-1]];
    return directions.some(([dr,dc]) => {
      let count = 1;
      for (const sign of [-1,1]) {
        let r = row + dr * sign, c = col + dc * sign;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === current) { count++; r += dr*sign; c += dc*sign; }
      }
      return count >= 4;
    });
  }
  function drawBoard(last = null) {
    boardNode.innerHTML = '';
    for (let col = 0; col < COLS; col++) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'connect4-column';
      btn.setAttribute('aria-label', `Drop disc in column ${col + 1}`);
      btn.setAttribute('title', `Column ${col + 1}`);
      btn.disabled = ended || board[0][col] !== 0;
      btn.addEventListener('click', () => move(col));
      for (let row = 0; row < ROWS; row++) {
        const disc = document.createElement('span');
        disc.className = 'connect4-cell';
        if (board[row][col] === 1) disc.classList.add('player-one');
        if (board[row][col] === 2) disc.classList.add('player-two');
        if (last && row === last.row && col === last.col && !reduced.matches) disc.classList.add('last-move');
        disc.setAttribute('aria-hidden','true'); btn.appendChild(disc);
      }
      boardNode.appendChild(btn);
    }
  }
  function move(col) {
    if (ended || board[0][col] !== 0) return;
    let row = ROWS - 1;
    while (row >= 0 && board[row][col] !== 0) row--;
    if (row < 0) return;
    board[row][col] = player;totalMoves++;
    const played = player;
    if (checkWin(row,col,played)) {ended = true;announce(`${names[played]} wins! Start a new game to play again.`);}
    else if (totalMoves === ROWS * COLS) {ended = true;announce("It's a draw! Start a new game to play again.");}
    else {player = player === 1 ? 2 : 1; announce(`${names[player]}'s turn — choose a column.`);}
    drawBoard({row,col});
  }
  function resetGame() {board = Array.from({length:ROWS},()=>Array(COLS).fill(0));player=1;ended=false;totalMoves=0;announce("Purple's turn — choose a column.");drawBoard();}
  reset?.addEventListener('click',resetGame); resetGame();
})();
