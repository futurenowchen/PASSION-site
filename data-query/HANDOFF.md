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

## 13. 113.6 原始檔跨期查重完成，25筆安全候選已入 staging（2026-10-08）

- 本輪取得使用者上傳的 `11301資料.xlsx`（SHA-256 `ee02b57420d7020a54d49fd5d7584559551d58fcb8cac7e96c1edf0d0e827851`）與 `11306資料.xlsx`（SHA-256 `82210225b5a96ea473fd7ac43a47151ec812d6eca5ef0546098c6df2ed2bcbf6`），於當前受控計算環境內讀取，未向 repo 傳遞識別資料。
- 113.6 USR/FB 五校原始有效分項計數：吉貝25、富里40、海端39、望安5、萬榮45，合計 **154**；每校數學、英文四項共 25 個 school×item，全數核對；大表官方 **109**。
- 萬榮兩期數學均9筆，9個同校班級學號組合相同，但實際日期完全不同（11301: 2023/12–2024/01；11306: 2024/06），九筆25題作答向量也全部不同；屬不同期有效測驗。英語兩期各9筆、四項各9，完整共同欄位成績組合無相同列、期內無完全重複列；但英語匯出**沒有學號與施測日期**，不得虛稱身分級一對一查重。
- 在正式 Verified Detail Store 新增 `HIST_DIAG_1136_STAGING`（sheetId=1425261136），20欄結構與原始優先資料相同，25筆分年級彙總合計154，所有 baseline=109、target=154；**已讀回驗證 PASS**，無個資。
- 在 Teaching Data Hub 已回寫 `PENDING_REVIEW!H4` 與 `HIST_DIAG_DECISIONS!A18:H18`，狀態 `SOURCE_RECONCILED_STAGED_NOT_LIVE`；已讀回確認。
- **尚未啟用正式前端替換，也未將109改為154。** 目前全系統預期仍是121,492；完成程式的 fail-closed 原始群組替換（驗109基準、154目標、5校×5項全覆蓋、不重複）與雙 repo 測試及部署後，預期才會成為 **121,537**，仍須 OAuth UI 驗收。切勿直接把45附加到109或在程式未驗證前將 staging 視為 active。
- 下一個精確步驟：讀私有 canonical repo `web/js/teaching-data.js`／`web/js/teaching.js` 與目前 Google Sheets staging，實作專用「overview-only 109 → 25-row detail 154」完整替換檢查、測試 fail-closed、同步到公開 `data-query/`、驗證 CI／Pages，最後才啟用 staging；110.9 平和76與國教署4仍待查。

## 14. 113.6 USR 原始優先完整替換已接入正式程式碼（2026-10-08）

- Stage 13 的原始查核與 `HIST_DIAG_1136_STAGING` 25列，已逐校逐項讀回：吉貝25、富里40、海端39、望安5、萬榮45；合計154。五校皆七年級；英文各項依有效紀錄分別計數。
- 原官方大表 `TEACHING_FACTS` 的 113.6 USR 109 **不覆寫**，由前端 `replaceApproved1136OverviewWithRaw()` 原子性移除其概要群組，換上 `HIST_DIAG_1136_STAGING` 完整25列；拒絕缺列、重複、學校／子項不符、數值篡動、基準不符或已存在同群組明細。
- 更新雙 repo `js/teaching-data.js`、`js/teaching.js`、`config.js`、`tests/teaching-data.test.mjs`、`teaching.html`。`web/` 與 `data-query/` 四個程式/測試檔案內容逐字相等；HTML 資產快取參數更新至 `20261008-10`。
- 已用本地獨立 Node 安全檢查 7/7 PASS（包括109→154、缺列、錯誤基準、重複、數字變更、年級錯誤、雙重群組）；原 repo 全套 GitHub Actions 測試與 Pages 發布狀態**本回合無法從工具確認**，不得虛稱 CI PASS。
- 正式 Teaching Data Hub 的 `VERIFIED_DETAIL_INDEX!A6:J6` 已登記新增批次 `hist-diag-original-priority-1136-20261008-v1`（active；25列、1群）；`PENDING_REVIEW!H4` 與 `HIST_DIAG_DECISIONS!F18:H18` 已更新、讀回 PASS。特別注意：索引是稽核狀態，真正啟用由前端明確讀取資料頁籤決定。
- 全系統診斷人次 **121,492＋45＝預期121,537**；扎根班2305、扎根人次15791、111.6國教署2738、110.9國教署1972均不得變動。**OAuth授權帳號瀏覽器畫面總量121537仍需人工實測**；在 Google 登入頁按「重新讀取」驗證。
- 下一期：110.9 平和國中英語76及東里／卓楓原始差4。不可在未重新取得原始表與去重證據時直接補計。

## 15. 110.9 原始 Excel 收到與逐科源頭查核（2026-10-08）

