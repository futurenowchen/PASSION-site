# PASSION 資料檢視平臺｜開發與數據對校 Handoff

最後核對：2026-10-08（臺北時間）
範圍：PASSION 資料查詢平臺（活動資料、教學資料及未來模組），**不是** PASSION 主網站的活動／新聞內容維護。
目前狀態：活動資料與教學資料查詢已部署；110.9 已核准補計；111.6 已按原始優先規則排重並整期替換；其餘期別持續核對。

## 0. 新對話的接續入口

收到「繼續 PASSION 資料檢視平臺」時，應依序：

1. 讀這份 handoff、GitHub 最新 main，以及公開站根目錄的 HANDOFF.md（後者只管主網站，不代替本文件）。
2. 確認兩個 repo 的對應前端檔案、Google Sheets 真實表頭／分頁與最近 GitHub Actions；不得僅依本文件的歷史 HEAD 操作。
3. **優先續查 113.6 及 110.9 尚待確認的差異**；先查來源與跨期重複，後決定要不要入庫。
4. 任何新增或替換都要「每期 × 計畫 × 子測驗 × 學校」對校、跨期排重、保持原始統計可追溯；不可直接把原始數據加在大表之上。
5. 完成後同步更新本文件及雙 repo，保留可重跑的檢查點；不能把個人資料或原始學生名單放到 GitHub。

## 1. 正式架構與入口

- 入口：https://futurenowchen.github.io/PASSION-site/data-query/
- 教學頁：https://futurenowchen.github.io/PASSION-site/data-query/teaching.html
- 公開部署 repo：https://github.com/futurenowchen/PASSION-site
  - 查詢前端目錄：data-query/
  - 主網站交接文件：根目錄 HANDOFF.md
- **私有原始碼／canonical repo**：futurenowchen/passion-activity-data
  - 前端對應目錄：web/
  - 本文件在該 repo 的 HANDOFF.md；公開鏡像在 PASSION-site/data-query/HANDOFF.md
  - 維護原則：source repo 的 web/ 與公開 repo 的 data-query/ 同步；不要只改其中一邊。

技術：靜態 HTML/CSS/JavaScript；Google Identity Services OAuth、Sheets API 唯讀讀取；用戶在瀏覽器端統計／篩選／CSV 匯出。不是以 SQLite 或公開 JSON 作為個資資料來源。

五大分頁：**活動資料、教學資料**已可用；**問卷資料、PASSION 學程資料、觀課資料**目前仍是未啟用入口，不要聲稱已建置資料集。

### 重要前端檔案

