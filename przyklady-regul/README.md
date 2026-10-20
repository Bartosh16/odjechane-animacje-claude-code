# Przykłady reguł ruchu

Pięć klipów 1920×1080 z dźwiękiem. Każdy pokazuje tę samą treść dwa razy: po lewej tak, jak animuje PowerPoint (samo pojawianie się, jedna krzywa, równe odstępy), po prawej z regułą ze skilla `/hyperframes-animation`.

| Reguła | Co widać |
|---|---|
| `waterfall-entry` | Słowa wskakują od dołu jedno po drugim, z zakładką na jedną klatkę |
| `spring-pop` | Karty rosną od zera i osiadają – gładko, bez odbicia |
| `chromatic-glitch` | Rozszczepienie RGB, które drga i ostrzy się w ułamku sekundy (dwa uderzenia) |
| `motion-blur` | Rozmycie w kierunku ruchu, największe przy najwyższej prędkości |
| `3d-camera-flight` | Kamera leci między kartami w przestrzeni, zamiast przełączać slajdy |

```bash
python buduj.py                                   # wszystkie 5 do render/
python buduj.py chromatic-glitch                  # jeden klip
python buduj.py motion-blur --zrzuty 1.1,1.3,2.5  # same klatki kontrolne
```

Całość jest w jednym pliku `szablon.html`: każda reguła to osobny blok `if (RULE === '...')`. Dźwięki biorą funkcje z `../plansze-yt/buduj.py`.