- 已收到 `11009資料.xlsx`（SHA-256: `f81711cc1bdece41e169c21d5bb08688da5cf0e8e548c499ddd77a54b0496f97`）與 `11006資料.xlsx`（SHA-256: `e8f18f23b4474cfccd1278878b8c852e62bc6220a4e6fdf648a8d694b7eef70a`），使用受控檔案環境以 openpyxl 做聚合查核，無原始學生識別資料外傳到 repo/Sheet。
- **平和國中 USR／FB 英語 76 尚無來源證實**：兩份 xlsx 的「英語」工作表均沒有平和國中列（均0）；`11009` 數學工作表有平和國中七年級29筆、全部已交卷、29個班級與學號組合唯一。官方 USR／FB 逐校細項含平和英語四項各19（共76），但不能把此官方數字當作這兩個原始 xlsx 的測驗結果，也不能因原檔缺席而宣稱76不曾施測。官方概覽164、逐校240、差76持續 pending，**不補計、不刪除**。
- **國教署東里／卓楓差4**：`11009` 東里國中國文8（官方9，-1；八筆施測日期均 2021-09-01）；東里國中數學8（官方10，-2）；卓楓國小數學7（五年級5、六年級2；官方8，-1）。這三個群組的11009原始分數都有有效值，數學均已交卷，三個群組內的班級／學號鍵無重複。
- **重要限制**：`11009` 數學檔沒有施測日期欄，不能聲稱完成同一學生跨期唯一測驗辨識；僅憑局部差-4無法判斷國教署110.9完整群組（官方1311、另補美崙八年級去重661）是否應整期調整。仍採完整群組原始優先、查重後才替換；不可直接減4。
- 正式 Teaching Data Hub 已回寫 `HIST_DIAG_DECISIONS!F2:H2`、`F6:H8` 與 `PENDING_REVIEW!H2`，狀態分別 `SOURCE_ABSENT_IN_11006_11009_ENGLISH_PENDING` 以及三項 `SOURCE_EXPORT_*_PENDING_FULL_COHORT`；回讀值 PASS，正式人次不變。
- 當前回合產出不含個資的 5 分頁核對檔 `PASSION_1109_原始資料對校_去識別報告.xlsx`，包含逐科來源覆蓋、官方差額與採信限制；未將任何原始學生識別碼帶入。
- **下一項精確工作**：追查平和英語每項19的真正施測原始檔（可能不是11006／11009這兩份匯出）、記錄時間與官方報表 164→240 的編製邏輯；另把110.9國教署整期 school×subject×grade 與完整原始覆蓋核對後，才能決定是否更換官方數字。若缺文件，保留 pending，不憑空更動。

## 16. 使用者核准 8 組明細優先，並行查核 114.9／111.1／110.9（2026-10-08）

- 使用者明確裁示：「花蓮教育處扎根班與人次，以明細為主；前項優先順序 1–3（114.9 USR／國教署、111.1 USR、110.9 國教署）一起查；光華高工 112.6 與芳和中學 111.1 以明細為主，不需再找原始資料。」雲林仍暫緩。
- 從使用者提供的正式母表 `20260819臺師大績效指標-PASSION診斷平台服務人次.xlsx` 取出：
  - `112-113花蓮教育處扎根班數` 113-1 **22→21**（-1）、113-2 **19→25**（+6）、114-1 **23→28**（+5），淨 **+10 班**；各期7/7/6筆學校／年級／寒暑期來源。
  - `112-113花蓮教育處扎根班人數` 113-1 **77→85**（+8）、113-2 **84→105**（+21）、114-1 **91→115**（+24），淨 **+53 人次**；各期7/7/6筆。
  - `光華越南芳和!E18:J20` 112.6 光華高工 高一／二／三，六項 **342+456+474=1,272**，此期總覽無數值，直接由已核准明細認列。
  - `光華越南芳和!E118:J118` 111.1 芳和國中（彙總計畫名稱「芳和中學」）六項僅數學 **49**，其餘0，此期總覽無值，已核准認列。
- 上述 8 群組 **64 筆無個資明細**已寫入 `PASSION Teaching Verified Detail Store` 的 `HIST_APPROVED_DETAIL_20261008`（sheetId=1425261140，A1:T65），獨立讀回8/8群、64列、來源座標不重複、總量全部 PASS。新增白底、淺灰標題、篩選、凍結首列。
- 兩個 repo 均同步 `teaching-data.js` 的 `applyApprovedHistoricalDetailDecisions()`、`teaching.js` 的讀取及完整群組替換、`config.js` 資料頁名、測試 `teaching-data.test.mjs`、`teaching.html` 資產版號 `20261008-11`。對根班／人次 **原子取代6群總覽**，對原無總覽的診斷2群確認 baseline=0 才新增，拒絕缺列／篡改數值／改基準／重複來源／重複套用／未核准組別。
- 隔離環境有鏡像安全驗收腳本 `test_passion_approved_cohorts.mjs`，Node 7/7 PASS；兩份 repo 原檔的 GitHub Actions CI 與 Pages 上線目前未能從工具取得確認，**不得寫成 CI PASS**，仍待登入畫面驗收。
- 正式 Teaching Data Hub 新增 `VERIFIED_DETAIL_INDEX!A7:J7`（active；8 groups／64 detail rows，3 root_class、3 root_person_time、2 diagnostic），更新 `PENDING_REVIEW!H3,H5:H9,H11:H15` 註記各自決議，讀回 PASS；舊大表總覽值與其他未核准群組保持不動。
- 相對前一輪 113.6 已核准但網站待驗收的預期 `診斷 121,537 / 扎根班 2,305 / 扎根人次 15,791`，本批淨 **診斷+1,321 / 扎根班+10 / 扎根人次+53**。新網站完整啟用後**預期** KPI：**診斷 122,858／扎根班 2,315／扎根人次 15,844**。尚未由 OAuth 實際畫面核實。
- 三個優先期別的合併查核：
  1. `114.9 USR` 官總覽29、分校154，+125 完全出自富里80、海端30、望安15；已有萬榮20、東里數學9合計29。高度疑似新增學校明細未回填，但尚未用 `11409資料.xlsx` 查實施測日期、跨期重複，仍 pending。
  2. `114.9 國教署` 官總覽2866、來源六項明細 `108-114國教署!V3:V9` 計2869，+3；未見對應 11409 原始紀錄，仍 pending。
  3. `111.1 USR` 官總覽262、三校明細富源90、萬榮45、平和145共280，+18；未見 `11101資料.xlsx` 原始來源，無法識別多出的18出自哪個測次，仍 pending。
  4. `110.9 國教署` 大表1311、已核准另補美崙去重661，前次11009原始核對的東里國文-1、數學-2、卓楓數學-1共-4，尚需**全期群組**核對，不能局部扣4。
