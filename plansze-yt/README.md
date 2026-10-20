# Plansze DBest na YouTube

Lekki szablon do plansz, które wzmacniają wypowiedź w filmie: teza, lista, liczba, porównanie, kroki, cytat. Kolory i fonty DBest, tło bez kratki, przeloty kamery między planszami z rozmyciem w kierunku ruchu, wejścia według reguł z `/hyperframes-animation` (waterfall-entry, spring-pop, rysowane linie, licznik, krótki glitch RGB na słowach-akcentach) i delikatne dźwięki pod wejścia.

Bez Three.js i WebGL, więc renderuje się szybko i stabilnie: 24 s filmu w ok. 1 minutę.

## Użycie

```powershell
python buduj.py przyklad\spec.json                       # MP4 + osobny .sfx.wav obok spec.json
python buduj.py przyklad\spec.json --zrzuty 2,8,15       # same klatki kontrolne do obejrzenia
```

Wymaga: Python z numpy i scipy, Node.js 20+ z `npx`. Fonty biorą się z `../fonts/`, GSAP pobiera npm przy pierwszym buildzie. Kopia robocza do renderu ląduje w `%LOCALAPPDATA%\hf-odjechane-animacje` (ścieżka bez polskich znaków).

## Specyfikacja (`spec.json`)

Pola wspólne: `typ`, `t` (sekunda, w której kamera ląduje na planszy), `etykieta` (mała linia nad tytułem), `akcent` (lista słów w cyjanie z glitchem; słowo z interpunkcją wpisz tak, jak w tekście, np. `"wyjściem."`). `dur` na poziomie pliku – długość całości (domyślnie ostatnie `t` + 4 s).

| Typ | Pola |
|---|---|
| `teza` | `tekst` |
| `lista` | `tytul`, `punkty`: `[{tekst, ikona: ok/no/dot, t?}]`, `odstep` (domyślnie 0,55 s) |
| `liczba` | `do`, `sufiks`, `podpis`, `pasek` (0–1), `dziesietne`, `czas` |
| `porownanie` | `tytul`, `lewa: {tytul, punkty[]}`, `prawa: {tytul, punkty[]}`, `odstep` |
| `kroki` | `tytul`, `kroki[]`, `odstep` |
| `cytat` | `tekst`, `autor` |

`t` przy punktach listy pozwala przypiąć wejście do sekundy, w której mówisz daną frazę. Między planszami zostaw co najmniej 3 s, żeby tekst dało się przeczytać.

## Kiedy ten szablon, a kiedy wersja 3D

- Ten szablon: plansze w środku zwykłego filmu, ilustracja tez, liczby, porównania.
- Wersja 3D (`../animacja-vs`): intro, reklama, materiał, w którym animacja jest bohaterem. Render ok. 2 min na 30 s, potrzebuje kilku GB wolnego RAM-u i jednego workera.
