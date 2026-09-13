"""Build only the frozen public snapshot. No source library, network or dependencies."""
from pathlib import Path
import hashlib,json,shutil
P=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((P/'release.json').read_text())
files={str(f.relative_to(P/'snapshot')):sha(f) for f in (P/'snapshot').rglob('*') if f.is_file()}
assert files==m['files'],'Snapshot differs from reviewed release'
assert not any(f.is_symlink() for f in (P/'snapshot').rglob('*'))
out=P/'dist'
assert not out.exists(),'Output exists; use a clean checkout, do not overwrite'
shutil.copytree(P/'snapshot',out)
print('Verified staging build:',m['release_id'],len(files),'files')
