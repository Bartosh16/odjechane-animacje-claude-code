r"""Plansze DBest na YouTube – lekki szablon: spec.json -> MP4 z przelotami kamery i delikatnymi dźwiękami.

Użycie (PowerShell):
  python buduj.py przyklad\spec.json            # render do przyklad\<nazwa>.mp4
  python buduj.py przyklad\spec.json --zrzuty 1.5,8,20   # tylko klatki kontrolne

Typy plansz: teza, lista, liczba, porownanie, kroki, cytat (pola – patrz README.md).
Bez Three.js i bez WebGL: render ok. 1 min na 20 s filmu, stabilny przy małej ilości RAM.
"""
import json, sys, shutil, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import narzedzia as nz  # noqa: E402

SR = 48000
TR = 0.62                                         # czas przelotu kamery (zgodny z szablon.html)
rng = np.random.default_rng(5)


def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='bandpass', fs=SR, output='sos'), x)
def peak(x, db): return x / (np.abs(x).max() or 1) * 10 ** (db / 20)


def whoosh(sec):
    n = int(sec * SR); t = np.arange(n) / SR; x = rng.standard_normal(n); out = np.zeros(n)
    for i in range(0, n, 512):
        fc = 450 + 3200 * np.sin(np.pi * i / n); out[i:i + 512] = bp(x[i:i + 512], fc * 0.6, fc * 1.6)
    return out * np.sin(np.pi * t / sec) ** 2


def tick(f=1300):
    t = np.arange(int(0.05 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t / 0.011)


def thump():
    t = np.arange(int(0.35 * SR)) / SR
    return np.sin(2 * np.pi * (58 + 70 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.1) + bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.005) * 0.25


def sfx(spec, dur, path):
    n = int(dur * SR) + 1; out = np.zeros(n)
    def put(sig, at):
        i = int(max(0, at) * SR)
        if i < n: out[i:i + len(sig)] += sig[:n - i]
    for i, p in enumerate(spec['plansze']):
        L = p['t']
        if i: put(peak(whoosh(TR + 0.1), -26), L - TR)
        if p['typ'] in ('teza', 'cytat'): put(peak(thump(), -22), L + 0.05)
        if p['typ'] == 'lista':
            for j, q in enumerate(p['punkty']):
                put(peak(tick(1450 if q.get('ikona') == 'ok' else 1100 if q.get('ikona') == 'no' else 1250), -28), q.get('t', L - 0.22 + 0.7 + j * p.get('odstep', 0.55)))
        if p['typ'] == 'liczba':
            for k in range(18): put(peak(tick(1500 + k * 50), -32), L + 0.03 + k * 0.06)
        if p['typ'] == 'porownanie':
            for j in range(2): put(peak(whoosh(0.4), -30), L - 0.22 + 0.6 + j * p.get('odstep', 1.2))
        if p['typ'] == 'kroki':
            for j in range(len(p['kroki'])): put(peak(tick(1250 + j * 90), -28), L - 0.22 + 0.6 + j * p.get('odstep', 0.45))
    pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main():
    spec_path = Path(sys.argv[1]).resolve()
    spec = json.loads(spec_path.read_text(encoding='utf-8'))
    name = spec.get('nazwa', spec_path.parent.name)
    dur = spec.get('dur') or round(spec['plansze'][-1]['t'] + 4.0, 2)
    out = nz.project_dir(f'plansze-{name}')
    nz.copy_fonts(out / 'assets', {'Oxanium-Bold.ttf', 'Exo2.ttf', 'ShareTechMono.ttf'})
    shutil.copy(nz.gsap(), out / 'assets' / 'gsap.min.js')
    sfx(spec, dur, out / 'assets' / 'sfx.wav')
    data = dict(spec); data['dur'] = dur
    html = (HERE / 'szablon.html').read_text(encoding='utf-8')
    html = html.replace('__DATA__', json.dumps(data, ensure_ascii=False)).replace('__DUR__', f'{dur:.2f}').replace('__ID__', name)
    (out / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    if '--zrzuty' in sys.argv:
        nz.npx(['snapshot', '--at', sys.argv[sys.argv.index('--zrzuty') + 1]], out)
        print('zrzuty:', out / 'snapshots')
        return
    if not nz.render(out, spec_path.parent / f'{name}.mp4'):
        sys.exit(1)
    shutil.copy(out / 'assets' / 'sfx.wav', spec_path.parent / f'{name}.sfx.wav')


if __name__ == '__main__':
    main()
