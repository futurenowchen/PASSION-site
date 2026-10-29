# PASSION 首頁輪播照片池操作說明

目前管理範圍僅包含 **首頁輪播照片池**。活動紀實與最新消息保留原有維護方式。

## 操作入口

https://futurenowchen.github.io/PASSION-site/admin/

1. 使用有 `futurenowchen/PASSION-site` 寫入權限的 GitHub 帳號。
2. 選擇 **Sign In with Token**。GitHub 後臺需使用細粒度權杖，限制只存取本儲存庫，並僅授予 Contents: Read and write。請從登入視窗提供的官方 GitHub 連結產生權杖。
3. **不要把權杖貼到 Slack、LINE、ChatGPT、GitHub 儲存庫或共用文件**。登入介面直接在自己的瀏覽器輸入。
4. 點選「首頁內容 → 首頁輪播照片池」。每張照片可修改、替換、刪除、新增及拖曳／上下排序。
5. 記得填寫「照片描述」。依上到下順序儲存後，待 GitHub Pages 發布再刷新首頁。

## 重要規則

- **有 `00-cover.jpg` 時優先作為首圖**；若不存在則清單第一筆為首圖。
- 輪播照片至少一張，沒有人工張數上限；照片太多仍需兼顧網頁載入效能。
- **請上傳 JPEG（.jpg / .jpeg）照片。** 網站會自動壓縮到寬度不超過 1600px；學校正式主機目前不使用 AVIF、WebP 輪播來源。
- 編輯輪播照片並不會改動「活動紀實」的封面圖或原始資料。
- 公開的 `/admin/` 頁面**不代表任何人可編輯**：儲存操作仍需 GitHub 儲存庫的寫入權限。
- 本階段採用 GitHub token 登入，**多人非技術同仁正式上線前**，建議另外配置 GitHub OAuth 登入服務，避免每位同仁自行管理權杖。
- 本頁僅提供 GitHub 存取工具；正式發布的內容會在 repo 留下 Git commit，可用 GitHub 歷史回復。
- 若 AI 也在同時編輯 `data/hero.json`，請先刷新後臺再更新，避免覆蓋彼此排序。

## 資料結構

- `data/hero.json`：由 `images/hero/` 的照片自動同步產生，保留其餘照片的排序與描述。
- `images/hero/`：已最佳化的網頁 JPEG，保留檔名與 CMS 連結；原始高解析照片由團隊另行備份，不存於網站。
- `admin/config.yml`：後臺資料模型。

前端會檢查來源必須屬於 `images/hero/`、格式及照片描述，錯誤配置會顯示載入失敗而不執行任意來源。

## 首圖管理（00-cover.jpg）

- **指定首圖：**在 `images/hero/` 直接新增一張真正 JPEG 格式的 `00-cover.jpg`，它會永遠排在第一張，且不會重複播放。
- **更換首圖：**以相同檔名替換該圖片，或先刪除再新增；需要核對照片實際副檔名與格式一致。
- **取消指定首圖：**刪除 `00-cover.jpg`，網站自動恢復原來其餘照片的排序。
- **不固定其他照片：**其餘照片保留既有清單順序；新上傳的照片按檔名順序附加在最後。
- GitHub 圖片資料夾變更後由 `Optimize homepage JPEG photo pool` 工作流程同步 `data/hero.json`；若工作流程失敗，先檢查 Actions 紀錄。
- 正式網站 `passiontw.net` 是否自動部署仍待學校工程師確認。

## 首圖之後隨機輪播（2026-10-21）

- 如果照片池有 `00-cover.jpg`，訪客每次開啟首頁都先看到這張；它不會加入後續隨機輪播。
- 其他照片在瀏覽器端**每輪洗牌**，同一輪每張各播放一次；播完才會重新洗牌，避免短時間重複；換輪時盡量避免連續出現同一張。
- 沒有 `00-cover.jpg` 時，所有照片都參與隨機輪播。
- 原有的 GitHub 自動同步、左右切換、觸控手勢及每五秒自動播放保留，底部圓點仍不顯示。
- 洗牌只改變瀏覽器中當次觀看的播放順序，不需要更動 `data/hero.json`。正式站 `passiontw.net` 的部署方式仍須工程師確認。


## 2026-10-29：正式主機相容性與 ZIP 部署（最新規則）
- `passiontw.net` 目前由學校以整包 ZIP 人工部署；不是 GitHub Pages 自動上線。
- 正式主機對 `.avif` 路徑回傳 404，因此已移除首頁對 AVIF / WebP 的依賴，改用 `images/hero/` 中的壓縮 JPEG。尚未播放的照片不會提前載入。
- 原始高解析照片在團隊備份，不存於 repo。46 張首頁 JPEG 總計約 8.56 MiB。
- 不再使用 `images/hero-optimized/` 或 `data/hero-optimized.json`，避免 ZIP 中包含無用的 276 個衍生檔。
- `scripts/optimize-hero.cjs` 使用 `data/hero-source-state.json` 追蹤 Git Blob SHA，僅處理新上傳或修改的 JPEG，避免重複有損壓縮。
- 請等照片最佳化 Actions 和 Pages build 成功，再下載最新 `main` 的 ZIP，解壓至全新目錄並整包切換；勿在舊目錄上覆蓋疊加。
- 部署後在 Chrome DevTools 清除 Network 紀錄、禁用快取、硬重新整理，確認沒有 `.avif` 請求、`images/hero/*.jpg` 回應 200，且左右切換與手機正常。
