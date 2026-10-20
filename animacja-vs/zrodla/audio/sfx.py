"""Efekty dźwiękowe animacji VS – synteza w numpy (zero sampli, zero licencji) + miks z muzyką, jeśli jest.

Czasy z tabeli BEAT w swiat/sekwencja.js (trzymaj obie w zgodzie).
Wyjście: audio/sfx.wav (same efekty) i audio/audio.wav (efekty + muzyka z ../../assety/muzyka.*, jeśli istnieje).
"""
import wave, subprocess
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent.parent / 'assety'
SR, DUR = 48000, 31.0
N = int(SR * DUR)
rng = np.random.default_rng(31)
L = np.zeros(N); R = np.zeros(N)

BEAT = dict(vs=6.2, vsSub=7.0, flare=7.7, dive=9.55, st=[10.0, 13.5, 17.0, 20.5, 24.0], travel=[0.5, 0.6, 1.25, 0.6, 0.6],
            s4beats=[21.0, 21.5, 22.0, 22.5, 23.0], lock=28.0, boom=28.75)


def t_(n): return np.arange(n) / SR
def flt(x, kind, f, o=2): return sosfilt(butter(o, f, btype=kind, fs=SR, output='sos'), x)
def noise(sec): return rng.standard_normal(int(sec * SR))


