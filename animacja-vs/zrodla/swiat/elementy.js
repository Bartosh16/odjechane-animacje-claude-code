// Klocki sceny: litery 3D, karty-obrazki, panele z tekstem, środowisko do odbić metalu.
import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export async function loadFont(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  return new Font(new TTFLoader().parse(buf));
}

// Środowisko do odbić: ciemny pokój z pasami światła cyan / biel / mięta (bez HDRI z sieci)
export function makeEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.004, 0.008, 0.014);
  const strip = (w, h, col, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry; s.add(m);
  };
  strip(14, 1.2, new THREE.Color(0, 2.2, 2.6), 0, 6, -8);
  strip(2, 10, new THREE.Color(2.5, 2.7, 2.8), -9, 1, -2, Math.PI / 2.5);
  strip(2, 10, new THREE.Color(0, 1.8, 1.2), 9, 0, -3, -Math.PI / 2.5);
  strip(20, 0.6, new THREE.Color(0, 1.2, 1.5), 0, -5, 4);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.02);
  pm.dispose();
  return rt.texture;
}

// Napis 3D: każde słowo osobną bryłą (do waterfall-entry w przestrzeni). Zwraca grupę i listę słów.
export function text3D(font, lines, { size = 60, depth = 10, env, accent = [], lineGap = 1.18, align = 'left', metal = 0x9fb3c2 } = {}) {
  const group = new THREE.Group(), words = [];
  const matMetal = new THREE.MeshStandardMaterial({ color: metal, metalness: 0.55, roughness: 0.32, envMap: env, envMapIntensity: 1.7, emissive: new THREE.Color(0x24414f), emissiveIntensity: 0.55 });
  const matAccent = new THREE.MeshStandardMaterial({ color: 0x00d4e8, metalness: 0.6, roughness: 0.3, envMap: env, envMapIntensity: 1.0, emissive: new THREE.Color(0x00d4e8), emissiveIntensity: 0.55 });
  const space = size * 0.32;
  let maxW = 0;
  const built = lines.map((line, li) => {
    let x = 0; const row = [];
    line.split(' ').forEach((w) => {
      const g = new TextGeometry(w, { font, size, depth, curveSegments: 6, bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: size * 0.025, bevelSegments: 3 });
      g.computeBoundingBox();
      const bw = g.boundingBox.max.x - g.boundingBox.min.x;
      const m = new THREE.Mesh(g, accent.includes(w) ? matAccent : matMetal);
      m.userData = { x, y: -li * size * lineGap, w: bw };
      row.push(m); x += bw + space;
    });
    maxW = Math.max(maxW, x - space);
    return { row, w: x - space };
  });
  built.forEach(({ row, w }) => row.forEach((m) => {
    const ox = align === 'center' ? -w / 2 : 0;
    m.position.set(m.userData.x + ox, m.userData.y, 0); m.userData.rest = m.position.clone();
    group.add(m); words.push(m);
  }));
  group.userData = { width: maxW, height: lines.length * size * lineGap };
  return { group, words };
}

// Karta-obrazek: zaokrąglone rogi (SDF), cyjanowa ramka, błysk, przezroczystość – jeden shader
const CARD_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
const CARD_FS = `
  uniform sampler2D map; uniform float uOpacity, uFlash, uGlow, uAspect, uR; uniform vec3 uTint; varying vec2 vUv;
  float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
  void main(){
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = sdRound(p, vec2(uAspect*0.5, 0.5), uR);
    float a = 1.0 - smoothstep(-0.004, 0.002, d);
    float edge = exp(-abs(d) * 160.0);
    vec3 col = texture2D(map, vUv).rgb * uTint;
    col += vec3(0.0, 0.83, 0.91) * edge * (0.6 + uGlow) + uFlash;
    gl_FragColor = vec4(col, a * uOpacity);
    #include <colorspace_fragment>
  }`;
export function card(tex, w, h = w * 9 / 16, { r = 0.035 } = {}) {
  const mat = new THREE.ShaderMaterial({ vertexShader: CARD_VS, fragmentShader: CARD_FS, transparent: true, depthWrite: false,
    uniforms: { map: { value: tex }, uOpacity: { value: 1 }, uFlash: { value: 0 }, uGlow: { value: 0 }, uAspect: { value: w / h }, uR: { value: r }, uTint: { value: new THREE.Color(1, 1, 1) } } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}

// Panel z tekstem rysowanym na canvasie (terminal, etykiety, nazwy reguł) – redraw(fn) co klatkę
export function panel(w, h, pxW = 1024, draw) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = Math.round(pxW * h / w);
  // willReadFrequently = kanwa w pamięci RAM, nie na GPU: Chrome jej nie wyczyści pod presją pamięci karty
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const m = card(tex, w, h, { r: 0.02 });
  // wysyłka do GPU tylko gdy treść się zmieniła (ciągłe re-uploady zapychały pamięć karty)
  m.userData.redraw = (...a) => {
    const key = JSON.stringify(a);
    if (key === m.userData.key) return;
    m.userData.key = key; ctx.clearRect(0, 0, c.width, c.height); draw(ctx, c.width, c.height, ...a); tex.needsUpdate = true;
  };
  return m;
}

export function refreshPanels() {}

// Tło terminala/karty w stylu DBest (ciemna karta, linie T1 bez kratki)
export function bgCard(ctx, W, H, accent = '#00d4e8') {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0f1520'); g.addColorStop(1, '#0a121c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const ys = [18, 54, 99, 127, 183, 214, 262, 331, 359, 404, 466, 497, 549, 612, 641, 706, 738, 796, 842, 879];
  ys.forEach((y, i) => { ctx.fillStyle = i % 7 === 2 ? 'rgba(0,212,232,.07)' : 'rgba(255,255,255,.035)'; ctx.fillRect(0, (y * H) / 920, W, 1); });
  ctx.fillStyle = accent; ctx.fillRect(0, 0, W, Math.max(4, H * 0.012));
}

export function rect(x, y, w, h) { return { x, y, w, h }; }
