# PASSION-site Development Handoff

Last updated: 2026-10-06  
Repository: `futurenowchen/PASSION-site`  
Primary branch: `main`

## 1. Project position

This repository is the current PASSION public-facing website prototype. The present goal is to keep the site suitable for leadership review while progressively replacing placeholder/demo content with traceable historical PASSION content.

The site is intentionally simple: static HTML/CSS/JavaScript with JSON content files and repository-hosted images. Avoid introducing a framework unless there is a clear need.

## 2. Current architecture

Primary pages:

- `index.html` + `home.js`: homepage, latest news, latest activities, hero activity linkage.
- `activity.html` + `activity.js`: historical activity archive with year/category filters.
- `activity-detail.html` + `activity-detail.js`: independent activity article page.
- `news.html` + `news.js`: latest-news archive.
- `news-detail.html` + `news-detail.js`: independent news article page.
- `about.html`, `milestones.html`, `awards.html`, `outcomes-public.html`: organization/outcome content.
- `resources*.html`: resource pages.
- `nav.html` + `site.js`: shared navigation behavior.
- `styles.css`: global styles.

Content/data:

- `data/activities.json`: activity archive.
- `data/news.json`: latest-news archive.
- `images/activity/<year>/`: local activity cover images stored in repo.

No separate CMS exists yet.

## 3. Content-source decisions already made

### Activities

`data/activities.json` is derived from the PASSION Facebook export backup and is the source of truth for the historical activity archive.

Current snapshot:

- generated_at: 2026-10-06
- source: PASSION Facebook export backup
- activity count: 75

Activities are intended to represent completed activity records / field documentation. The full article must open on an independent detail page; do not expand long content inline on the archive page.

### Latest news

`data/news.json` is derived from the PASSION historical Facebook backup.

Current snapshot:

- generated_at: 2026-10-06
- source: PASSION Facebook 歷史備份
- news count: 60

Recruitment, registration, information sessions, calls for participation, event previews, and similar forward-looking notices belong under Latest News rather than Activities.

The old fake/demo news content and `partials/news-content.html` have already been removed.

## 4. Activity category model

Existing internal category keys are:

- `summer` -> 暑期實習
- `international` -> 國際志工
- `training` -> 師資培育
- `remote` -> 遠距教學
- `exchange` -> 交流合作
- `field` -> 教學現場

Important temporary compatibility note:

The 2026-07-06 activity currently uses the literal Chinese value:

`"category": "國際志工"`

Compatibility support has already been added in:

- `activity.js`
- `activity-detail.js`
- `home.js`

so this item still displays as 國際志工 and remains selectable by the international-volunteer filter.

Do not casually redesign the whole category model during unrelated edits. If category normalization is done later, migrate all records and all consumers together.

## 5. Current high-priority checkpoint

Target activity:

- id: `2026-07-06-01`
- date: `2026-07-06`
- title: `2026年PASSION暑期實習與丁善理國際志工聯合出團大合照`
- category: `國際志工`
- requested cover: `images/activity/2026/2026-07-06-01.png`

The JSON metadata and category compatibility changes are already on `main`.

However, at the time this handoff was written, the repo still contains only:

`images/activity/2026/2026-07-06-01.jpg`

and does **not yet contain**:

`images/activity/2026/2026-07-06-01.png`

Therefore the current JSON cover path references a PNG that still needs to be created.

The existing JPG has already been visually checked and is the correct PASSION暑期實習 × 丁善理國際志工聯合出團大合照. The correct next action is simply:

1. Convert the existing repo JPG to a real PNG.
2. Save it as `images/activity/2026/2026-07-06-01.png`.
3. Keep the original JPG unless there is a reason to remove it.
4. Verify archive/detail rendering and category filtering.
5. Commit and push.

Do **not** fetch or re-import a chat attachment for this task.

## 6. Image-handling rule

For any future request involving activity covers, photos, icons, or static assets:

1. Inspect the repo first.
2. If a suitable image already exists in the repo, reuse / rename / convert / re-reference it.
3. Only use conversation uploads or external file-transfer workflows after confirming the repo does not already contain the required asset.
4. If the user says the image is already in the repo or asks only to change a path, immediately stop attachment-transfer work and return to repo-local operations.

This rule exists because repo-local image work is much faster and avoids unnecessary binary-file transfer complexity.

## 7. Historical image migration status

During the first three-year activity batch (2026-2024), missing-cover records were rechecked against the Facebook backup. Many records that appeared to have no image actually had source photos; those source-backed images were added to the repo.

General rule:

- A no-image layout should be used only when the backup/source genuinely contains no usable photo.
- Do not assume a missing repo cover means the original post had no image.
- Historical photo additions should remain traceable to the original backup.

## 8. UI/content decisions already made

- “閱讀完整紀實” opens a separate activity detail page.
- Activities and Latest News are separate content streams.
- The archive supports year and category filtering.
- Homepage activity cards and hero linkage are generated from `data/activities.json`.
- Images are expected to live in the repo rather than personal cloud storage.
- “十年深耕” is not an activity category.
- Avoid invented categories such as “系列活動” unless explicitly approved.
- Prefer source-traceable real content over demo/sample copy.

## 9. Safe development workflow

Before editing:

1. Read current `main` state.
2. Check whether the requested asset/content already exists.
3. Prefer the smallest possible change.
4. Do not overwrite unrelated current work.

For activity changes, verify at minimum:

- JSON parses.
- activity id is unique.
- cover path exists.
- archive card renders title/category/cover.
- category filter still finds the record.
- `activity-detail.html?id=<id>` renders the same title/category/cover.
- no unrelated activity records changed.

For news changes, similarly verify list + detail rendering.

## 10. Tooling division

Recommended:

- Text/JSON/HTML/CSS/JS edits: GitHub connector is usually efficient.
- Repo-local image conversion, renaming, or batch asset work: use local CLI / Work CLI Agent when available.
- Cross-system attachment transfer should be a fallback, not the default.

## 11. Current main checkpoint

At handoff creation time, the latest observed `main` HEAD was:

`2d15b7df0e944f084705de910550f65bcc330317`

Commit message:

`Support localized activity category values`

If the repository has moved forward, treat the newer HEAD as authoritative and update this handoff rather than resetting history.

## 12. Next recommended actions

Immediate:

- Finish the 2026-07-06 JPG -> PNG repo-local conversion and verify both activity surfaces.

After that:

- Continue historical activity/news cleanup in manageable batches rather than very large single passes.
- Recheck no-image records against source backup before declaring them source-without-photo.
- Keep this handoff updated after meaningful architecture/content-policy changes.

## 13. Non-goals / cautions

- Do not replace real source-derived content with generated fake samples.
- Do not store production website images in a user's personal cloud-drive path.
- Do not perform broad category-system refactors during a one-record content fix.
- Do not infer that an attachment must be re-uploaded when the same asset already exists in the repo.
- Do not remove existing historical content merely to simplify the UI.

---
When resuming development in a new conversation, read this file first, then inspect the current `main` HEAD and working tree before making changes.
