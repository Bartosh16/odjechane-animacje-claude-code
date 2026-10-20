"""Renderuje wynik czystego prompta (typowa-animacja/animacja.html) do MP4 bez zmian w jego kodzie.

Jedyna ingerencja: opakowanie <body> w kontener kompozycji HyperFrames (5 s, 1920x1080, bez timeline'u GSAP),
żeby silnik mógł przewijać animacje CSS klatka po klatce. Wynik: ../assety/typowa.mp4.
"""
import re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT.parent))
import narzedzia as nz  # noqa: E402

html = (ROOT / 'typowa-animacja' / 'animacja.html').read_text(encoding='utf-8')
m = re.search(r'<body([^>]*)>(.*)</body>', html, re.S)
wrapped = html[:m.start()] + f'<body{m.group(1)}><div id="root" data-composition-id="typowa" data-width="1920" data-height="1080" data-duration="5" data-fps="30" data-no-timeline style="position:relative;width:1920px;height:1080px;overflow:hidden">' + m.group(2) + '</div></body>' + html[m.end():]

out = nz.project_dir('typowa')
(out / 'index.html').write_text(wrapped, encoding='utf-8')
nz.render(out, ROOT / 'assety' / 'typowa.mp4')
