r"""Przykłady reguł ruchu do filmu „Odjechane animacje w Claude Code”: lewa połowa PowerPoint, prawa reguła.

Użycie (PowerShell, w tym folderze):
  python buduj.py                       # wszystkie 5 klipów do render\
  python buduj.py chromatic-glitch      # jeden klip
  python buduj.py motion-blur --zrzuty 1.1,1.3,2.5   # tylko klatki kontrolne

Dźwięki z ../plansze-yt/buduj.py (HyperFrames 0.8.140, bez WebGL).
"""
import importlib.util, sys, shutil, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import narzedzia as nz  # noqa: E402

_spec = importlib.util.spec_from_file_location('plansze_buduj', HERE.parent / 'plansze-yt' / 'buduj.py')
_pl = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_pl)
whoosh, tick, thump, peak, bp, SR, rng = _pl.whoosh, _pl.tick, _pl.thump, _pl.peak, _pl.bp, _pl.SR, _pl.rng

OUT = HERE / 'render'
T0, F = 0.9, 1 / 30

RULES = {
    'waterfall-entry': (3.4, 'Słowa wskakują od dołu jedno po drugim, z zakładką na jedną klatkę'),
    'spring-pop': (3.4, 'Element rośnie od zera i osiada – gładko, bez cyrkowego odbicia'),
    'chromatic-glitch': (4.2, 'Kolory RGB się rozszczepiają, drgają i ostrzą w ułamku sekundy'),
    'motion-blur': (3.4, 'Rozmycie w kierunku ruchu, największe przy najwyższej prędkości'),
    '3d-camera-flight': (5.6, 'Kamera leci przez świat, zamiast przełączać slajdy'),
}


def noise_burst(sec, lo=2500, hi=9000):
    n = int(sec * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), lo, hi) * np.exp(-t / (sec / 4))


def sfx(rule, dur, path):
    n = int(dur * SR) + 1; out = np.zeros(n)
    def put(sig, at):
        i = int(max(0, at) * SR)
        if i < n: out[i:i + len(sig)] += sig[:n - i]
    if rule == 'waterfall-entry':
        t, words = T0, 4
        for i in range(words):
            put(peak(tick(1150 + 120 * i), -28), t)
            t += (0.2 if i == 0 else 0.18 if i == words - 1 else 0.15) - F
    if rule == 'spring-pop':
        for i in range(3):
            put(peak(thump(), -27), T0 + i * 0.07); put(peak(tick(1500 + 150 * i), -30), T0 + 0.04 + i * 0.07)
    if rule == 'chromatic-glitch':
        for t, d, db in ((T0, 0.55, -24), (T0 + 1.9, 0.4, -27)):
            g = noise_burst(d) * (np.sign(np.sin(2 * np.pi * 15 * np.arange(int(d * SR)) / SR)) * 0.5 + 0.5)
            put(peak(g, db), t); put(peak(thump(), db + 2), t + d - 0.05)
    if rule == 'motion-blur':
        w = whoosh(0.7); w = w * np.linspace(1, 0.2, len(w))       # najgłośniej na starcie, gdzie prędkość jest największa
        put(peak(w, -24), T0 - 0.05); put(peak(thump(), -26), T0 + 0.62)
    if rule == '3d-camera-flight':
        for k in range(2):
            put(peak(whoosh(1.05 * 0.7 + 0.15), -25), T0 + 1.0 + k * 1.5 - 0.05); put(peak(thump(), -27), T0 + 1.0 + k * 1.5 + 0.95)
    pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def build(rule, zrzuty=None):
    dur, desc = RULES[rule]
    name = f'regula-{rule}'
    out = nz.project_dir(name)
    nz.copy_fonts(out / 'assets', {'Oxanium-Bold.ttf', 'Exo2.ttf', 'ShareTechMono.ttf'})
    shutil.copy(nz.gsap(), out / 'assets' / 'gsap.min.js')
    sfx(rule, dur, out / 'assets' / 'sfx.wav')
    html = (HERE / 'szablon.html').read_text(encoding='utf-8')
    html = html.replace('__RULE__', rule).replace('__DESC__', desc).replace('__DUR__', f'{dur:.2f}').replace('__ID__', name)
    (out / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    if zrzuty:
        nz.npx(['snapshot', '--at', zrzuty], out)
        print('zrzuty:', out / 'snapshots')
        return True
    return nz.render(out, OUT / f'{name}.mp4')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    zrzuty = sys.argv[sys.argv.index('--zrzuty') + 1] if '--zrzuty' in sys.argv else None
    if zrzuty in args:
        args.remove(zrzuty)
    rules = args or list(RULES)
    bad = [r for r in rules if not build(r, zrzuty)]
    if bad:
        sys.exit('nieudane: ' + ', '.join(bad))


if __name__ == '__main__':
    main()