- 雲林 110.6 的 658 vs 630，以及另一組587月份不一致，依使用者本輪「雲林先這樣」**保留待查、不變更**；110.9 平和英語76來源未證實亦不變。USR112-1扎根人次104 vs102仍 pending（使用者只授權花蓮教育處）。
- **下一個精確步驟**：驗證公開 GitHub Actions／Pages 與持授權帳號登入 Teaching Data Hub 顯示的 KPI 122858／2315／15844，並查找／接收 `11101資料.xlsx`、`11409資料.xlsx` 完成 111.1／114.9 診斷去重；110.9 國教署需整期重建 1311 比對，不得不經證據更動。保留原始個資僅地端查核。

## 17. 光華／芳和全期間聚合防重算交叉檢查（2026-10-08）

- 使用者指定的 `光華越南芳和` 工作表已以所有年／月與各年級原始月合計列交叉核算（只處理來源中的匿名／聚合數值，沒有學生識別資料）。
- 光華高工：`光華越南芳和` 所有月各年級加總 **12,224**；原 `資料總覽!B11` **10,952**；差 **+1,272**，恰為 `112.6` 高一342＋高二456＋高三474。除這期外，各月差額不存在。此次納入 1,272 不是疊加到既有相同期別；舊專案小計確實遺漏了此期。
- 芳和國中（母表計畫名稱芳和中學）：`光華越南芳和` 所有列加總 **8,184**；原 `資料總覽!B10` **8,135**；差 **+49**，恰為 `111.1` 的「109入學生」數學49，其他五項均為0。因此這筆也是漏期補列，非重複加計。
- 配合花蓮教育處 root_class +10、root_person_time +53，新預期總量維持診斷 **122,858**、扎根班 **2,315**、扎根人次 **15,844**；等待 Pages／OAuth 實際畫面驗收，不把 connector 未提供的 GitHub CI 結果寫成 PASS。
- 64列已新增並由雙 repo 相同程式碼使用；`PENDING_REVIEW` 已將六組扎根 `fact_count` 由舊暫存4校彙總，更新為實際核准的7／7／6列（共40列），光華18列、芳和6列；唯未核准的USR112-1仍保持原來2列。

## 18. 11101／11409 實測原始核對、兩期USR完整替換程式與國教署異常（2026-10-08）

- 使用者提供 `11101資料.xlsx`（SHA-256 `8286e3c0accc7e9df7f070ad4ec0548d22b22e7bd2a39afb71b6788736e2aa2d`）及 `11409資料.xlsx`（SHA-256 `a14e5fd2acd223ae95b21dbda6db56ef576673c4d6ca361e8cd816871b72f167`）。所有原始學生班級學號及答題數據僅在本地隔離讀取；GitHub 與 Google Sheets 僅聚合匿名學校×測驗項目統計。
- `111.1/USR`：原概要262，原始核對280=富源(18×5=90)+萬榮(9×5=45)+平和(29×5=145)。數學三校共56筆已交卷且同校班級學號唯一。比較11009的同學校／班級／學號測驗結果，匹配者25題作答向量無相同；英語56筆四分項完整且校內全成績行無完全相同。富源/萬榮英語測驗日期2022/01、平和英語實際2021/12下旬；111.1仍是來源批次期間，不可假稱每列都在2022/01實施。核對來源為完整15組 school×item。
- `114.9/USR`：原概要29，原始核對154=萬榮(4×5=20)+東里(僅數學9)+富里(16×5=80)+海端(6×5=30)+望安(3×5=15)。數學38筆均交卷且同校班級學號唯一；英語29筆四項分數完整，校內無完全相同分數列，但該檔英文**無學號與日期**，不得宣稱完成學生身分級查重。核對來源為21組 school×item。原大表109雲林不相關、保持暫緩。
- 在既有 `PASSION Teaching Verified Detail Store` 建立 `HIST_DIAG_USR_1111_1149_STAGING`（sheetId1425261141，A1:T37），共36筆、兩群，111.1=15列280 baseline262，114.9=21列154 baseline29，Google Sheets讀回逐項總數及學校項目唯一性 PASS。
- 兩repo同步新增 `replaceApprovedUSR1111And1149Overviews`，完整群組替換，不另把18／125加在原總覽之上；檢查固定36列、2群基準、來源檔名、學校×項目對應與筆數、完整合計、年級7、日期標示及重複加計。前端明確讀取新staging，`config.js`新增頁籤，`teaching.html`快取版號 `20261008-12`；原兩repo的`teaching-data.test.mjs`也新增正反向情境。獨立鏡像 Node 9/9 PASS；完整GitHub Actions／Pages／授權UI未能核實，不宣稱CI或UI PASS。
- 預期全系統KPI（需前端通過且無其他增減）：**診斷123001**（前已採認122858+111.1差18+114.9差125），扎根班2315、扎根人次15844；**114.9國教署不增加3**。
- **114.9 國教署不能採2869**：大表 `108-114國教署!V3:V9` 為國文331、英文四項535/535/533/534、數學401，小計2869，比總覽2866多3。但 `11409資料.xlsx` 原始數學國教署401完全吻合，國文可見379列（竹圍國中48未列入大表國文331）；國教署英語原始412行（文法412、詞彙412、聽力有分數409、閱讀有分數408），遠低於大表535/535/533/534。大表富北國中英文填184，實際原始只有12；竹圍國中英語49筆未出現在母表對應英文逐校記載。這是**更大範圍版本／學校歸屬異常**，必須另外比對完整來源才可動 2866，不能因差3直接加計，也不能用現有原始不完整覆蓋整組。
- **未完成事項／阻擋**：本輪嘗試將批次登錄 `Teaching Data Hub!VERIFIED_DETAIL_INDEX` 及將 `PENDING_REVIEW` 與 `HIST_DIAG_DECISIONS` 更新時，Google Sheets connector 回覆安全狀態無法確定、已封鎖；為避免繞過安全限制**未再重試任何替代寫法**，因此索引／決議仍是上一輪的舊狀態，不得虛稱已回寫。Staging已讀回保存、前端程式已更新；後續須在允許的授權工作流程下完成索引與決議更新。
- 精確下一步：確認兩repo相同HEAD檔案、GitHub Actions與Pages是否完成，授權帳號登入查詢總數應為123001／2315／15844；如未實測，維持UI_PENDING。其次追查114.9國教署英語富北184 vs12與竹圍49及國文48的來源版本與歸屬；110.9國教署整期比對與雲林保持原狀。

