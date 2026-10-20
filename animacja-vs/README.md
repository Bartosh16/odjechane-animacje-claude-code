# Animacja VS

31 sekund, 1920×1080, 30 kl./s. Pierwsze 5 sekund to animacja, którą agent zrobił z jednego zdania (bez skilli i bez marki). Potem glitch, terminal „zrób to porządnie”, kinowa plansza „VS” i 5 tez w przestrzeni 3D, przez którą leci kamera. Na końcu logo.

## Struktura

- `typowa-animacja/animacja.html` – wynik czystego prompta, bez poprawek. `zrodla/typowa.py` renderuje go do `assety/typowa.mp4`.
- `zrodla/index.html` – kompozycja HyperFrames: wideo typowej animacji, przejście, warstwa Three.js, logo.
- `zrodla/swiat/` – świat 3D: `wspolne.js` (renderer, postprocess: bloom, aberracja, winieta, ziarno), `elementy.js` (litery 3D, karty, panele), `sekwencja.js` (tabela czasów `BEAT`, stacje tez, kamera jako funkcja czasu).
- `zrodla/audio/sfx.py` – efekty dźwiękowe syntezowane w numpy według tej samej tabeli czasów.
- `assety/tex/` – tła i obrazki (wygenerowane w Higgsfield, tylko jako materiał – cały ruch robi kod).

## Komendy

```bash
cd zrodla
python buduj.py check
python buduj.py snapshot 7,12,29.5
python buduj.py render
```

Wynik: `render/vs-animacja.mp4`.

## Muzyka

Wrzuć `assety/muzyka.mp3` albo `muzyka.wav` i uruchom render. `audio/sfx.py` zmiksuje muzykę z efektami: muzyka wchodzi z planszą „VS”, efekty idą ciszej. Potrzebny `ffmpeg` w PATH.

## Pułapki, które już kosztowały czas

- Render na jednym workerze. Dwie sceny WebGL z postprocesem naraz gubią kontekst GPU i wychodzą białe klatki.
- Przed renderem miej kilka GB wolnego RAM-u. Przy ok. 2 GB wolnej pamięci render dawał biały film albo padał enkoder.
- Tekstury ładuj przez `loadTex` w JS, nie przez ukryte `<img>` – inaczej przeglądarka silnika kończy się na `ERR_INSUFFICIENT_RESOURCES`.
- Logo jest warstwą HTML, nie teksturą 3D. Bloom wypierał jego kolory.
