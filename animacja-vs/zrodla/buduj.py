"""Animacja VS (31 s, Three.js + HyperFrames): składa kopię roboczą i uruchamia CLI.

  python buduj.py check                 # hyperframes check
  python buduj.py snapshot 7,12,29.5    # klatki kontrolne
  python buduj.py render                # render do ../render/vs-animacja.mp4

Muzyka (opcjonalnie): wrzuć ../assety/muzyka.mp3 albo .wav, a audio/sfx.py zmiksuje ją z efektami.
Render potrzebuje kilku GB wolnego RAM-u i idzie na jednym workerze (dwie sceny WebGL naraz gubią kontekst GPU).
"""
import shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT.parent))
import narzedzia as nz  # noqa: E402


def assemble():
    if not (HERE / 'audio' / 'audio.wav').exists() or any((ROOT / 'assety').glob('muzyka.*')):
        subprocess.run([sys.executable, str(HERE / 'audio' / 'sfx.py')], check=True)
    out = nz.project_dir('vs-animacja')
    shutil.copy(HERE / 'index.html', out / 'index.html')
    shutil.copytree(HERE / 'swiat', out / 'swiat')
    shutil.copytree(ROOT / 'assety' / 'tex', out / 'assets' / 'tex')
    shutil.copy(HERE / 'audio' / 'audio.wav', out / 'assets' / 'audio.wav')
    nz.copy_fonts(out / 'assets' / 'fonts', {'Exo2.ttf', 'ShareTechMono.ttf', 'Oxanium-ExtraBold-static.ttf'})
    for f in ('typowa.mp4', 'typowa-ostatnia.png'):
        shutil.copy(ROOT / 'assety' / f, out / 'assets' / f)
    shutil.copy(nz.gsap(), out / 'assets' / 'gsap.min.js')
    three = nz.three()
    shutil.copytree(three / 'build', out / 'vendor' / 'three' / 'build')
    shutil.copytree(three / 'examples' / 'jsm', out / 'vendor' / 'three' / 'examples' / 'jsm')
    return out


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'render'
    out = assemble()
    if cmd == 'check':
        nz.npx(['check'], out)
    elif cmd == 'snapshot':
        nz.npx(['snapshot', '--at', sys.argv[2]], out)
        print('klatki:', out / 'snapshots')
    elif cmd == 'render':
        if not nz.render(out, ROOT / 'render' / 'vs-animacja.mp4', workers=1):
            sys.exit(1)


if __name__ == '__main__':
    main()
