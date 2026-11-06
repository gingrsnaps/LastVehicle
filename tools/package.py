"""Rebuild both user packages with Python's standard library.

Run from anywhere: python tools/package.py --output /path/to/output
This never includes Git metadata, hosting credentials or local save data.
The original assets and their notices remain inside each playable package.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=Path, default=ROOT / "releases")
args = parser.parse_args()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)

# A reading copy complements the editable files; vendor libraries stay bundled
# as their complete files instead of producing millions of lines of code blocks.
sources = [ROOT / "dist/index.html", ROOT / "dist/style.css"]
for folder, pattern in [("dist/js", "*.js"), ("tools", "*"), ("tests", "*.js")]:
    sources.extend(sorted(p for p in (ROOT / folder).glob(pattern) if p.is_file()))
sources.extend(ROOT / name for name in ["START_GAME.py", "START_WINDOWS.bat", "START_MAC_LINUX.sh", "package.json"])
parts = ["# Last Vehicle 1.19 — complete commented source\n\nEdit the actual files. This is a reading copy of the runtime, launchers, packaging tools and tests. Vendor libraries, models, music and sound recordings are supplied separately with their notices. Read UPDATE_1_19.md and BUILD_AND_EDIT_GUIDE.md for the walkthrough.\n"]
languages = {".js": "javascript", ".mjs": "javascript", ".py": "python", ".html": "html", ".css": "css", ".json": "json", ".bat": "bat", ".sh": "sh"}
for path in sources:
    parts.append(f"\n## {path.relative_to(ROOT).as_posix()}\n\n```{languages.get(path.suffix, '')}\n{path.read_text(encoding='utf-8').rstrip()}\n```\n")
(ROOT / "docs/Full_Code.md").write_text("".join(parts), encoding="utf-8")

files = []
for folder in ["dist", "docs", "tools", "tests", "source-assets"]:
    files.extend(p for p in (ROOT / folder).rglob("*") if p.is_file() and "__pycache__" not in p.parts)
files.extend(ROOT / name for name in ["README.md", "PROJECT_NOTICES.txt", "START_GAME.py", "START_WINDOWS.bat", "START_MAC_LINUX.sh", "package.json"])

reports = []
for name, selected, base in [
    ("LastVehicle_Browser_Complete.zip", files, ROOT),
    ("LastVehicle_Itch_HTML5.zip", [p for p in (ROOT / "dist").rglob("*") if p.is_file()], ROOT / "dist"),
]:
    target = output / name
    temporary = output / (name + ".tmp")
    with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(selected):
            archive.write(path, path.relative_to(base).as_posix())
    with zipfile.ZipFile(temporary) as archive:
        assert archive.testzip() is None, "Archive integrity check failed"
        assert ("index.html" if base.name == "dist" else "dist/index.html") in archive.namelist()
        for entry in archive.namelist():
            assert not entry.startswith("/") and ".." not in Path(entry).parts
        count = len(archive.namelist())
    temporary.replace(target)
    reports.append({"file": name, "bytes": target.stat().st_size, "files": count, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
(output / "v119-package-verification.json").write_text(json.dumps(reports, indent=2) + "\n", encoding="utf-8")
print(json.dumps(reports, indent=2))
