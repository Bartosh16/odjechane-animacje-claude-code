// Wspólne narzędzia świata: deterministyczny PRNG, tekstury z <img>, postprocess „kinowy”.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const W = 1920, H = 1080, FPS = 30;
export const CYAN = new THREE.Color('#00d4e8'), CYAN2 = new THREE.Color('#00f0ff'), MINT = new THREE.Color('#00e8a2'),
  NAVY = new THREE.Color('#0a0d12'), PINK = new THREE.Color('#ff4466');

// mulberry32 – ten sam seed, ten sam świat w każdej klatce i każdym renderze
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Tekstury z elementów <img> wczytanych przez stronę (render nie czeka na fetch z JS)
export function texFromImg(id, { repeat = null, srgb = true } = {}) {
  const img = document.getElementById(id);
  const t = new THREE.Texture(img);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.needsUpdate = true;
  return t;
}
export async function loadTex(url, { srgb = true } = {}) {
  const t = await new THREE.TextureLoader().loadAsync(url);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  return t;
}
export async function imagesReady(ids) {
  await Promise.all(ids.map((id) => { const im = document.getElementById(id); return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); }));
}

// Miękki sprite (radialny gradient) z canvasa – cząsteczki, mgła, poświaty
export function softSprite(size = 128, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Końcowy grading: aberracja, winieta, ziarno (deterministyczne z numeru klatki), granat w cieniach, cyan w światłach
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uFrame: { value: 0 }, uAberr: { value: 0.0018 }, uVign: { value: 0.42 }, uGrain: { value: 0.045 }, uFlash: { value: 0 }, uLift: { value: new THREE.Color(0.012, 0.022, 0.04) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFrame, uAberr, uVign, uGrain, uFlash; uniform vec3 uLift; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uFrame*0.6180339) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r = length(c);
      vec2 off = c * uAberr * (1.0 + 2.0*r);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float lum = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(col, col * vec3(0.86,1.02,1.10), smoothstep(0.35, 1.0, lum));      // cyan w światłach
      col = col + uLift * (1.0 - smoothstep(0.0, 0.25, lum));                         // granat w cieniach
      col *= 1.0 - uVign * smoothstep(0.25, 0.85, r);
      col += (h(vUv*vec2(1920.,1080.)) - 0.5) * uGrain;
      col += uFlash;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setPixelRatio(1); r.setSize(W, H, false);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.9;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

export function makeComposer(renderer, scene, camera, { bloom = 0.85, radius = 0.55, threshold = 0.6 } = {}) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 2 });   // 2 zamiast 4: mniej pamięci GPU/RAM przy renderze
  const comp = new EffectComposer(renderer, rt);
  comp.setPixelRatio(1); comp.setSize(W, H);
  const rp = new RenderPass(scene, camera); comp.addPass(rp);
  const bp = new UnrealBloomPass(new THREE.Vector2(W, H), bloom, radius, threshold); comp.addPass(bp);
  const out = new OutputPass(); comp.addPass(out);
  const grade = new ShaderPass(GradeShader); comp.addPass(grade);
  return { comp, bloom: bp, grade, renderPass: rp };
}

// Kamera „z ręki”: deterministyczne, wolne drganie (suma sinusów o niewspółmiernych częstotliwościach)
export function handheld(t, amp = 1) {
  return {
    x: amp * (0.6 * Math.sin(t * 1.7) + 0.3 * Math.sin(t * 3.1 + 1.3)),
    y: amp * (0.5 * Math.sin(t * 1.3 + 0.7) + 0.25 * Math.sin(t * 2.7 + 2.1)),
    r: amp * 0.004 * Math.sin(t * 1.1 + 0.4),
  };
}