def add(sig, at, db=0.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N: return
    sig = sig[:N - i] * 10 ** (db / 20)
    a = (pan + 1) * np.pi / 4
    L[i:i + len(sig)] += sig * np.cos(a); R[i:i + len(sig)] += sig * np.sin(a)


def bell(f, sec=1.2):
    t = t_(int(sec * SR)); return sum(np.sin(2 * np.pi * f * k * t) / k ** 1.5 for k in (1, 2.0, 3.01)) * np.exp(-t / 0.35) * 0.3


def click(f=3000, sec=0.02):
    t = t_(int(sec * SR)); return (flt(noise(sec), 'bandpass', [f * 0.6, f * 1.6]) * np.exp(-t / 0.004))


def whoosh(sec=0.8, lo=300, hi=5000):
    n = int(sec * SR); x = noise(sec)[:n]; t = t_(n); out = np.zeros(n)
    for i in range(0, n, 512):
        p = i / n; fc = lo + (hi - lo) * np.sin(np.pi * p)
        out[i:i + 512] = flt(x[i:i + 512], 'bandpass', [fc * 0.6, min(fc * 1.6, 20000)], 1)
    return out * np.sin(np.pi * t / sec) ** 2 * 0.8


def impact(big=False):
    sec = 2.2 if big else 1.0; t = t_(int(sec * SR))
    sub = np.sin(2 * np.pi * (34 + 60 * np.exp(-t / 0.06)) * t) * np.exp(-t / (0.8 if big else 0.35))
    crack = flt(noise(sec)[:len(t)], 'lowpass', 6000) * np.exp(-t / 0.04) * 0.6
    return np.tanh((sub + crack) * 1.4)


def braam(sec=2.6):
    t = t_(int(sec * SR)); x = np.zeros_like(t)
    for f, a in ((55, 1), (82.4, 0.6), (110, 0.7), (164.8, 0.35)):
        for d in (-0.004, 0.0, 0.005):
            x += a * (2 * ((t * f * (1 + d)) % 1) - 1)
    env = np.minimum(1, t / 0.03) * np.exp(-t / 1.1)
    out = np.zeros_like(x); blk = 1024
    for i in range(0, len(x), blk):                      # filtr otwiera się i zamyka jak w trailerze
        fc = 300 + 2600 * np.exp(-(i / SR) / 0.5)
        out[i:i + blk] = flt(x[i:i + blk], 'lowpass', fc, 2)
    imp = impact(True); n = min(len(t), len(imp)); res = np.tanh(out * env * 0.5); res[:n] += imp[:n] * 0.7
    return res


def riser(sec, lo=200, hi=8000):
    n = int(sec * SR); x = noise(sec)[:n]; out = np.zeros(n)
    for i in range(0, n, 1024):
        fc = lo * (hi / lo) ** (i / n); out[i:i + 1024] = flt(x[i:i + 1024], 'bandpass', [fc * 0.7, min(fc * 1.4, 20000)], 1)
    return out * (t_(n) / sec) ** 2


def glitch(sec=0.45):
    n = int(sec * SR); out = np.zeros(n); step = int(0.03 * SR)
    for i in range(0, n, step):
        f = 200 + rng.random() * 3000; tt = t_(min(step, n - i))
        seg = np.sign(np.sin(2 * np.pi * f * tt)) * (rng.random() > 0.3)
        out[i:i + len(tt)] = np.round(seg * 4) / 4 * (0.3 + rng.random() * 0.7)
    return out * 0.5


def zip_down(sec=0.15):
    t = t_(int(sec * SR)); f = 4000 * np.exp(-t / 0.04) + 60
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * 0.6


def boing(f=520, sec=0.35):
    t = t_(int(sec * SR)); fm = f * (1 + 0.6 * np.exp(-t / 0.05))
    return np.sin(2 * np.pi * np.cumsum(fm) / SR) * np.exp(-t / 0.09) * 0.5


def hum(sec):
    t = t_(int(sec * SR)); f = 90 + 300 * (t / sec) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * (t / sec) * 0.25


# ---------------- typowa animacja: grzeczne dingi pod karty ----------------
for k, at in enumerate((1.0, 1.5, 2.0, 2.5)):
    add(bell(1046.5 * (1 + 0.06 * k), 0.8), at, -20)
for i in range(30):
    add(click(4200, 0.012), 3.4 + i * 0.04, -30)
# ---------------- przejście ----------------
add(glitch(0.45), 5.0, -12)
add(zip_down(), 5.43, -10)
for i in range(17):
    add(click(2600 + (i % 3) * 400, 0.025), 5.66 + i * 0.02, -14, (i % 2) * 0.3 - 0.15)
add(click(1400, 0.06), 6.04, -8)
# ---------------- plansza VS ----------------
add(riser(0.45, 400, 9000), 5.75, -16)
add(braam(), BEAT['vs'], -3)
for i in range(8):
    add(whoosh(0.18, 1500, 6000), BEAT['vsSub'] + i * 0.075, -24, (i - 4) * 0.1)
add(whoosh(1.1, 2000, 12000), BEAT['flare'], -18, 0.0)
add(riser(0.5), BEAT['dive'] - 0.05, -12)
# ---------------- stacje ----------------
for i, Lt in enumerate(BEAT['st']):
    tr = BEAT['travel'][i]
    add(whoosh(tr + 0.1), Lt - tr, -9 if i != 2 else -6, 0.4 if i % 2 else -0.4)
    add(impact(big=(i in (0, 2))), Lt, -9 if i in (0, 2) else -13)
# stacja 1: stuk kart + klawiatura promptu
for i in range(3):
    add(whoosh(0.35, 800, 4000), BEAT['st'][0] + 0.18 + i * 0.16, -20, 0.3)
for i in range(40):
    add(click(3000, 0.015), BEAT['st'][0] + 0.35 + i * 0.047, -28)
# stacja 2: każda reguła ma swój dźwięk
T0 = BEAT['st'][1] + 0.25
add(impact()[:int(0.25 * SR)], T0 + 0.22, -16)          # waterfall – stuk o „podłogę”
add(boing(), T0 + 0.42, -16)                             # spring-pop
add(glitch(0.4), T0 + 0.84, -18)                         # chromatic-glitch
add(whoosh(0.4, 1000, 9000), T0 + 1.26, -14, 0.6)       # motion-blur
# stacja 4: cięcia na beat
for b in BEAT['s4beats']:
    add(impact()[:int(0.4 * SR)], b, -12)
# stacja 5: komenda, buczenie renderu, ding na 100%, wylatująca taśma
L5 = BEAT['st'][4]
for i in range(22):
    add(click(2800, 0.02), L5 + 0.15 + i * 0.025, -24)
add(hum(1.7), L5 + 0.85, -16)
add(bell(1568, 1.0), L5 + 2.55, -14)
for i in range(12):
    add(whoosh(0.25, 1200, 7000), L5 + 1.1 + i * 0.13, -26, (i % 2) * 0.8 - 0.4)
# ---------------- lockup ----------------
add(riser(BEAT['boom'] - BEAT['lock'], 300, 12000) [::-1][::-1], BEAT['lock'], -10)
add(impact(True), BEAT['boom'], -3)
add(braam(2.2), BEAT['boom'], -9)
add(whoosh(1.4, 3000, 14000), BEAT['boom'] + 0.05, -20)

sfx = np.stack([L, R], 1)
sfx /= max(1e-9, np.abs(sfx).max()); sfx *= 0.7

def write(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

write(HERE / 'sfx.wav', sfx)
mix = sfx.copy()
src = next((p for p in (ASSETS / 'muzyka.wav', ASSETS / 'muzyka.mp3') if p.exists()), None)
if src:
    tmp = HERE / '_muzyka48k.wav'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-ac', '2', '-ar', str(SR), '-t', str(DUR), str(tmp)], check=True)
    with wave.open(str(tmp)) as w:
        m = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2).astype(float) / 32768
    mm = np.zeros_like(mix); mm[:len(m)] = m[:N]
    mm[:int(6.0 * SR)] *= 0.0                              # muzyka wchodzi dopiero z „VS” (pod typową – cisza i dingi)
    mix = mm * 0.85 + sfx * 0.55
    mix /= max(1e-9, np.abs(mix).max()); mix *= 0.89
fade = int(0.3 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
write(HERE / 'audio.wav', mix)
print('sfx.wav + audio.wav', 'z muzyką' if src else 'bez muzyki')
