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
        self.jpg = self.hero / '00-cover.jpg'
        im = Image.effect_noise((3600, 2400), 50).convert('RGB')
        im.save(self.jpg, 'JPEG', quality=97)
        self.png = self.hero / 'transparency.png'
        Image.new('RGBA', (100, 70), (10, 20, 30, 100)).save(self.png)
        self.wrong = self.hero / 'wrong.png'
        im.resize((50, 40)).save(self.wrong, 'JPEG')

    def tearDown(self):
        self.tmp.cleanup()

    def test_preview_is_readonly_and_apply_updates_original_without_backup(self):
        before = self.jpg.read_bytes()
        preview = optimize(self.hero, self.root, False, 2400, 86, 5)
        self.assertTrue(any(r.filename=='00-cover.jpg' and r.status=='READY' for r in preview))
        self.assertEqual(self.jpg.read_bytes(), before)
        modified = optimize(self.hero, self.root, True, 2400, 86, 5)
        self.assertTrue(any(r.filename=='00-cover.jpg' and r.status=='UPDATED' for r in modified))
        self.assertNotEqual(self.jpg.read_bytes(), before)
        self.assertLess(self.jpg.stat().st_size, len(before))
        with Image.open(self.jpg) as im:
            self.assertEqual(im.size, (2400, 1600))
        self.assertEqual(self.png.suffix, '.png')
        self.assertIn('wrong.png', [x.filename for x in modified if x.status=='SKIP'])

    def test_repeat_apply_does_not_create_extra_files(self):
        before = set(p.name for p in self.hero.iterdir())
        optimize(self.hero, self.root, True, 2400, 86, 5)
        optimize(self.hero, self.root, True, 2400, 86, 5)
        self.assertEqual(set(p.name for p in self.hero.iterdir()), before)

    def test_invalid_quality_fails_without_writing(self):
        before = self.jpg.read_bytes()
        with self.assertRaises(ValueError):
            optimize(self.hero, self.root, True, 2400, 20, 5)
        self.assertEqual(self.jpg.read_bytes(), before)

    def test_format_mismatch_skips_bad_extension(self):
        before = self.wrong.read_bytes()
        results = optimize(self.hero, self.root, True, 2400, 86, 5)
        self.assertEqual(self.wrong.read_bytes(), before)
        self.assertIn('wrong.png', [x.filename for x in results if x.status == 'SKIP'])


if __name__ == '__main__':
    unittest.main()