- data-query/config.js：OAuth Client ID、各 Spreadsheet ID、sheet names（公開 Client ID 不等於私鑰）。
- data-query/js/sheets.js：fetchPassionSheets、fetchTeachingSheets、fetchTeachingDetailSheet；Google Sheets API。
- data-query/js/data.js 等：活動查詢資料的 canonical 化／彙總（實際檔名以 repo 最新目錄為準）。
- data-query/js/teaching-data.js：教學原始事實正規化、核對明細覆蓋、歷史原始檔補齊、安全補計、篩選及彙總。
- data-query/js/teaching.js：教學查詢 UI、四組並行資料讀取、套用覆蓋／補計。
- data-query/js/auth-session.js：OAuth token 暫存於 sessionStorage 且有到期時間；非 long-term localStorage。
- data-query/tests/teaching-data.test.mjs 及同目錄其他測試。
- data-query/package.json：node --test tests/*.test.mjs。

## 2. Google Sheets：正式資料來源與權限邊界

活動 Mirror：
https://docs.google.com/spreadsheets/d/1bu5qvqOIV9c3VA10Af3UPizXEzJTGmVlsZFTVvUSV0c/edit
- LEGACY_RAW：2016–2022 歷史活動表，固定資料。
- RAW_CURRENT：2023 起的現在活動資料（Apps Script 定時鏡像；以目前同步工作流程為準）。
- 不可重複計算 2023 以前在 RAW_CURRENT 裡的列。

Teaching Data Hub：
https://docs.google.com/spreadsheets/d/1vVSIzUr03mnjWYgZp92jNKwAhhksi38VpuRMAOUED40/edit
- TEACHING_FACTS：正式原始統計／歷史總覽（已含 115.01 單獨匯入）。
- DIM_SCHOOLS、DIM_PROJECTS、PROJECT_ASSIGNMENTS：學校／計畫維度及歸屬。
- IMPORT_BATCHES、VALIDATION_ISSUES、README：匯入與資料品質追蹤。
- RECONCILIATION_RUNS、RECONCILIATION_DIFFS、PENDING_REVIEW：對校結果及未決群組。
- VERIFIED_DETAIL_INDEX：核對明細與歷史補計批次索引。
- HIST_DIAG_DECISIONS（gid=2110892097）：110.9、111.6 的人工確認／尚待核對決議。

Teaching Verified Detail Store：
https://docs.google.com/spreadsheets/d/1N1WUYdUSUk5Tv5q_onoLADCssjdE2wDnsmaJMKiBvsE/edit
- PASSION Teaching Verified Detail Store：3,758 筆歷史核對明細、190 個核對完成群組。
- HIST_DIAG_ENRICHMENT：5 期 162 筆、11,564 人次的學校／子測驗補齊，**覆蓋**既有同群組明細，不加計。
- HIST_DIAG_SUPPLEMENT：110.9 美崙八年級去重淨增 661 人次，6 項子測驗／科目，**在驗證群組總量後補計**。
- HIST_DIAG_RAW_AUTHORITY：111.6 國教署 162 筆原始優先明細，整群 2,739 → 2,738，20 欄含 group_baseline；**整期替換原先的 78 筆官方彙整，不能追加**。
- 不要直接把這三頁的數字全部相加；合併順序由教學前端邏輯決定。

權限：同仁各自登入 Google，使用 https://www.googleapis.com/auth/spreadsheets.readonly。群組 passion-data@rcpet.edu.tw 曾對三份 Sheet 授與 Viewer，另有個別分享；實際授權仍應以 Drive 權限為準。OAuth hosted_domain=rcpet.edu.tw 只是帳號提示，**不是安全驗證或資料授權規則**。OAuth Testing／測試者名單在未經使用者同意前勿擅改。

## 3. 診斷資料的統計口徑（不可破壞）

- 指標是**施測人次**，不是不重複學生人數。同一學生可跨科目／測次累計。
- 國文和數學按各自實際有效施測紀錄計數。
- **英語文法、詞彙、聽力、閱讀四項分別計數**；未完成四項很常見，不能乘四、也不能當作異常。
- 0 分仍可能是有效施測；空白、未施測、缺少有效紀錄不計。
- 判斷期別時應查實際施測日期，不能只信 xlsx 檔名；跨期重複以可核對的同筆施測證據為準。
- 去識別掃描過程發現部分原始 Excel 仍含學號／座號／系統碼類欄位值；視為**可能含個資**，不得貼進 handoff、公開 repo、公開 Sheets 或網站。報表應只輸出聚合數及不可反推出學生身份的差異。
- 原始 Excel 保持原樣。排重必須有可追溯的對應紀錄，且只從重複的期別排除。

## 4. 前端的三層合併契約

1. 基底：TEACHING_FACTS（含歷史總覽與 115.01 的 raw aggregate），由 canonicalizeTeaching 解析。
2. 已核對歷史明細：Verified Detail Store 替換完全一致的「metric_type|project|ROC period」總覽群組，未核對者保留原總覽。
3. HIST_DIAG_ENRICHMENT：overlayHistoricalDiagnosticEnrichment 逐子測驗比較，只有舊明細與新明細每項和數都完全一致才能整群替換，**不增總人次**。
4. HIST_DIAG_RAW_AUTHORITY：applyOriginalPriorityHistoricalReplacement 讀 A:T，核對舊群組 baseline、新群組 target、每個 school × item 全部覆蓋、學校與年級無重複後**整期替換**。
5. HIST_DIAG_SUPPLEMENT：applyApprovedHistoricalSupplements 驗證來源項目、無重複、同群組 baseline + approved supplement == group_target，才附加核准的**真正新增**人次；驗證失敗應 fail closed（停止載入），絕不可默默部分套用。

注意：上述順序不得隨意顛倒。索引中的 active/verified_staging 是稽核狀態；目前網站載入仍以 config 的分頁及程式內檢查為主，**不能假設索引狀態本身就是前端載入開關**。

## 5. 已完成的里程碑與目前數字

### 既有資料

- 教學基本 facts：437 筆（223 歷史總覽＋214 筆 115.01 原始統計）。
- 歷史核對明細：3,758 筆／190 個 metric × project × period 群組。
- 115.01 原始檔重建 1,500 診斷人次：國教署 1,400＋USR 100（已存在，不要重複補）。
- 在 110.9 補計前，網站診斷總人次為 120,832；扎根班 2,305；扎根人次 15,791。
- 加上 110.9 核准的 661 後，診斷總人次為 121,493；進一步將 111.6 國教署以原始去重後 2,738 替換大表 2,739，**診斷總人次預期為 121,492**。這是計算驗收目標，未實際登入不可稱瀏覽器端總數已驗收。扎根相關指標不應被此批次改動。

### 28 期歷史 Excel

- 10509–11409 共 28 份、84 張科目工作表，掃描出候選 57,724 診斷人次。
- 第二階段有 38,872 人次的核對候選，但不能整批附加：部分既有相同明細、部分仍有差異。
- 第三階段已上線：105.9、106.1、106.6、106.9、107.6，**11,564 人次／162 筆逐校明細**，因為只是補齊，原總人次不變。
- 108.6 美崙國中 36 英語人次，使用者確認歸入 USR／FB；官方 USR／FB 總覽去重仍待查，**尚未加計**。
- 對校用的本機 Excel／ZIP 檢查點存在先前對話的成果附件；**不可假定新對話環境永遠有 /mnt/data 下相同檔案**。若缺檔，先從對話／Project Files／使用者重新提供的原檔恢復，勿憑本文件臆造逐筆結果。

## 6. 110.9：已核准補計／仍待解決

已確認（2026-10-08）：
- 美崙國中逐年增加一個年級參與。110.9 **八年級 673 候選人次歸國教署**。
- 其中 12 筆國文施測日期較早，逐筆比對 11006 與 11009，與 110.06 同一筆紀錄唯一吻合；只保留原期，110.9 **去重後 661**：國文 113、英語文法 106／詞彙 106／聽力 106／閱讀 106、數學 124。
- 原國教署 110.9 1,311 → 核准補計後 **1,972**；本期各計畫合計原 2,090 → **2,751**。
- HIST_DIAG_SUPPLEMENT 6 行已入庫，前端驗證 group_target=1,972；保留原歷史大表，不硬改其舊數字。
- 雲林 48、光華高工 567：使用者指定依大表即可，不補細項。

仍待解決：
- **平和國中英語四項各 19，合 76**，已確認歸 USR／FB；但原官方 USR 總覽 164，逐校明細 240（差 76）。計畫歸屬已確定，不等於可以直接加總。待確認總覽漏計或其他來源／期別重複。
- 國教署東里國中國文 -1、數學 -2；卓楓國小數學 -1（合 4 人次）；原始匯出與大表不一致，現無證據補造資料，沿用官方大表值。

## 7. 111.6 前一輪差異分析（以下已由第 11 節新結果取代）

最新已分析結果（**尚未修正式績效總數**）：
- 國教署原始檔對應 2,750，官方大表 2,739，**差 +11 人次**。
- 78 組學校 × 診斷項目：67 組吻合；11 組待確認。
- 富北國中：原始檔比大表 **少 6**（國文、數學、英語四項各少 1）。原始 296 vs 大表 302。
- 寧埔國小數學：原始比大表 **多 5**（五年級 5＋六年級 8；大表 8）。五年級是否另外歸屬尚待核對。
- 美崙國中英語：文法、詞彙、聽力、閱讀**每項多 3**，合 +12。英語四項都有有效施測；不可按國文／數學推估要扣掉誰。下一步應比對施測日期、測次與相鄰 111.1／111.9 或已有來源，辨認是否重複。
- 111.6 USR／FB **162 人次與官方總覽相符**，不重複匯入。
- 光華高工 950、花蓮教育處 1,000：大表有數，原始匯出不涵蓋；沿用官方值，不補造細項。

建議續作順序：
1. 查 111.6 美崙每項多 3 的測驗識別／施測日期，必要時對前後相鄰期別做唯一比對；防止把四項測驗「分項有效」誤判成重複。
2. 查寧埔五年級 5 人次參與期間與計畫，以及富北六項各差 1 的來源。
3. 證據齊全時才建立新增／整群替換候選；保留官方 2,739 為基準，先提供差異與調整理由。
4. 111.6 完成後，再查 113.6 等大差異期別；避免一次跑完所有期造成中斷。
5. 更新 HIST_DIAG_DECISIONS、RECONCILIATION_DIFFS／PENDING_REVIEW 的決議（不得把「計畫已確定」冒充「數量已對平」）。

## 8. 驗收與部署

- 私有 source repo：
  - 在 web/ 下執行 node --test tests/*.test.mjs。
  - Python 參考實作仍可依原 repo README 執行 pytest -q；不是網站 production runtime。
- 公開 repo：
  - 在 data-query/ 下執行 node --test tests/*.test.mjs。
  - GitHub Actions 工作流程「PASSION data-query tests」與「pages build and deployment」都必須 PASS。
  - 截至 2026-10-08，已核查 main 版本 72abe92c896df64c0e78a99705136f7061bcbf46 的測試和 Pages 部署為 success。**版本會繼續前進，不可 reset 回此 SHA。**
- 用獲授權帳號在教學頁手動按「重新讀取」，驗證整體總數、110.9 國教署 1,972、本期全計畫 2,751；再篩國教署、美崙國中、八年級、英語子測驗查六行明細。登入實測與 CI success 是不同驗收，不能混為一談。
- 任何新增：先檢查 Google Sheet 完整欄位／索引及當前內容，寫入 staging 或獨立頁籤，讀回確認數量、群組、來源；前端採明確替換或經核准補計，fail closed，再同步雙 repo 及更新 handoff。
- 若 GitHub Pages 暫時顯示舊版本，先核對 latest Actions、部署完成時間與瀏覽器快取，不要為了刷新而重複匯入數據。

## 9. 安全與禁止事項

**絕不公開**學生姓名、學號、座號、測驗紀錄逐筆表、敏感原始 Excel、access token、service account JSON、OAuth client secret。GitHub 公開 repo 僅存靜態前端與不含個資的開發文件。原始資料應在授權的私有位置以最小權限處理，僅把已通過對校的聚合數寫入授權 Google Sheet。

嚴禁：
- 因大表與原始匯出不一致就擅自改官方數字；
- 把英語四項固定乘四或當成同一人數；
- 未核對既有群組就直接 append；
- 因來源檔名相同月份就忽略逐筆真實日期；
- 使用學校／年級／成績的弱相似性直接刪資料；
- 為方便前端顯示而更改實際項目歸屬；
- 在公開 GitHub commit 任何原始學生紀錄或用於識別個人的比對鍵。

## 10. 新對話第一句建議

「請先讀取 futurenowchen/passion-activity-data 的 HANDOFF.md（PASSION 資料檢視平臺），再對照公開 data-query/HANDOFF.md 與 Google Sheets。111.6 國教署已按原始檔排重 12 英語子測驗人次後整群替換為 2,738；請繼續 113.6 與 110.9 未解差異，維持 110.9 美崙 661 補計不動。」

本 handoff 是工作交接而非不可變的統計真值；**以最新的原始資料、大表、正式資料庫讀回結果與明確人工確認為最高優先證據**。

## 11. 111.6 已採用「原始材料優先，除非重複」新決議（2026-10-08）

- 使用者確認：**若大表與原始資料不同，原則上採原始有效施測資料；只有有充分依據的重複才扣除**。英語文法／詞彙／聽力／閱讀仍各自算一次，不可乘四或用其他科目人數設上限。
- 11106資料.xlsx：國教署原始 2,750 人次；美崙八年級英語資料有 3 組**同班、相鄰原始列且 18 個測驗欄完全一致**，每組僅「學生狀況」不同。原始英語檔**沒有學號**，因此是高度可信的「匯出重複」判斷，不可虛稱已身分級唯一配對。每組影響四項子測驗，所以 3×4＝12 人次。
- 國教署去重後：**2,750－12＝2,738**；原大表 2,739，整期淨變化 -1。美崙英語每項 234→231、與大表相同。
- 富北國中原始較大表六項各少1（共 -6），依原始 296；寧埔國小數學五年級5＋六年級8，採原始13（比大表多5）。
- 111.6 的其他學校 78/78 school×item 群組已有來源對應，已產出 162 筆分年級彙總，並寫入 Verified Detail Store 的 **HIST_DIAG_RAW_AUTHORITY**（A:T），讀回總數2,738，僅保存彙總不含學號。
- 前端依序「原 overview → 已核對 detail → 早期 enrichment → **111.6 原始優先完整群組替換** → 110.9 核准 supplement」。每群驗證 baseline=2,739、target=2,738、78個學校項目全覆蓋、school×grade×item不重複，未對平 fail closed。
- 111.6 USR/FB 162、光華高工950、花蓮教育處1000均**維持原有值**，不重複入庫。
- 需做登入介面核對（若尚無實測）：全系統診斷**121,492**、111.6 國教署**2,738**、110.9 國教署**1,972**、扎根班**2,305**、扎根人次**15,791**；前端與 Google Sheets CI/寫入驗證不等於實際 OAuth 帳號 UI 驗收。
- 原始掃描／報告／可重跑檢查點：先前會話的 `historical_diagnostic_stage4_1116/original_priority_v2/`，包括 `PASSION_1116_原始優先_去重與整組替換核對.xlsx`、`PASSION_1116_原始優先_檢查點.zip`，不要把原始學生 Excel 加入 GitHub。
- **下一步**：113.6 大差異期別；另 110.9 平和國中英語76及東里／卓楓差4尚未解決，新「原始優先」原則也需套用到這些遺留項，但必須先追蹤來源及跨期重複，切勿擅自補造缺少紀錄。

## 12. 113.6 USR／FB 差額已定位，仍禁止入庫（2026-10-08）

- 本輪已讀回正式 Teaching Data Hub 的 `PENDING_REVIEW`：113.6 USR 官方總覽 **109**、逐校 **154**、差額 **+45**；目前仍為 pending。
- 從既存的 `PASSION_historical_diagnostic_stage2_reconciliation.xlsx` 聚合對校檢查點追索 `11306資料.xlsx`：吉貝25、富里40、海端39、望安5，前四校共 **109**，恰與官方總覽相等；萬榮國中數學9、英語文法／詞彙／聽力／閱讀各9，共 **45**，恰是全期差額。此為差額**來源定位**，尚不足證明官方漏計。
- 同一檢查點中 `11301資料.xlsx` 的萬榮五項也各9，須進一步核對 113.1 與 113.6 的**實際施測日期、測次、唯一紀錄及有效成績**。聚合值相同不能當成學生級重複證據。
- 目前這個新對話沒有取得兩份原始 Excel 的可驗證逐筆內容；不能從 Stage2 聚合表推定兩期為同筆，更不能把 +45 直接納入原始優先替換。
- 已在正式 Sheet 更新 `PENDING_REVIEW!H4`，並新增 `HIST_DIAG_DECISIONS!A18:H18`，狀態 `GAP_LOCALIZED_PENDING_CROSS_PERIOD`；寫入後讀回 PASS。原 109、154、45 與既有公開指標維持不變。
- **下一個精確步驟**：在受控地端環境取得 11301 與 11306 原始 Excel，針對萬榮五項各9做跨期日期／記錄唯一性比對；原始個資僅在地端，僅將不可識別的聚合差異、可重跑判定及候選替換表帶回。證據不足就繼續 pending。
- 不改動既有 111.6 國教署 2,738、110.9 核准補計 661、全站**預期**診斷 121,492（仍待授權帳號實際 UI 驗收）。
