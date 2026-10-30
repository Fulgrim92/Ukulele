"""Check packaged assets without printing private lyric text."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
apk = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'apk-output/Four-Strings.apk'
with zipfile.ZipFile(apk) as bundle:
    assert bundle.testzip() is None, 'Corrupt APK entry'
    prefix = 'assets/public/'
    seed = json.loads(bundle.read(prefix + 'private-lyrics.json'))
    assert isinstance(seed, dict) and all(isinstance(v.get('text'), str) for v in seed.values())
    assert all(v['mode'] == 'timed' for v in seed.values())
    assert 'mobile-bootstrap.js' in bundle.read(prefix + 'index.html').decode()
    checked = 0
    for original in (root / 'dist/assets/ukulele').glob('*.wav'):
        assert bundle.read(prefix + 'assets/ukulele/' + original.name) == original.read_bytes(), original.name
        checked += 1
    assert checked == 20
    for filename in ('core.js', 'data.js', 'song-charts.js', 'acoustic.js', 'lyrics.js', 'practice.js'):
        assert bundle.read(prefix + filename) == (root / 'dist' / filename).read_bytes(), filename
    for filename in ('app.js', 'karaoke-timing.js', 'karaoke-ui.js', 'mobile-bootstrap.js'):
        assert bundle.read(prefix + filename) == (root / '.android-web' / filename).read_bytes(), filename
    config = json.loads(bundle.read('assets/capacitor.config.json'))
    assert config['appId'] == 'com.fourstrings.ukulele' and not config.get('server', {}).get('url')
report = {
    'apk': apk.name, 'bytes': apk.stat().st_size,
    'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
    'private_lyric_songs': len(seed), 'verified_local_string_recordings': checked,
    'automatic_timed_songs': sum(v['mode'] == 'timed' for v in seed.values()),
    'local_app_assets_verified': True, 'remote_start_url': False,
    'physical_phone_tested': False,
}
(apk.parent / 'verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