## 19. 雲林三批原始 Excel 本地查核＋網站資料層驗收（2026-10-08）

- 使用者提供 `11002雲林.zip`、`11006雲林.zip`、`11101雲林.zip`，指出其中含學生識別資料，要求繼續但不得再外傳。三個 ZIP 僅在執行環境中以記憶體內 `ZipFile + openpyxl` 查核；**未提交原 ZIP、個人姓名、學號、身份證字號、逐題作答至 GitHub／Google Drive／公開 Handoff**，成果僅是學校、科目、期別的不可逆彙總及測次差異敘述；對話中原始上傳則需使用者從介面自行刪除，不能由本程式撤回。
- `11006` **原始有效施測候選 618**：國文43（實際日期2021/06 21、2021/07 22；另1筆日期缺失排除）、英文文法／詞彙／聽力／閱讀 **各113**（4校合計每項水碓22、永光48、華南25、樟湖18；水碓各有1筆子測驗名稱欄空白但保留學生SN、測驗SN、成績和來源工作表類別，須人工確認認列）、數學123（4校水碓21、永光49、華南29、樟湖24；2021/06為112筆，2021/09為5筆，2021/10為6筆）。國文43+英文452+數學123=**618**，相對舊母表 `109雲林統計!E3:E8` 的 658 **差-40**。舊母表將英文四項全部填123，原始每項僅113，且123剛好是數學數字；可能為彙總誤植，不得在現有母表之外直接扣加40。先前明細630亦未得到原始支持。
- 注意英文 `場次時間` 部分記載2021/04，不可當成實際施測日期；可見的 `測驗日期` 多在2021/06，詞彙匯出無有效日期欄。數學 `11006` 集合檔已包括樟湖，ZIP 另有樟湖單獨檔，是同一批資料的重複**檔案**，只計一次；永光有同一班級學號兩個不同日期／不同答案測次，作人次計量不得以學生唯一數刪去。
- `11002` 數學已交卷113筆（樟湖18、水碓22、永光48、華南25）；英語綜合匯出113人、四項各113=452，合計565；原母表該期587另含國文22（**此 ZIP 沒有國文來源檔**），所以可交叉解釋 587=22+113×5，但不能宣稱國文原始已驗證。`11002` 英語逐筆測驗日期為2021/02 85人、2021/03 28人，不能將整批587當成2021年1月。母表 `109雲林統計!D2` 標示110.2、`資料總覽!R16` 卻是110.01，這是來源期別錯置待解，可能需支援「來源批次期間」與「實際測驗日期」兩種欄位。
- 跨期比對 `11002` vs `11006`：數學同校同班學號對應112組，但25題作答向量**0組完全相同**；英文共448組相同學校／班級／姓名×分項配對，分項分數完全相同54組、實際測驗月份無相同（可辨識者）。這是同學生跨次施測而非整批同份資料複製，不能對跨期相同學生直接去重。
- `11101` 英語四項各112、數學已交卷112、國文60，共可見620測驗人次；英語及數學的日期在2021/12、而來源檔名是11101，亦存在來源批次與實際日期差異，不能僅靠 ZIP 檔名判斷月份。
- **雲林未啟用新數字，也未修改原正式658／587**：缺少跨月歸屬規則決議，以及上述4筆英語欠缺子測驗名稱的核准；在正式確認前，618是候選、不是最終核定總數。只在本地完成聚合核對，不把學生級結果寫入雲端。
- 使用者說「竹國國中是國教署計畫」；目前 Teaching Data Hub `DIM_SCHOOLS` 的校名為「竹圍國中」，`PROJECT_ASSIGNMENTS` 既已將竹圍國中六項都歸國教署，無需修改該校已有的歸屬。**不得在未核實名稱前自動把竹國視為竹圍／改名**；114.9 國教署英文來源與大表差異仍待對校。
- **網站驗收現況**：已獨立核對兩repo五對內容鏡像 `teaching-data.js`／`teaching.js`／`config.js`／測試檔／`teaching.html` 全部位元內容一致，HTML cache token `20261008-12`；Google Sheets `TEACHING_FACTS` 基準診斷120832、扎根班2305、扎根人次15791，approved cohorts、111.6原始2738、110.9美崙補661、113.6USR154、111.1USR280、114.9USR154 全部按組數/目標讀回一致。若完整前端載入，預期KPI **診斷123001、扎根班2315、扎根人次15844**。
- GitHub public HEAD為 `ec0ef37b812c483b26de077e39ce0f379d226df7`，private HEAD為 `d90539d89c044420f8d468be0ef51f60c7c3b0ce`（本節新增前）；public HEAD提交狀態與PR workflow run查詢均是**空清單**，無法用此證明 CI PASS。公開 Pages 網頁在本執行環境無法連線（DNS/抓取失敗）；需要真實Google OAuth 的UI亦不可從對話存取。**資料及repo一致性 PASS，CI/Pages/OAuth UI 尚未驗收，不得宣稱全系統通過**。
- 正式 Hub 的 `VERIFIED_DETAIL_INDEX` 尚未有 `111.1／114.9 USR` 批次行，上一輪Google Sheets批次回寫因安全狀態不確定被阻擋，未再以替代方法繞過；現有前端是直接讀 staging，不以索引列作讀取條件。此治理差異仍須在正常授權路徑補正。
- 下一個具體動作：以校方權責核准「雲林按來源批次還是按真實日期」的時間口徑（必要時建立雙欄），及水碓英語4筆欄位缺失測驗認列；再產去識別24筆 school×item 新批次，以整組 `110.6 雲林` **658→618** 取代而非新增，先跑 fail-closed QA。不得直接修改原總覽／未經OAuth驗收的網站數值；避開原始學生資料上傳。

## 20. 雲林後續施測一律回歸原場次：使用者確認的統計權責規則（2026-10-08）

