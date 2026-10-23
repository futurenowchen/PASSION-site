# PASSION hero photo batch optimization (local Windows CLI)

This tool does NOT run on the production server or in GitHub Actions. It only
changes the local clone's `images/hero/` after an explicit `--apply`.

Requirements: Python 3.10+ and Pillow (recommended 11.x or 12.x).

## Example (PowerShell, E:\Code\PASSION-site)

```powershell
py -3 -m pip install --user "Pillow>=11,<13"
py -3 -m unittest discover -s scripts -p "test_optimize_hero_images.py" -v
py -3 scripts\optimize_hero_images.py
# Review the preview before applying.
py -3 scripts\optimize_hero_images.py --apply --backup-dir "E:\Code\PASSION-site-hero-backup-20261023"
git status --short
git diff --stat
```

Defaults: long edge <= 2400px, JPEG/WebP quality 86, minimum size saving 5%.
PNG remains PNG and receives lossless compression. AVIF and animated images
are skipped; mismatches such as JPEG bytes disguised as PNG are skipped.
Every changed original gets an outside-repo exact-byte backup before replace.
Files smaller or already optimized enough remain untouched. Filenames,
subfolders, and the hero manifest are NOT changed.

Do not rerun --apply with the same backup directory, and do not commit/push
until the first slide (`00-cover.jpg`) and several classrooms look good.

The team/school production domain `passiontw.net` has a separate deployment
step that is not handled by this local image optimizer.
