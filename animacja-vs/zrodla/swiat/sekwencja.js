// Świat części kinowej: plansza „VS”, 5 stacji z tezami, lot kamery, lockup. Czysta funkcja czasu.
import * as THREE from 'three';
import { rng, clamp, smooth, lerp, softSprite, handheld } from './wspolne.js';
import { text3D, card, panel, bgCard, refreshPanels } from './elementy.js';

// ---------- TABELA BEATÓW (sekundy całego filmu) – tu przesuwam wszystko pod muzykę ----------
export const BEAT = {
  vs: 6.2, vsSub: 7.0, flare: 7.7, dive: 9.55,
  st: [10.0, 13.5, 17.0, 20.5, 24.0],          // lądowania kamery na stacjach
  travel: [0.5, 0.6, 1.25, 0.6, 0.6],           // ile trwa lot NA daną stację (stacja 3 – przelot z beczką)
  s4beats: [21.0, 21.5, 22.0, 22.5, 23.0],      // cięcia w stacji „muzyka”
  lock: 28.0, boom: 28.75, end: 31.0,
};

const p3o = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const p4o = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);
const p3io = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function buildWorld(scene, { font, env, images }) {
  const R = rng(42);
  const world = new THREE.Group(); scene.add(world);
  const tick = [];                                  // funkcje (t) => void wywoływane co klatkę

  // ---------- atmosfera: pył w całym świecie, daleka mgła, malowane tło ----------
  const ND = 5000, dp = new Float32Array(ND * 3), dseed = [];
  for (let i = 0; i < ND; i++) dseed.push([(R() - 0.5) * 3600, (R() - 0.5) * 1800, 1200 - R() * 13500, R()]);
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 3.2, map: softSprite(64), color: new THREE.Color(0.45, 0.8, 0.95), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; world.add(dust);
  tick.push((t) => { for (let i = 0; i < ND; i++) { const s = dseed[i]; dp[i * 3] = s[0] + Math.sin(t * 0.3 + s[3] * 9) * 20; dp[i * 3 + 1] = s[1] + t * (6 + s[3] * 10); dp[i * 3 + 2] = s[2]; } dGeo.attributes.position.needsUpdate = true; });

  const sky = new THREE.Mesh(new THREE.PlaneGeometry(44000, 18857), new THREE.MeshBasicMaterial({ map: images.niebo, color: new THREE.Color(0.16, 0.2, 0.24), fog: false, depthWrite: false }));
  sky.position.set(0, 300, -17000); world.add(sky);

  // ---------- 1. PLANSZA „VS” (z = 0) ----------
  const vsSet = new THREE.Group(); world.add(vsSet);
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(3400, 1912), new THREE.MeshBasicMaterial({ map: images.swiatlo, color: new THREE.Color(0.55, 0.62, 0.66), transparent: true, depthWrite: false, fog: false }));
  shaft.position.set(0, 0, -900); vsSet.add(shaft);
  const VS = text3D(font, ['VS'], { size: 300, depth: 70, env, align: 'center', metal: 0xb8c8d4 });
  VS.group.position.set(0, -40, 0); vsSet.add(VS.group);
  const SUB = text3D(font, ['animacja w Claude Code', 'syna koleżanki Twojej matki'], { size: 44, depth: 7, env, align: 'center', accent: ['Claude', 'Code'] });
  SUB.group.position.set(0, -170, 80); vsSet.add(SUB.group);
  const keyL = new THREE.PointLight(0x7ff4ff, 0, 1600, 1.6); vsSet.add(keyL);
  const flareTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, 'rgba(0,240,255,0)'); gr.addColorStop(0.5, 'rgba(210,255,255,1)'); gr.addColorStop(1, 'rgba(0,240,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 64); const v = g.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, 1024, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const flare = new THREE.Mesh(new THREE.PlaneGeometry(2600, 46), new THREE.MeshBasicMaterial({ map: flareTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
  flare.position.z = 160; vsSet.add(flare);
  const flareCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(128, 'rgba(220,255,255,1)'), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
  flareCore.scale.set(150, 150, 1); flareCore.position.z = 170; vsSet.add(flareCore);
  tick.push((t) => {
    // „VS” spada na uderzenie z głębi i osiada (power4.out), drobny overshoot skali
    const u = (t - BEAT.vs) / 0.42;
    VS.group.visible = t >= BEAT.vs - 0.01;
    VS.group.position.z = lerp(900, 0, p4o(u)); VS.group.scale.setScalar(lerp(1.5, 1, p4o(u)));
    VS.group.rotation.x = lerp(-0.35, 0, p4o(u));
    keyL.intensity = t < BEAT.vs ? 0 : 260000 * (0.3 + 0.7 * Math.exp(-(t - BEAT.vs) / 0.3));
    keyL.position.set(lerp(-700, 700, smooth(BEAT.vs, BEAT.dive, t)), 180, 520);
    // podtytuł: słowa spadają po kolei (waterfall w 3D)
    SUB.words.forEach((w, i) => {
      const t0 = BEAT.vsSub + i * 0.075, k = p4o((t - t0) / 0.3);
      w.visible = t >= t0; w.position.y = w.userData.rest.y + (1 - k) * 90; w.rotation.x = (1 - k) * -0.6;
    });
    // flara anamorficzna przelatuje przez litery
    const f = clamp((t - BEAT.flare) / 1.1, 0, 1), fo = Math.sin(Math.PI * f);
    flare.material.opacity = fo * 0.55; flareCore.material.opacity = fo * 0.6;
    flare.position.x = lerp(-900, 900, f) * 0.35; flareCore.position.x = lerp(-900, 900, f);
    flareCore.position.y = -20; flare.position.y = -20;
    shaft.material.opacity = smooth(BEAT.vs - 0.4, BEAT.vs + 0.3, t);
    vsSet.visible = t < BEAT.dive + 0.25;
  });

  // ---------- stacje: pozycje i orientacje w świecie ----------
  const ST = [
    { p: new THREE.Vector3(0, 0, -2000), yaw: 0 },
    { p: new THREE.Vector3(700, 160, -4200), yaw: -0.42 },
    { p: new THREE.Vector3(-350, -120, -6600), yaw: 0.35 },
    { p: new THREE.Vector3(500, 260, -9000), yaw: -0.3 },
    { p: new THREE.Vector3(0, 0, -11400), yaw: 0 },
  ];
  const stations = ST.map((s) => { const g = new THREE.Group(); g.position.copy(s.p); g.rotation.y = s.yaw; world.add(g); return g; });
  const DIST = 1550;
  tick.push((t) => stations.forEach((g, i) => {
    const from = BEAT.st[i] - BEAT.travel[i] - 0.15, to = i < 4 ? BEAT.st[i + 1] - BEAT.travel[i + 1] + 0.22 : 99;
    g.visible = t >= from && t <= to;
  }));                                                     // odległość kamery od stacji w spoczynku
  const restPose = (i, push = 0) => {
    const g = stations[i], off = new THREE.Vector3(0, 0, DIST - push).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
    return { pos: g.position.clone().add(off), look: g.position.clone() };
  };

  const TITLES = [
    ['Opisz ujęcia,', 'nie slajdy'],
    ['Daj Claude’owi skill', 'z fizyką ruchu'],
    ['Kamera zamiast', 'przejść'],
    ['Muzyka najpierw,', 'cięcia na beat'],
    ['Render jedną', 'komendą'],
  ];
  const ACC = [['ujęcia,'], ['skill'], ['Kamera'], ['beat'], ['komendą']];
  const EYEBROW = ['01 / PROMPT', '02 / SKILL', '03 / KAMERA', '04 / RYTM', '05 / RENDER'];
  const titles = TITLES.map((lines, i) => {
    const T = text3D(font, lines, { size: 64, depth: 10, env, accent: ACC[i] });
    T.group.position.set(-700, 300, 20); stations[i].add(T.group);
    const eb = panel(320, 34, 640, (ctx, W, H) => { ctx.fillStyle = '#00d4e8'; ctx.fillRect(0, H / 2 - 2, 46, 4); ctx.font = `${H * 0.72}px 'Share Tech Mono'`; ctx.textBaseline = 'middle'; ctx.fillText(EYEBROW[i], 62, H / 2 + 2); });
    eb.userData.redraw(); eb.material.uniforms.uGlow.value = -0.6; eb.position.set(-540, 395, 20); stations[i].add(eb);
    return { T, eb };
  });
  const landT = (i) => BEAT.st[i] + (i === 2 ? 0.0 : 0.0);
  tick.push((t) => titles.forEach(({ T, eb }, i) => {
    const t0 = landT(i) - 0.12 + (i === 2 ? 0.15 : 0);
    T.words.forEach((w, k) => {
      const tw = t0 + k * 0.07, e = p4o((t - tw) / 0.28);
      w.visible = t >= tw; w.position.y = w.userData.rest.y + (1 - e) * 70; w.position.z = (1 - e) * 60; w.rotation.x = (1 - e) * -0.5;
    });
    const e = p3o((t - t0) / 0.35); eb.visible = t >= t0; eb.material.uniforms.uOpacity.value = e; eb.position.x = -540 - (1 - e) * 40;
    if (i === 4) { const out = smooth(BEAT.lock - 0.1, BEAT.lock + 0.35, t); T.group.position.y = 300 + out * 260; T.group.visible = out < 0.99; eb.visible = eb.visible && out < 0.5; }
  }));

  // ---------- STACJA 1: storyboard – 3 karty wlatują z głębi, terminal pisze prompt ----------
  {
    const g = stations[0], L = BEAT.st[0];
    const cards = ['s0', 's3', 's5'].map((k, i) => { const c = card(images[k], 470); c.position.set(250 + i * 150, 120 - i * 130, -i * 40); g.add(c); return c; });
    const term = panel(900, 150, 1200, (ctx, W, H, txt, cur) => {
      bgCard(ctx, W, H); ctx.font = `${H * 0.2}px 'Share Tech Mono'`; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#00e8a2'; ctx.fillText('>', 34, H * 0.55); ctx.fillStyle = '#e8f6fa'; ctx.fillText(txt, 74, H * 0.55);
      if (cur) { const w = ctx.measureText(txt).width; ctx.fillStyle = '#00f0ff'; ctx.fillRect(80 + w, H * 0.38, H * 0.14, H * 0.34); }
    });
    term.position.set(-250, -290, 30); g.add(term);
    const PROMPT = 'ujęcie 1: kamera nurkuje między wieżowcami';
    tick.push((t) => {
      cards.forEach((c, i) => {
        const t0 = L + 0.18 + i * 0.16, e = p3o((t - t0) / 0.55);
        c.visible = t >= t0; c.position.z = -i * 40 - (1 - e) * 900; c.rotation.y = (1 - e) * -0.9 - 0.18; c.rotation.z = (1 - e) * 0.25 + (i - 1) * 0.04;
        c.material.uniforms.uOpacity.value = clamp(e * 1.4, 0, 1); c.material.uniforms.uGlow.value = 0.6 * Math.exp(-Math.max(0, t - t0 - 0.4) / 0.3);
      });
      const n = Math.floor(clamp((t - (L + 0.35)) / 1.9, 0, 1) * PROMPT.length);
      term.visible = t >= L + 0.2; term.material.uniforms.uOpacity.value = p3o((t - L - 0.2) / 0.3);
      term.userData.redraw(PROMPT.slice(0, n), Math.floor(t * 4) % 2 === 0 || n < PROMPT.length);
    });
  }

  // ---------- STACJA 2: każda karta wchodzi regułą, którą nazywa ----------
  {
    const g = stations[1], L = BEAT.st[1];
    const NAMES = ['waterfall-entry', 'spring-pop', 'chromatic-glitch', 'motion-blur'];
    const mk = (name, tint) => panel(420, 120, 840, (ctx, W, H) => {
      bgCard(ctx, W, H, tint); ctx.font = `600 ${H * 0.34}px 'Share Tech Mono'`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText(name, 34, H * 0.56);
    });
    const slots = [[180, 120], [640, 120], [180, -40], [640, -40]];
    const cardsR = NAMES.map((n, i) => { const c = mk(n, '#00d4e8'); c.userData.redraw(); c.position.set(slots[i][0], slots[i][1], 0); g.add(c); return c; });
    // kopie do glitcha (czerwona / cyjanowa) i ghosty do motion-blur
    const ghosts = [];
    const gl1 = mk(NAMES[2], '#ff4466'), gl2 = mk(NAMES[2], '#00f0ff'); [gl1, gl2].forEach((c, k) => { c.userData.redraw(); c.material.uniforms.uTint.value.set(k ? 0.2 : 1.4, k ? 1.2 : 0.3, k ? 1.4 : 0.4); c.position.set(slots[2][0], slots[2][1], -2); g.add(c); });
    for (let k = 0; k < 4; k++) { const c = mk(NAMES[3], '#00d4e8'); c.userData.redraw(); c.position.set(slots[3][0], slots[3][1], -3 - k); g.add(c); ghosts.push(c); }
    const term = panel(900, 150, 1200, (ctx, W, H, txt) => { bgCard(ctx, W, H, '#00e8a2'); ctx.font = `${H * 0.27}px 'Share Tech Mono'`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#00e8a2'; ctx.fillText('>', 34, H * 0.55); ctx.fillStyle = '#e8f6fa'; ctx.fillText(txt, 74, H * 0.55); });
    term.position.set(-250, -290, 30); g.add(term);
    tick.push((t) => {
      const T0 = L + 0.25, dt = 0.42;
      // waterfall: spada z góry, ostro osiada
      { const c = cardsR[0], e = p4o((t - T0) / 0.3); c.visible = t >= T0; c.position.y = slots[0][1] + (1 - e) * 420; c.material.uniforms.uOpacity.value = t >= T0 ? 1 : 0; }
      // spring-pop: skala 0 → 1 z gładkim osiadaniem
      { const c = cardsR[1], t0 = T0 + dt, e = p3o((t - t0) / 0.5); c.visible = t >= t0; c.scale.setScalar(Math.max(0.001, e)); }
      // chromatic-glitch: drgające kopie RGB, czyste wyostrzenie
      { const c = cardsR[2], t0 = T0 + 2 * dt, a = clamp(1 - (t - t0) / 0.45, 0, 1), st = Math.floor(t * 15);
        c.visible = t >= t0; [gl1, gl2].forEach((q, k) => { q.visible = t >= t0 && a > 0; q.material.uniforms.uOpacity.value = 0.7 * a;
          q.position.x = slots[2][0] + (hash(st * 13 + k * 7) * 2 - 1) * 40 * a; q.position.y = slots[2][1] + (hash(st * 29 + k) * 2 - 1) * 12 * a; }); }
      // motion-blur: wjeżdża z boku, smugi doganiają kartę
      { const t0 = T0 + 3 * dt, e = p3o((t - t0) / 0.38); const c = cardsR[3]; c.visible = t >= t0; c.position.x = slots[3][0] + (1 - e) * 900;
        ghosts.forEach((q, k) => { const ek = p3o((t - t0 + 0.035 * (k + 1)) / 0.38); q.visible = t >= t0 && e < 0.99; q.position.x = slots[3][0] + (1 - ek) * 900 + (k + 1) * 26 * (1 - e); q.material.uniforms.uOpacity.value = 0.32 / (k + 1); }); }
      const txt = '/hyperframes-animation';
      const n = Math.floor(clamp((t - (L + 0.3)) / 0.9, 0, 1) * txt.length);
      term.visible = t >= L + 0.2; term.material.uniforms.uOpacity.value = p3o((t - L - 0.2) / 0.3); term.userData.redraw(txt.slice(0, n));
    });
  }

  // ---------- STACJA 3: pole obrazków w przestrzeni, kamera przelatuje przez nie z beczką ----------
  const field = [];
  {
    const g = stations[2];
    const keys = ['s6', 's0', 's7', 's1', 's2', 's4', 'niebo', 'przepasc', 's3', 's5'];
    keys.forEach((k, i) => {
      const c = card(images[k], 520 + (i % 3) * 90);
      const a = (i / keys.length) * Math.PI * 2;
      c.position.set(lerp(-700, -100, i / 9) + Math.cos(a) * (560 + (i % 2) * 240), Math.sin(a) * 330, 3300 - i * 140);
      c.rotation.y = -Math.cos(a) * 0.5; c.rotation.z = (hash(i) - 0.5) * 0.2;
      g.add(c); field.push(c);
    });
    const hero = card(images.s6, 760); hero.position.set(330, 0, 0); g.add(hero); field.push(hero);
  }

  // ---------- STACJA 4: wstęga dźwięku i cięcia na beat ----------
  {
    const g = stations[3];
    const NS = 240, env4 = [];
    for (let i = 0; i < NS; i++) { const x = i / NS; env4.push(0.15 + 0.6 * Math.pow(Math.abs(Math.sin(x * Math.PI * 9)), 6) + 0.25 * hash(i * 3.1)); }
    const rib = new THREE.PlaneGeometry(1500, 1, NS - 1, 1); const ra = rib.attributes.position;
    for (let i = 0; i < NS; i++) { ra.setY(i, env4[i] * 120); ra.setY(i + NS, -env4[i] * 120); }
    const ribbon = new THREE.Mesh(rib, new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0.5, 0.62), transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ribbon.position.set(0, -250, -60); g.add(ribbon);
    const head = new THREE.Mesh(new THREE.PlaneGeometry(6, 330), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.6, 2.6) })); head.position.set(-750, -250, -50); g.add(head);
    const seq = ['s0', 's6', 's5', 's1', 's7'];
    const cut = card(images.s0, 720); cut.position.set(330, 80, 0); g.add(cut);
    tick.push((t) => {
      const L = BEAT.st[3];
      const f = clamp((t - L) / 3.0, 0, 1);
      ribbon.scale.x = Math.max(0.001, p3o((t - L + 0.1) / 0.6)); head.position.x = -750 + f * 1500;
      let k = 0; BEAT.s4beats.forEach((b, i) => { if (t >= b) k = i; });
      cut.material.uniforms.map.value = images[seq[k]];
      const lastB = BEAT.s4beats.filter((b) => t >= b).pop();
      const since = lastB === undefined ? 9 : t - lastB;
      cut.material.uniforms.uFlash.value = 0.55 * Math.exp(-since / 0.07);
      cut.scale.setScalar(1 + 0.05 * Math.exp(-since / 0.12));
      cut.visible = t >= L - 0.6; cut.material.uniforms.uOpacity.value = p3o((t - L + 0.3) / 0.4);
    });
  }

  // ---------- STACJA 5: terminal renderuje, klatki filmu wylatują jak taśma ----------
  const film = [];
  let cube;
  {
    const g = stations[4], L = BEAT.st[4];
    const term = panel(980, 300, 1300, (ctx, W, H, txt, pct) => {
      bgCard(ctx, W, H, '#00e8a2'); ctx.textBaseline = 'middle';
      ctx.font = `${H * 0.13}px 'Share Tech Mono'`; ctx.fillStyle = '#00e8a2'; ctx.fillText('$', 40, H * 0.3); ctx.fillStyle = '#e8f6fa'; ctx.fillText(txt, 84, H * 0.3);
      if (pct >= 0) {
        ctx.fillStyle = '#1a2a3a'; ctx.fillRect(40, H * 0.58, W - 80, H * 0.1);
        const gr = ctx.createLinearGradient(40, 0, W - 40, 0); gr.addColorStop(0, '#00d4e8'); gr.addColorStop(1, '#00e8a2');
        ctx.fillStyle = gr; ctx.fillRect(40, H * 0.58, (W - 80) * pct, H * 0.1);
        ctx.font = `${H * 0.11}px 'Share Tech Mono'`; ctx.fillStyle = '#b9c6d2'; ctx.fillText(`render  ${Math.round(pct * 930)}/930 kl.   ${Math.round(pct * 100)}%`, 40, H * 0.84);
      }
    });
    term.position.set(-120, -130, 0); g.add(term);
    const keys = ['s0', 's6', 's5', 's1', 's7', 's3', 's4', 's2', 'niebo', 'przepasc', 's0', 's6'];
    keys.forEach((k, i) => { const c = card(images[k], 200); c.visible = false; g.add(c); film.push(c); });
    cube = new THREE.Mesh(new THREE.BoxGeometry(80, 80, 80), new THREE.MeshStandardMaterial({ color: 0x0a1a1f, metalness: 0.4, roughness: 0.2, envMap: env, emissive: new THREE.Color(0x00e8c8), emissiveIntensity: 1.6 }));
    cube.visible = false; g.add(cube);
    const CMD = 'npx hyperframes render';
    tick.push((t) => {
      const n = Math.floor(clamp((t - (L + 0.15)) / 0.55, 0, 1) * CMD.length);
      const pct = t < L + 0.85 ? -1 : clamp((t - (L + 0.85)) / 1.7, 0, 1);
      term.visible = t >= L - 0.6 && t < BEAT.boom; term.material.uniforms.uOpacity.value = 1 - smooth(BEAT.lock + 0.2, BEAT.boom, t);
      term.userData.redraw(CMD.slice(0, n), pct);
      film.forEach((c, i) => {
        const t0 = L + 1.1 + i * 0.13, u = clamp((t - t0) / 1.4, 0, 1);
        // tor: z terminala w stronę kamery po łuku, potem (lockup) zassanie do sześcianu
        const out = new THREE.Vector3(lerp(200, 380 + (i % 4) * 120, p3o(u)), lerp(-130, 180 - (i % 3) * 150, p3o(u)), lerp(0, 380 + i * 20, p3o(u)));
        const k = p3io((t - BEAT.lock - i * 0.02) / 0.7);
        c.position.copy(out.lerp(new THREE.Vector3(0, 0, 60), k));
        c.rotation.set(0, (1 - u) * 1.2 + i * 0.1, (i % 3 - 1) * 0.25 * (1 - k));
        c.scale.setScalar(Math.max(0.001, 1 - k * 0.95));
        c.visible = t >= t0 && t < BEAT.boom; c.material.uniforms.uOpacity.value = clamp(u * 3, 0, 1);
      });
      // lockup: sześcian-bohater zasysa klatki, eksploduje na uderzenie
      const ck = p3o((t - BEAT.lock) / 0.5);
      cube.visible = t >= BEAT.lock; cube.position.set(0, 0, 60);
      cube.scale.setScalar(Math.max(0.001, ck * (1 + 0.35 * Math.exp(-Math.max(0, t - BEAT.boom) / 0.2)) * (t > BEAT.boom + 0.25 ? 0.001 : 1)));
      cube.rotation.set(t * 1.3, t * 1.7, 0);
      cube.material.emissiveIntensity = 1.6 + 6 * Math.exp(-Math.abs(t - BEAT.boom) / 0.12);
    });
  }

  // ---------- LOCKUP: napis końcowy ----------
  const LOCK = text3D(font, ['Odjechane animacje', 'w Claude Code'], { size: 78, depth: 12, env, align: 'center', accent: ['Claude', 'Code'] });
  LOCK.group.position.set(0, 90, 120); stations[4].add(LOCK.group);
  // logo DBest (przezroczysty PNG z 07-MEDIA/daniel-branding) – kolory marki bez tonowania, rozmiar ~natywny w kadrze
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(300, 197), new THREE.MeshBasicMaterial({ map: images.logo, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  logo.position.set(0, -190, 130); stations[4].add(logo);
  const logoGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(128, 'rgba(0,150,255,0.9)'), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
  logoGlow.scale.set(520, 340, 1); logoGlow.position.set(0, -190, 110); stations[4].add(logoGlow);
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 2.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  shock.position.set(0, 0, 70); stations[4].add(shock);
  tick.push((t) => {
    const B = BEAT.boom;
    LOCK.words.forEach((w, i) => { const tw = B + 0.05 + i * 0.07, e = p4o((t - tw) / 0.35); w.visible = t >= tw; w.position.z = w.userData.rest.z + (1 - e) * -260; w.scale.setScalar(Math.max(0.001, lerp(0.4, 1, e))); });
    // logo jest w warstwie HTML nad sceną (index.html #logo) – bez bloomu i gradingu, w kolorach marki
    logo.visible = false; logoGlow.visible = false;
    const s = clamp((t - B) / 0.7, 0, 1); shock.visible = t >= B && s < 1; shock.scale.setScalar(20 + p3o(s) * 1400); shock.material.opacity = 1 - s;
  });

  // ---------- KAMERA: czysta funkcja czasu ----------
  const vsPose = (t) => ({ pos: new THREE.Vector3(0, -40, lerp(1250, 1050, smooth(BEAT.vs, BEAT.dive, t))), look: new THREE.Vector3(0, -60, 0) });
  const tmp = new THREE.Vector3();
  function cameraAt(t) {
    // przed pierwszym lotem: plansza VS
    if (t < BEAT.dive) return { ...vsPose(t), roll: 0, blur: 0 };
    // lot z VS do stacji 1 (przez szczelinę między literami)
    if (t < BEAT.st[0]) {
      const p = (t - BEAT.dive) / (BEAT.st[0] - BEAT.dive), e = p3io(p), a = vsPose(BEAT.dive), b = restPose(0);
      return { pos: a.pos.clone().lerp(b.pos, e), look: a.look.clone().lerp(b.look, e), roll: Math.sin(Math.PI * p) * 0.12, blur: Math.sin(Math.PI * p) };
    }
    for (let i = 0; i < 5; i++) {
      const L = BEAT.st[i], next = i < 4 ? BEAT.st[i + 1] - BEAT.travel[i + 1] : BEAT.end;
      if (t < next) {
        const hold = clamp((t - L) / (next - L), 0, 1);
        const r = restPose(i, 160 * smooth(0, 1, hold));                     // wolny najazd na stacji
        if (i === 4 && t >= BEAT.lock) r.pos.lerp(restPose(4, 420).pos, p3io((t - BEAT.lock) / 0.75));
        return { pos: r.pos, look: r.look, roll: 0, blur: 0 };
      }
      // lot na stację i+1
      const L1 = BEAT.st[i + 1], T0 = L1 - BEAT.travel[i + 1];
      if (t < L1) {
        const p = (t - T0) / BEAT.travel[i + 1], e = p3io(p), a = restPose(i, 160), b = restPose(i + 1);
        const pos = a.pos.clone().lerp(b.pos, e), look = a.look.clone().lerp(b.look, e);
        pos.y += Math.sin(Math.PI * p) * 160;                                   // łuk lotu
        let roll = Math.sin(Math.PI * p) * 0.18 * (i % 2 ? -1 : 1);
        if (i + 1 === 2) {                                                     // stacja 3: przelot przez pole obrazków z beczką
          const g = stations[2];
          const path = [a.pos, g.localToWorld(tmp.set(-650, 60, 3200)).clone(), g.localToWorld(tmp.set(-250, -40, 2200)).clone(), b.pos];
          const cr = new THREE.CatmullRomCurve3(path); pos.copy(cr.getPoint(e));
          look.copy(cr.getPoint(Math.min(1, e + 0.08))).lerp(b.look, smooth(0.6, 1, p));
          roll = p3io(clamp((p - 0.15) / 0.7, 0, 1)) * Math.PI * 2;
        }
        return { pos, look, roll, blur: Math.sin(Math.PI * p) * (i + 1 === 2 ? 1.3 : 1) };
      }
    }
    return { ...restPose(4), roll: 0, blur: 0 };
  }

  function update(t, cam) {
    tick.forEach((f) => f(t));
    refreshPanels();
    const c = cameraAt(t), hh = handheld(t, 2.2);
    cam.position.copy(c.pos); cam.position.x += hh.x * 2; cam.position.y += hh.y * 2;
    cam.lookAt(c.look); cam.rotateZ(c.roll + hh.r);
    // drgnięcie przy lądowaniach i przy „VS”
    [BEAT.vs, ...BEAT.st, BEAT.boom].forEach((L, i) => { const u = t - L; if (u >= 0 && u < 0.35) { const k = Math.exp(-u / 0.07) * (i === 0 || L === BEAT.boom ? 9 : 5); cam.position.x += k * Math.sin(u * 170); cam.position.y += k * 0.7 * Math.sin(u * 130 + 1); } });
    return c;
  }
  return { update, BEAT };
}