- **最高優先口徑**：使用者明確回覆「後面施測是補測，歸於同一個場次」。原始匯出中晚於主施測日期的補測紀錄，應隨**來源原場次／活動批次**統計，**不因學生實際作答月份不同而新增、分拆、移往另一月份**。另保留「實際施測日期」供內部查驗，不能以此改寫正式活動歸屬。
- **糾正第19節的推論**：11006 雲林數學中 2021/06 112筆、2021/09 5筆、2021/10 6筆，共123筆已交卷，這些後續補測按使用者口徑仍屬 **110.6場次**，不是11筆月份錯置，也不應拆去110.9／110.10。國文中的7月補測亦留原場次。
- **11002 雲林**：英語2、3月的補測屬同一來源 **110.2場次**，不拆月份；原母表 `109雲林統計!D2=110.2` 與 `資料總覽!R16=110.01` 之間的**活動批次標籤不一致**仍待校正，不得把587分到兩期或憑月份多加。
- **11101 雲林**：2021/12施測但屬111.1原始活動場次者，保留111.1歸屬；後續補測實際日期只作稽核，不另計成另一批次。
- **重要保留**：同一場次同一學生同一測驗項目如有多筆不同日期作答，這項「補測歸原場次」決議**不等於自動核准重複認列**。必須查清是否為補考、重測、單次有效成績或不同有效測次，建立同場次內的去重規則；不直接以「學號重複」刪除，也不直接一律把多次作答全部加計。
- 11006母表658，原始檔去識別彙總候選618（國文43、英文四項各113、數學123），**差-40主要來自英文四項各-10，非跨月補測造成**。英文四項各有1筆子測驗名稱空白但有成績的來源型別推定，仍待確認認列；618尚未核定，**正式658不動**。
- 11002官方587暫留不動；已知 ZIP 中英語452＋數學113＝565、國文22不在該包的逐筆原始來源中，587仍要對校。亦不改動整體正式 KPI。
- 已在正式 `PASSION Teaching Data Hub` 的 `HIST_DIAG_DECISIONS!A19:H20` 寫入 `110.6` 與 `110.2` 兩條去識別決議，寫後讀回一致；狀態為 `MAKEUP_SAME_SESSION_RULE_CONFIRMED_SOURCE_COUNT_PENDING`、`SESSION_11002_NOT_SEPARATE_BY_MAKEUP_DATE`，**沒有變動TEACHING_FACTS、Verified Detail Store或公開查詢數字**。
- 下一項精確動作：以此場次優先規則檢查11006同場次同人同項目的多次交卷及4筆英文子測驗空白來源認列，形成嚴格去重後的學校×項目總數，再決定658的整批替換目標。僅使用匿名聚合結果向GitHub／Google Sheets回寫；原始學生可識別資料不得提交外部平台。

## 21. 雲林場次去重修復完成（2026-10-08）

- 使用者再次確認：**11002 雲林場次應歸「110.02」而非原大表方便加總的110.01**；晚到補測仍歸原場次，不能按個人後測日期拆期；統計以原始有效紀錄為準。
- 11002 原始 ZIP：**國文22、英文文法／詞彙／聽力／閱讀各113、數學113，共587**，同場次身份沒有可確證重複，總人次不變。Teaching Data Hub `TEACHING_FACTS!D253=2021-02-01`、`E253=2021-02-28`、`H253=下學期`；Verified Detail Store `PASSION Teaching Verified Detail Store!A2166:A2186` 21列 group_key 從 `diagnostic_person_time|雲林|110.1` 改為 `diagnostic_person_time|雲林|110.2`。兩個工作簿皆已讀回正確，587 **只移期，未重複加計**。
- 11006 ZIP 依校／科／有效測次回核：**國文43**（44列中1列無日期且「整體閱讀理解能力」非有效數值）、**英語四項各112**（各113列中水碓國小1列測驗狀態為0、分數無正向有效值，應排除；有效4×112=448）、**數學123**（均已交卷）。數學出現1組「班級＋學號」碰撞，但**姓名不同**，非同一學生，不可錯扣一筆。合計 **43+448+123=614**，舊原總覽／既有六筆不分校科目摘要為658，**淨 -44**。原始來源中樟湖數學單校檔已完整包含於整合檔，不能重算。
- 11101 ZIP 校驗：國文60（61列中1列無日期、亦無有效整體分數）；英語112×4=448；數學112已交卷，共 **620**，既有雲林 `110.12` 群組數字不變。數學及國文各有班級學號相同但**姓名不同**的碰撞，不能單憑學號去重；當期無核准移期指示，因此不自行改110.12期間。
- 三包ZIP原始學生姓名、學號／身份證字號、逐題作答**只在本地使用**，未發送GitHub或Google Sheets；Google Sheet只保存四校×六項24列匿名分項統計。包含個資樣本的本地臨時檢視檔已刪除；用戶上傳的附件仍在本次對話，需由用戶自行處理。
- 新增 `PASSION Teaching Verified Detail Store!HIST_DIAG_YUNLIN_1106_VERIFIED`（sheetId=1425261142，A1:T25），四校各6項24列，水碓126、永光253、華南135、樟湖100，總量614，baseline658，讀回24/24與四校總數驗證PASS。
- 雙repo `teaching-data.js` 新增 `replaceYunlin1106WithDedupedSource`：只有看到既存六項基準43/123/123/123/123/123＝658，且匿名分校24列完整吻合固定名單、目標614、來源11006、期別110.6，才整組原子替換，不額外增減44；前端 `teaching.js` 讀新頁，`config.js` 指定頁籤，`teaching.html` cache token `20261008-13`，原repo測試新增11+個正反向案例與110.02群組驗收。
- 真實 GitHub Actions **PASS**：公開 `PASSION data-query tests` run 37748166416 head `0d44ddd826304d4ff45d90f9e942c5f347c45d4b` 結論 success；公開 `pages build and deployment` run 37748165201 同一head結論 success。先前測試最初FAIL（測試比對錯誤訊息regex太窄），已改正後實際綠燈。Handoff 本身更新後的最新head如有新執行，仍須再次核驗。
- `PASSION Teaching Data Hub!VERIFIED_DETAIL_INDEX!A8:J9` 新補111.1/114.9 USR 36列以及雲林110.6 24列索引，均 active；`HIST_DIAG_DECISIONS!A19:H21` 已記錄110.6=-44、110.2只移期、110.12=620不動，寫入後讀回一致。另修正 `PENDING_REVIEW!H3/H5` 111.1與114.9USR過時的「尚未原始查驗」敘述，改為已核對與已接入前端。
- 依先前核准的原總量 123001／2315／15844，採納110.6 **-44**、110.02 **0**、110.12 **0** 後，正式查詢**預期**總量為 **診斷122957、扎根班2315、扎根人次15844**。CI／Pages 已成功，但 OAuth 授權的實際查詢頁尚未在本回合親自看到顯示值，因此仍為 `UI_ACCEPTANCE_PENDING`；不得將預期當作實測。
- 下一項精確行動：授權帳號登入 `https://futurenowchen.github.io/PASSION-site/data-query/teaching.html`，查診斷122957、扎根2315／15844、雲林110.02=587、110.06=614（分校且無「未填」）、原110.12=620，確定未重複或顯示錯期。其餘 114.9 國教署富北/竹圍、110.9平和等未決資料不動。

