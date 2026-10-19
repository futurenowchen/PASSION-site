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

- **沒有固定首圖**。照片池的第一筆就是首頁載入時顯示的照片。
- 一次至少保留一張輪播照片，最多 30 張。
- 建議使用實際 JPEG、PNG、WebP 或 AVIF，寬度至少 1600px；上傳前確認檔案副檔名與實際格式一致。
- 編輯輪播照片並不會改動「活動紀實」的封面圖或原始資料。
- 公開的 `/admin/` 頁面**不代表任何人可編輯**：儲存操作仍需 GitHub 儲存庫的寫入權限。
- 本階段採用 GitHub token 登入，**多人非技術同仁正式上線前**，建議另外配置 GitHub OAuth 登入服務，避免每位同仁自行管理權杖。
- 本頁僅提供 GitHub 存取工具；正式發布的內容會在 repo 留下 Git commit，可用 GitHub 歷史回復。
- 若 AI 也在同時編輯 `data/hero.json`，請先刷新後臺再更新，避免覆蓋彼此排序。

## 資料結構

- `data/hero.json`：輪播順序與替代文字，首頁 `home.js` 唯一使用這份資料。
- `images/hero/`：輪播圖片素材。已複製原本位於活動資料夾的兩張輪播照片，無損品質。
- `admin/config.yml`：後臺資料模型。

前端會檢查來源必須屬於 `images/hero/`、格式及照片描述，錯誤配置會顯示載入失敗而不執行任意來源。
