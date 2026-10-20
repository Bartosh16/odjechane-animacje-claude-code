"""Wspólne narzędzia dla wszystkich projektów w repo: ścieżki, biblioteki z npm, wywołanie HyperFrames CLI.

GSAP i Three.js nie leżą w repo. Pobiera je npm przy pierwszym buildzie do folderu vendor/ (jest w .gitignore).
"""
import json, os, shutil, subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parent
FONTS = REPO / 'fonts'
VENDOR = REPO / 'vendor'
HF = ['--yes', 'hyperframes@0.8.140']
GSAP_VER, THREE_VER = '3.14.2', '0.181.2'

# HyperFrames ma kłopot ze ścieżkami z polskimi znakami i spacjami, więc kopia robocza ląduje w katalogu użytkownika.
BUILD_ROOT = Path(os.environ.get('LOCALAPPDATA') or Path.home() / '.cache') / 'hf-odjechane-animacje'

PACKAGE_JSON = {'name': 'kompozycja', 'private': True, 'type': 'module'}
HYPERFRAMES_JSON = {
    '$schema': 'https://hyperframes.heygen.com/schema/hyperframes.json',
    'registry': 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
    'paths': {'blocks': 'compositions', 'components': 'compositions/components', 'assets': 'assets'},
    'media': {'autoProxy': False},
}


def _vendor():
    """Instaluje GSAP i Three.js do vendor/ jednym wywołaniem npm (osobne wywołania usuwałyby sobie nawzajem pakiety)."""
    nm = VENDOR / 'node_modules'
    if (nm / 'gsap' / 'dist' / 'gsap.min.js').exists() and (nm / 'three' / 'build').exists():
        return nm
    npm = shutil.which('npm.cmd') or shutil.which('npm')
    if not npm:
        raise SystemExit('Brak npm – zainstaluj Node.js 20+ (https://nodejs.org).')
    VENDOR.mkdir(exist_ok=True)
    subprocess.run([npm, 'install', '--no-save', '--prefix', str(VENDOR), f'gsap@{GSAP_VER}', f'three@{THREE_VER}'], check=True)
    return nm


def gsap():
    """Ścieżka do gsap.min.js (pobiera z npm przy pierwszym użyciu)."""
    return _vendor() / 'gsap' / 'dist' / 'gsap.min.js'


def three():
    """Katalog pakietu three (build/ i examples/jsm/)."""
    return _vendor() / 'three'


def project_dir(name, clean=True):
    """Pusta kopia robocza projektu HyperFrames z package.json, hyperframes.json i meta.json."""
    out = BUILD_ROOT / name
    if clean and out.exists():
        for p in out.iterdir():                  # zostaw cache CLI, odśwież resztę
            if p.name in ('.hyperframes', 'node_modules'):
                continue
            shutil.rmtree(p) if p.is_dir() else p.unlink()
    (out / 'assets').mkdir(parents=True, exist_ok=True)
    (out / 'package.json').write_text(json.dumps(PACKAGE_JSON, indent=2), encoding='utf-8')
    (out / 'hyperframes.json').write_text(json.dumps(HYPERFRAMES_JSON, indent=2), encoding='utf-8')
    (out / 'meta.json').write_text(json.dumps({'id': name, 'name': name}), encoding='utf-8')
    return out


def copy_fonts(dst, names=None):
    dst.mkdir(parents=True, exist_ok=True)
    for f in FONTS.glob('*.ttf'):
        if names is None or f.name in names:
            shutil.copy(f, dst / f.name)


def npx(args, cwd):
    exe = shutil.which('npx.cmd') or shutil.which('npx')
    if not exe:
        raise SystemExit('Brak npx – zainstaluj Node.js 20+ (https://nodejs.org).')
    return subprocess.run([exe] + HF + args, cwd=cwd, text=True, encoding='utf-8', errors='replace')


def render(out, dst, workers=2):
    """Render kompozycji z kopii roboczej `out` do pliku `dst`. Zwraca True przy sukcesie."""
    tmp = out / 'out.mp4'
    if tmp.exists():
        tmp.unlink()
    r = npx(['render', '-o', str(tmp), '--quality', 'delivery', '--workers', str(workers)], out)
    if r.returncode == 0 and tmp.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(tmp, dst)
        print('OK', dst)
        return True
    print('BŁĄD renderu:', dst.name)
    return False