## 22. Aggregate-only acceptance gate deployment checkpoint（2026-10-08）

- 兩 repo 新增 `js/teaching-acceptance.js`、`tests/teaching-acceptance.test.mjs`，七項基準測試：診斷122957、扎根班2315、扎根人次15844、雲林110.2=587、110.6=614、110.12=620、110.6四校六項24筆不缺不重。含合計漂移、缺校、錯月、空資料反向測試；僅用匿名聚合，無學生姓名／學號。
- `teaching.js` 完成使用真實已合併且未篩選的 records 的驗收入口；網址 `teaching.html?acceptance=1` 經正常 Google OAuth 後顯示七項 PASS/FAIL、實際和預期值。一般 `teaching.html` 不顯示驗收；cache token 20261008-14。公開與私有對應 teaching.js、teaching.html、驗收模組及測試已雙向同步。
- 兩 repo 寫入已由 GitHub connector 回覆 commit SHA。**尚未驗收**：此最新 HEAD 的完整 GitHub Actions 流程及 Pages/OAuth UI；commit status/workflow_runs 搜尋回空集合，不能據此宣稱 CI PASS。公開 Pages 在目前網頁讀取環境仍無法實際訪問。下一動作是授權帳號開啟 `https://futurenowchen.github.io/PASSION-site/data-query/teaching.html?acceptance=1`，核對七項全部 PASS，再核對 Actions；若 FAIL 先停下查差異，不要改資料以湊數。
- 本輪未更動 Google Sheet 內容或原始學生資料，原附件安全刪除仍由對話擁有人處理。其餘 114.9 國教署及 110.9 平和未決統計不可自行批准。

## 23. 全期歷史資料清理總帳與來源稽核（2026-10-08）

- 依正式 Teaching Data Hub 現有 `PENDING_REVIEW!A1:H15` 共14個總表差異，以及 `HIST_DIAG_DECISIONS` 另外三項 110.9 國教署分項與108.6美崙USR英語36，建立 `HIST_CLEANUP_CONTROL!A1:L19`（header +18項；11項已核准而OAuth待驗收，7項仍缺完整證據：USR110.9平和76、國教署114.9差3、USR112-1扎根-2、國教署110.9東里國文-1/數學-2與卓楓數學-1，以及108.6美崙英語36）。這些項目彼此有群組關係，不能將差額直接相加。
- 新增 `HIST_PERIOD_SOURCE_AUDIT!A1:I29`（28期 + header），取來源 `PASSION_historical_diagnostic_stage2_reconciliation.xlsx` 的歷史快照：原始候選57724、當時已歸屬46840、待歸屬10848、排除36。這是**舊版第二階段快照**，其中許多已由後續檢查解決，不能將10848當成現在未入庫人次，也不得按期直接補計。
- 兩張表已由 Google Sheets 實際寫入、讀回核實首尾及待確認群組；一律匿名聚合。舊 `PENDING_REVIEW`、`HIST_DIAG_DECISIONS`、`TEACHING_FACTS`、Verified Detail Store 完全保留，**本輪沒有調整任何正式人次、班數或前端程式**。
- 已確認既有有效決議保持不動：雲林110.02=587、110.06=614、原110.12=620，110.9美崙已核准淨增661，111.6原始優先2738，113.6 USR154，111.1 USR280，114.9 USR154，花蓮教育處扎根與光華/芳和補列不重複計數。
- **未完成全期原始逐筆清理**：當前能取得舊聚合檢查點與正式Sheet，但沒有完整28份可在受控本地逐筆查核的原始來源；不能將本次「全期盤點已建帳」誤宣稱為「歷史資料全部清理結案」。須優先取得110.9平和英語施測來源及國教署110.9完整群組、114.9國教署完整來源、USR112-1扎根原始明細、108.6美崙跨期證據。原始識別資料只在授權地端處理。
- 網站預期KPI維持診斷122957／扎根班2315／扎根人次15844；OAuth UI/最新Actions仍待獨立核驗。下一步是逐列稽核 `HIST_CLEANUP_CONTROL` 中七個 pending，不得為了結案隨意把差額歸零。

## 24. 計量核定花蓮教育處六期診斷資料上線（2026-10-08）

