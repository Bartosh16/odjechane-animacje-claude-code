# Odjechane animacje w Claude Code

Materiały z filmu na kanale „Daniel Bartosiewicz – Content i Automatyzacja”: szablony i projekty animacji, które Claude Code zbudował na skillach HyperFrames. Wszystko renderuje się z HTML-a do MP4, klatka po klatce, bez After Effects.

## Najpierw skille HyperFrames

Skille, o których mówię w filmie (`/hyperframes`, `/hyperframes-animation` i reszta pakietu), nie są moje. Robi je HeyGen i udostępnia za darmo na licencji Apache-2.0: [github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes). Instalujesz je z oryginalnego repo, więc zawsze masz najnowszą wersję.

W Claude Code jako wtyczka:

```bash
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes
```

Albo same skille (w okienku wyboru zaznacz grupę „Core Skills”):

```bash
npx skills add heygen-com/hyperframes
```

Najważniejszy dla ruchu jest `/hyperframes-animation`. To w nim siedzą reguły z filmu: waterfall-entry, spring-pop, chromatic-glitch, motion-blur, 3d-camera-flight i zasada „przejście jest wyjściem”.

## Co jest w tym repo

| Folder | Co to jest | Render |
|---|---|---|
| [`plansze-yt/`](plansze-yt/) | Lekki szablon plansz do środka filmu: teza, lista, liczba, porównanie, kroki, cytat. Przeloty kamery, rozmycie ruchu, delikatne dźwięki. Treść w `spec.json` | ok. 1 min na 20 s |
| [`przyklady-regul/`](przyklady-regul/) | 5 krótkich klipów „PowerPoint kontra reguła”, po jednym na każdą regułę ruchu z filmu | kilkanaście sekund na klip |
| [`animacja-vs/`](animacja-vs/) | 31-sekundowa animacja z filmu: typowa animacja z jednego prompta, potem 5 tez w 3D (Three.js, bloom, aberracja, ziarno) | ok. 2 min, 1 worker, kilka GB RAM-u |
| [`prezentacja-klikana/`](prezentacja-klikana/) | Klikana plansza do nagrywania ekranu: punkty wchodzą jeden po drugim na klik | otwierasz w przeglądarce |

Kolory i fonty to identyfikacja DBest Content. Podmień je w CSS na swoje – układ i ruch zostają.

## Wymagania

- Node.js 20+ (z `npx`). HyperFrames CLI 0.8.140 pobiera się sam przy pierwszym renderze. GSAP i Three.js pobiera npm do `vendor/`.
- Python 3.10+ z `numpy` i `scipy` (synteza efektów dźwiękowych, bez sampli i bez licencji): `pip install numpy scipy`.
- `ffmpeg` w PATH – tylko jeśli dokładasz muzykę do animacji VS.

Testowane na Windows 11. Kopie robocze renderów lądują w `%LOCALAPPDATA%\hf-odjechane-animacje`, bo silnik nie lubi spacji i polskich znaków w ścieżkach.

## Szybki start

```bash
cd plansze-yt
python buduj.py przyklad/spec.json
```

```bash
cd przyklady-regul
python buduj.py
```

```bash
cd animacja-vs/zrodla
python buduj.py render
```

Prezentację otwierasz bezpośrednio: `prezentacja-klikana/index.html`. Klik, spacja albo strzałka w prawo pokazuje następny punkt, strzałka w lewo cofa, F włącza pełny ekran, H pokazuje licznik kroków.

## Jak z tym pracować w Claude Code

Nie musisz rozumieć tego kodu. Otwórz repo w Claude Code i opisz, co ma się zmienić: treść plansz, kolory, kolejność ujęć. Najlepiej działają konkretne uwagi o ruchu, np. „przejścia wyglądają jak slajdy” albo „karty odbijają się jak piłka”. Samo „zrób lepiej” daje niewiele.

## Licencje

- Kod w tym repo: MIT (plik [`LICENSE`](LICENSE)).
- Fonty w `fonts/` (Oxanium, Exo 2, Share Tech Mono): SIL Open Font License 1.1, teksty licencji obok fontów.
- Skille HyperFrames: Apache-2.0, repo HeyGen (nie ma ich tutaj).
- Logo DBest Content w `animacja-vs/assety/tex/logo.png` nie jest objęte MIT. Podmień je na swoje.
