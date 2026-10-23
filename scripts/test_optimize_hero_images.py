import tempfile
import unittest
from pathlib import Path
from PIL import Image
from optimize_hero_images import optimize


class TestOptimizeHeroImages(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name) / 'PASSION-site'
        self.hero = self.root / 'images' / 'hero'
        self.hero.mkdir(parents=True)
        self.backup = Path(self.tmp.name) / 'outside-hero-backup'
        self.jpg = self.hero / '00-cover.jpg'
        im = Image.effect_noise((3600, 2400), 50).convert('RGB')
        im.save(self.jpg, 'JPEG', quality=97)
        self.png = self.hero / 'transparency.png'
        Image.new('RGBA', (100, 70), (10, 20, 30, 100)).save(self.png)
        self.wrong = self.hero / 'wrong.png'
        im.resize((50, 40)).save(self.wrong, 'JPEG')

    def tearDown(self):
        self.tmp.cleanup()

    def test_preview_is_readonly_and_apply_preserves_names_and_backup(self):
        before = self.jpg.read_bytes()
        preview = optimize(self.hero, self.root, None, False, 2400, 86, 5)
        self.assertTrue(any(r.filename=='00-cover.jpg' and r.status=='READY' for r in preview))
        self.assertEqual(self.jpg.read_bytes(), before)
        modified = optimize(self.hero, self.root, self.backup, True, 2400, 86, 5)
        self.assertTrue(any(r.filename=='00-cover.jpg' and r.status=='UPDATED' for r in modified))
        self.assertEqual((self.backup/'00-cover.jpg').read_bytes(), before)
        self.assertLess(self.jpg.stat().st_size, len(before))
        with Image.open(self.jpg) as im:
            self.assertEqual(im.size, (2400, 1600))
        self.assertEqual(self.png.suffix, '.png')
        self.assertIn('wrong.png', [x.filename for x in modified if x.status=='SKIP'])

    def test_backup_cannot_be_inside_repo(self):
        with self.assertRaises(ValueError):
            optimize(self.hero, self.root, self.root/'backup', True, 2400, 86, 5)

    def test_repeated_backups_are_not_overwritten(self):
        self.backup.mkdir()
        (self.backup/'00-cover.jpg').write_bytes(b'original saved earlier')
        with self.assertRaises(FileExistsError):
            optimize(self.hero, self.root, self.backup, True, 2400, 86, 5)
        self.assertEqual((self.backup/'00-cover.jpg').read_bytes(), b'original saved earlier')


if __name__ == '__main__':
    unittest.main()