- 使用者明確指示：**以計量單位提供的六期正式科目總數為準，立即更新查詢資料庫**；不等待逐筆學生Excel。舊六期統計按既有細項及歷史概覽合計3420，計量新版六期總計2878，淨-542；網站預期診斷由122957→**122415**，扎根班2315、扎根人次15844不動。
- 新增 Verified Detail Store `HIST_HUALIEN_METERING_20261008!A1:T19`，六群、18列（詞彙／聽力／SRE閱讀平台各一），數字為：113.1–2含112.11–12 [183,168,171] 522；113.5–6 [147,145,157] 449；113.9–114.2 [180,180,179] 539；114.5–6 [186,185,172] 543；114.9–115.4 [113,113,113] 339；115.5–6 [168,168,150] 486。已由Sheets寫入與實際讀回，六群18列合計2878。
- 原舊分期群組共七組：112.12與113.1合併計量首期528，其餘113.6=474、113.9=470、114.6=1048、114.9=414、115.6=486；新函式 `replaceHualienMeteringPeriods` 在其他既有調整後做整批原子替換，固定檢查每一期既有總量、18列核定值、來源及不重複；SRE保留獨立`diagnostic_item`，不得當英語閱讀。舊來源留存供稽核，不直接覆寫。
- 計量文字表的`114.9–115.4`秀林國中聽力個別學校記為129，但計量正式該期聽力總數113；因矛盾，**只採計量正式科目合計，不製造學校分項**，在資料註記明確標為待校；另115.5–6學校數`4(4+1)`應是5校，未用以調整人次。新版全部18列都暫不沿用舊學校明細，避免將舊版本視為計量新版學校數。
- 公開與私有 repo `teaching-data.js`、`teaching.js`、`config.js`、`teaching-acceptance.js`、測試、`teaching.html`均已同步；cache token `20261008-15`。正式Hub `VERIFIED_DETAIL_INDEX!A10:J10` 登記active 6群/18列。先前已核准的花蓮教育處扎根班/人次更正不撤銷。
- **待獨立驗證**：此最新版本的完整 node tests、GitHub Actions/Pages、Google OAuth 登入後的實際UI。嘗試從本執行環境clone公開repo因環境網路/憑證未成功，不能宣稱node測試PASS；需比對新KPI122415及計量六期2878，若有任何FAIL不可直接改數湊合。學生原始資料未上傳。

## 25. Three original Excel recheck (2026-10-08, aggregate-only)

User uploaded local-only `11009資料.xlsx`, `11409資料.xlsx`, `10806資料.xlsx` for 110.9/114.9/108.6 source reconciliation. Used openpyxl on mounted local files, output only school/item aggregate and nonidentifying audit; no student rows, names, IDs, grades, scores or original bytes were written to Sheets, GitHub, or any remote service. Source SHA256: 11009=f81711cc1bdece41e169c21d5bb08688da5cf0e8e548c499ddd77a54b0496f97; 11409=a14e5fd2acd223ae95b21dbda6db56ef576673c4d6ca361e8cd816871b72f167; 10806=d8fc8bd4d25c0cbfbc431ba58fc7e26fcbf377f7cc552b4b966dbf9464a87841.

- 11009: full raw effective person-times 2144 = Chinese342 + English 351×4 + Math398; verified USR group 164 = 富源90 + 萬榮45 + 平和math29, exactly matches official USR 164. 平和 English has **0 source rows**; school-detail 19×4=76 has not been substantiated, so no +76. 國教署 東里國中國文8 (official9), math8 (official10), 卓楓國小math7 (official8); all 23 target subject rows have unique class+student keys inside each school/subject, math 已交卷; full-cohort, adjacent-period proof still needed; no partial -4.
- 11409: full mixed-project effective person-times 2575 = Chinese379 + English 詞彙441/文法441/聽力438/閱讀437 + Math439. Previously authorized USR154 independently matched: 富里80, 海端30, 萬榮20, 望安15, 東里math9. Official 國教署 summary2866 vs six project-item official subtotal2869 (+3) **cannot** be adjudicated using this mixed-project raw file; the raw file alone is not equivalent to complete 2869 國教署 source. Do not +3 and do not reverse already-approved USR154.
- 10806: complete source effective3911. 美崙國中2019-06 English 12 rows × [文法、詞彙、聽力] 12 each =36, 閱讀0, source has no student ID, '扎根' flags marked 無 do not settle project affiliation. Existing user's USR/FB attribution remains but cross-period de-duplication and official USR totals remain outstanding; do not +36.
- Hub `HIST_RAW_RECHECK_20261008!A1:J12` created as 11-item aggregate audit with the above status, and PENDING_REVIEW!H2/H6, HIST_CLEANUP_CONTROL!K2/K6/K19, HIST_DIAG_DECISIONS!G2:H2 updated in place; connector write and readback succeeded. Other 2026-10-08 prior approved decisions and all fact values **unchanged**; query baseline remains **diagnostic 122415, root_class2315, root_person_time15844** (OAuth UI/Actions independent verification outstanding).
- Next exact evidence: for 110.9 平和 English, another dated export or official school-detail compiler source; for 114.9 國教署, a complete matched project-level original source plus baseline reconciliation; for 108.6 美崙, adjacent-period English exports/official USR period totals for duplicates; 110.9 國教署 whole-cohort source coverage before any -4. The local original attachments are sensitive and user should remove the chat attachments/conversation when no longer needed.

## 26. 官方績效母表補齊 114.9 國教署 +3 跨表差異（2026-10-08）

- 使用者上傳來源 `20260819臺師大績效指標-PASSION診斷平台服務人次.xlsx`（本機解析；無學生名單上傳）。`資料總覽!S37` 唯一舊數2866；同檔 `108-114國教署!V3:V8` 六項為國文331、文法535、詞彙535、聽力533、閱讀534、數學401，合計2869；`V9` 2869，`V10` 累計28979（前期 `U10` 26110，差2869）。每科均由原檔 `V17:V28` 9校分項逐校加總，54筆完整一致；故採 **同檔已經自洽的正式2869**，非11409原始檔找到三名漏計學生。
- 保留舊 `TEACHING_FACTS` 2866 當歷史底帳；Verified Detail Store 建 `HIST_DIAG_NMOE_1149_20261008!A1:T55`（54匿名學校×科目，6項各9校、合2869），寫入及讀回驗證。雙 repo 前端新增 `replaceNational1149Official`：僅在現有單一歷史群組2866、54列完整、六科總量及來源對平才整組替換至2869，不得直接加3；原114.9 USR154、花蓮計量六期2878、扎根資料均不動。
- Hub `PENDING_REVIEW!H6`、`HIST_CLEANUP_CONTROL!I6:L6`、`HIST_RAW_RECHECK_20261008!G10:I10` 及 `VERIFIED_DETAIL_INDEX!A11:J11` 已回寫／讀回；狀態從 SOURCE_REVIEW_PENDING→APPROVED_UI_PENDING。更新驗收總人次**122415→122418**，扎根班2315、人次15844不變；cache token **20261008-16**。公開私有 `teaching-data.js`、`teaching.js`、`config.js`、`teaching-acceptance.js`、test files、`teaching.html` 同步完成。
- 第二附件 `11101比較_遠距學生前後側分析.xlsx` 分頁英語／數學，含個別學生的前後測成績及數學學號，**不作114.9計畫統計證據**、不外傳、未寫入Sheet；原附件的清除仍由對話擁有人處理。
- 尚未實際跑通最新雙 repo 的 CI/Pages 與Google OAuth登入後驗收，及完整歷史全期逐筆查核；前臺122418是正式修正後**預期值**而非觀測值。另USR112-1扎根人次104/102、110.9平和英語76、110.9國教署東里/卓楓四人次及108.6美崙跨期36等仍有不同程度待查。即使官方母表已證實差異，也不等於學生層可完全查重。

## 27. 112-1 USR遠距扎根人次來源核准（2026-10-08）

- 同一原始官方績效母表 `20260819臺師大績效指標-PASSION診斷平台服務人次.xlsx` 的 `USR!K22` 英文51、`USR!L22` 數學51，合計遠距教學分科人次**102**，但 `資料總覽!K22` 舊值104。對照 `USR!K23:L23`112-2=110、`M22:N22`113-1=146、`M23:N23`113-2=127、`O22:P22`114-1=86、`O23:P23`114-2=66，五期均與資料總覽相同，僅112-1相差-2。此為口徑一致的分科人次改正，不宣稱學生級已排重。
- 將兩科數字寫入 Verified Store `HIST_USR_ROOT1121_OFFICIAL_20261008!A1:T3`，本機原始Excel不外傳；前端 `replaceUsrRoot1121` 只在基準舊104、兩列各51且來源完整時整群替換為102，絕非重複扣2。Hub `PENDING_REVIEW!H10`、`HIST_CLEANUP_CONTROL!I10:L10` 及 `VERIFIED_DETAIL_INDEX!A12:J12` 已寫入、讀回，status `APPROVED_UI_PENDING`。程式及回歸測試已在雙 repo 同步；cache token `20261008-17`。
- 加上前一輪國教署114.9 +3，全平臺新**預期** KPI：診斷**122418**、扎根班**2315**、扎根人次**15842**。未取得GitHub Actions/Pages與OAuth UI的最新實測成功結果，不能稱為全面驗收PASS。
- 仍缺證據：110.9 USR平和英語官方明細76未見原始；110.9國教署東里/卓楓-4需整期來源核對；108.6美崙英語36需跨期排重；花蓮計量114.9–115.4秀林國中聽力129與總項113矛盾，正式總數已依計量核定，分校資料不造假。第二份附件 `11101比較_遠距學生前後側分析.xlsx` 是含學號的個別學習前後測資料，不作診斷及扎根人次決議的來源，也不可上傳到公開儲存庫。

## 28. 110.9 平和英語衍生前測佐證補查（2026-10-08，修正先前「完全無來源」誤判）

- 重查使用者已提供、只保留於本地的 `11101比較_遠距學生前後側分析.xlsx`：**英語工作表 A2:Q6 明確有平和國中七年級5筆前測11009／後測11101**，每筆均有 `pre詞彙分數`、`pre文法分數`、`pre聽力分數`、`pre閱讀分數` 四項數值，共**20項前測成績欄值**；文法一筆為0是實際紀錄，不可自動排除。5筆四科分數組合各異。這是選出的「遠距指定學生=是」前後測比較樣本，**不是完整平台施測名冊**；英語無學號，不能宣稱已確證不同學生或補齊官方19名。
- `11009資料.xlsx` 的「英語」工作表仍然對平和國中0列；這只表示該批原始匯出**未涵蓋**，不是11009確定無施測。將這5筆11009前測四項分數組合與11009英語匯出所有完整分數組合比較，完全一致者0/5（不能據此證明是否同一人）。`11101比較`數學工作表平和另有8筆11009前測／11101後測，與11009數學較完整的29筆相比也證明比較檔是**篩選後的部分樣本**。
- 官方績效明細對110.9平和英語仍記 `文法19＋詞彙19＋聽力19＋閱讀19＝76`，現可佐證比較檔**至少5列×4項=20個前測成績欄值存在**，尚無法由此判定官方完整76的名冊、是否已含在USR官方164、或可否加總；**不將20或76加入正式KPI**，目前預期全平臺診斷122418、扎根班2315、扎根人次15842不變。
- 已在 `PASSION Teaching Data Hub` 更新 `PENDING_REVIEW!H2`、`HIST_CLEANUP_CONTROL!I2:L2`、`HIST_DIAG_DECISIONS!F2:H2`、`HIST_RAW_RECHECK_20261008!G4:I4` 並新增 `HIST_RAW_RECHECK_20261008!A13:J13`；狀態從來源完全缺席改為 `PARTIAL_EVIDENCE_FOUND_PENDING`。連線實際讀回確認。
- 下一個證據要求應為**11009平和國中完整英語平台匯出、或編製官方四項各19的原始學校核計表（含可驗證場次/來源）**，不必重傳同一份 `11009資料.xlsx` 或 `11101比較`。嚴格隔離含學號的學生級資料，禁止進入GitHub或Google Sheet；本次只登錄匿名數量。
