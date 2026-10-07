import {
  FILTER_FIELDS,
  FILTER_LABELS,
  GROUP_LABELS,
  METRICS,
  aggregate,
  applyFilters,
  canonicalizeSources,
  dimensionValues,
  metricTotal,
} from "./data.js";
import {fetchPassionSheets, GoogleSheetsError} from "./sheets.js";

const config = window.PASSION_CONFIG || {};
const state = {
  accessToken: null,
  tokenClient: null,
  records: [],
  filtered: [],
  page: 1,
};

const $ = (id) => document.getElementById(id);

function setStatus(message, kind = "neutral") {
  const box = $("statusBox");
  box.textContent = message;
  box.dataset.kind = kind;
}

function setBusy(busy) {
  document.body.classList.toggle("busy", busy);
  $("authorizeBtn").disabled = busy || !config.GOOGLE_CLIENT_ID;
  $("reloadBtn").disabled = busy || !state.accessToken;
}

function waitForGoogle(timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error("Google Identity Services 載入逾時。"));
      }
    }, 80);
  });
}

function initAuth() {
  state.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: config.GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    callback: async (response) => {
      if (response?.error) {
        setStatus(`Google 授權失敗：${response.error}`, "error");
        setBusy(false);
        return;
      }
      if (!google.accounts.oauth2.hasGrantedAllScopes(
        response,
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      )) {
        setStatus("未取得 Google Sheets 唯讀權限。", "error");
        setBusy(false);
        return;
      }
      state.accessToken = response.access_token;
      $("signoutBtn").hidden = false;
      $("authorizeBtn").textContent = "重新授權";
      await loadData();
    },
  });
}

async function authorize() {
  if (!state.tokenClient) return;
  setBusy(true);
  setStatus("正在開啟 Google 帳號授權…");
  state.tokenClient.requestAccessToken({prompt: state.accessToken ? "" : "select_account"});
}

async function loadData() {
  setBusy(true);
  setStatus("正在從私人 Google Sheet 讀取資料…");
  try {
    const sheets = await fetchPassionSheets({
      accessToken: state.accessToken,
      spreadsheetId: config.SPREADSHEET_ID,
      legacySheet: config.LEGACY_SHEET,
      currentSheet: config.CURRENT_SHEET,
    });
    state.records = canonicalizeSources(sheets);
    state.page = 1;
    buildFilterControls();
    setDateBounds();
    renderAll();
    setStatus(
      `資料載入完成：歷史 ${state.records.filter(r => r.source_type === "legacy").length.toLocaleString()} 筆，` +
      `Current ${state.records.filter(r => r.source_type === "current").length.toLocaleString()} 筆。`,
      "success",
    );
    $("workspace").hidden = false;
    $("reloadBtn").disabled = false;
  } catch (error) {
    const detail = error instanceof GoogleSheetsError && error.details ? `（${error.details}）` : "";
    setStatus(`${error.message || "資料載入失敗。"} ${detail}`, "error");
  } finally {
    setBusy(false);
  }
}

function signOut() {
  if (!state.accessToken) return;
  google.accounts.oauth2.revoke(state.accessToken, () => {});
  state.accessToken = null;
  state.records = [];
  state.filtered = [];
  $("workspace").hidden = true;
  $("signoutBtn").hidden = true;
  $("reloadBtn").disabled = true;
  $("authorizeBtn").textContent = "使用 Google 帳號讀取資料";
  setStatus("已解除本頁面的 Google 授權。");
}

function setDateBounds() {
  const dates = state.records.map(r => r.activity_date).filter(Boolean).sort();
  if (!dates.length) return;
  $("startDate").min = dates[0];
  $("startDate").max = dates.at(-1);
  $("endDate").min = dates[0];
  $("endDate").max = dates.at(-1);
  $("startDate").value = dates[0];
  $("endDate").value = dates.at(-1);
}

function buildFilterControls() {
  const root = $("filters");
  root.replaceChildren();
  for (const field of FILTER_FIELDS) {
    const values = dimensionValues(state.records, field);
    const details = document.createElement("details");
    details.className = "filter-panel";
    const summary = document.createElement("summary");
    summary.textContent = FILTER_LABELS[field];
    const list = document.createElement("div");
    list.className = "check-list";
    list.dataset.field = field;

    for (const value of values) {
      const label = document.createElement("label");
      label.className = "check-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = String(value);
      input.addEventListener("change", () => {
        state.page = 1;
        updateFilterSummary(details, summary, field);
        renderAll();
      });
      const text = document.createElement("span");
      text.textContent = field === "academic_year" ? `${value}學年度` : value;
      label.append(input, text);
      list.append(label);
    }

    details.append(summary, list);
    root.append(details);
  }
}

function selectedFilters() {
  const result = {};
  for (const panel of document.querySelectorAll(".check-list")) {
    const selected = [...panel.querySelectorAll("input:checked")].map(input => input.value);
    if (selected.length) result[panel.dataset.field] = selected;
  }
  return result;
}

function updateFilterSummary(details, summary, field) {
  const count = details.querySelectorAll("input:checked").length;
  summary.textContent = count ? `${FILTER_LABELS[field]}（${count}）` : FILTER_LABELS[field];
}

function currentFilterState() {
  return {
    keyword: $("keyword").value,
    startDate: $("startDate").value || null,
    endDate: $("endDate").value || null,
    filters: selectedFilters(),
  };
}

function renderAll() {
  state.filtered = applyFilters(state.records, currentFilterState());
  renderMetrics();
  renderAggregation();
  renderDetails();
  renderActiveFilters();
}

function renderMetrics() {
  $("metricActivities").textContent = metricTotal(state.filtered, "活動場次").toLocaleString();
  $("metricTeachers").textContent = metricTotal(state.filtered, "教師參與人次").toLocaleString();
  $("metricTotal").textContent = metricTotal(state.filtered, "總參與人次").toLocaleString();
  $("metricSelected").textContent = metricTotal(state.filtered, $("metricSelect").value).toLocaleString();
}

function clearTable(table) {
  while (table.tBodies[0]?.rows.length) table.tBodies[0].deleteRow(0);
}

function appendCell(row, value) {
  const cell = row.insertCell();
  cell.textContent = value ?? "";
  return cell;
}

function renderAggregation() {
  const metric = $("metricSelect").value;
  const groupBy = $("groupSelect").value;
  const rows = aggregate(state.filtered, metric, groupBy);
  const table = $("summaryTable");
  clearTable(table);
  const tbody = table.tBodies[0];

  for (const item of rows) {
    const row = tbody.insertRow();
    const label = groupBy === "academic_year" && item.group !== "（未填）"
      ? `${item.group}學年度`
      : item.group;
    appendCell(row, label);
    appendCell(row, item.value.toLocaleString()).className = "num";
    appendCell(row, item.matchedRows.toLocaleString()).className = "num";
  }

  $("summaryTitle").textContent = `${metric}｜依${GROUP_LABELS[groupBy]}`;
  renderBars(rows.slice(0, 12));
}

function renderBars(rows) {
  const root = $("barChart");
  root.replaceChildren();
  const max = Math.max(...rows.map(row => row.value), 1);
  for (const item of rows) {
    const wrapper = document.createElement("div");
    wrapper.className = "bar-row";
    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = item.group;
    const track = document.createElement("div");
    track.className = "bar-track";
    const bar = document.createElement("div");
    bar.className = "bar-value";
    bar.style.width = `${Math.max(2, (item.value / max) * 100)}%`;
    const value = document.createElement("span");
    value.textContent = item.value.toLocaleString();
    track.append(bar, value);
    wrapper.append(label, track);
    root.append(wrapper);
  }
}

const DETAIL_COLUMNS = [
  ["activity_date","日期"],
  ["academic_year","學年度"],
  ["project_family","計畫族"],
  ["project","正式計畫名稱"],
  ["category","活動類別"],
  ["subject","科目／主題"],
  ["service_region","服務地區"],
  ["service_target","服務對象／學校"],
  ["activity_name","活動名稱"],
  ["teacher_participant_count","教師人次"],
  ["total_participant_count","總參與人次"],
];

function renderDetails() {
  const pageSize = Number(config.PAGE_SIZE || 50);
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * pageSize;
  const pageRows = state.filtered.slice(start, start + pageSize);

  const table = $("detailTable");
  clearTable(table);
  const tbody = table.tBodies[0];

  for (const record of pageRows) {
    const row = tbody.insertRow();
    for (const [field] of DETAIL_COLUMNS) {
      let value = record[field] ?? "";
      if (field === "academic_year" && value !== "") value = String(value);
      if (field.endsWith("_count")) value = Number(value || 0).toLocaleString();
      appendCell(row, value);
    }
  }

  $("detailCount").textContent = `符合 ${state.filtered.length.toLocaleString()} 筆活動`;
  $("pageInfo").textContent = `第 ${state.page} / ${totalPages} 頁`;
  $("prevPage").disabled = state.page <= 1;
  $("nextPage").disabled = state.page >= totalPages;
}

function renderActiveFilters() {
  const items = [];
  const stateNow = currentFilterState();
  if (stateNow.keyword?.trim()) items.push(`關鍵字：${stateNow.keyword.trim()}`);
  for (const [field, values] of Object.entries(stateNow.filters)) {
    items.push(`${FILTER_LABELS[field]}：${values.join("、")}`);
  }
  $("activeFilters").textContent = items.length ? "目前條件｜" + items.join(" ｜ ") : "目前顯示全部資料";
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv() {
  const header = DETAIL_COLUMNS.map(([, label]) => escapeCsv(label)).join(",");
  const lines = state.filtered.map(record =>
    DETAIL_COLUMNS.map(([field]) => escapeCsv(record[field] ?? "")).join(","),
  );
  const blob = new Blob(["\ufeff" + [header, ...lines].join("\r\n")], {type: "text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "PASSION_activity_filtered.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindUi() {
  $("authorizeBtn").addEventListener("click", authorize);
  $("signoutBtn").addEventListener("click", signOut);
  $("reloadBtn").addEventListener("click", loadData);
  $("keyword").addEventListener("input", () => {
    state.page = 1;
    renderAll();
  });
  $("startDate").addEventListener("change", () => {
    state.page = 1;
    renderAll();
  });
  $("endDate").addEventListener("change", () => {
    state.page = 1;
    renderAll();
  });
  $("metricSelect").addEventListener("change", renderAll);
  $("groupSelect").addEventListener("change", renderAll);
  $("prevPage").addEventListener("click", () => {
    state.page -= 1;
    renderDetails();
  });
  $("nextPage").addEventListener("click", () => {
    state.page += 1;
    renderDetails();
  });
  $("downloadBtn").addEventListener("click", downloadCsv);
}

async function boot() {
  bindUi();

  for (const metric of Object.keys(METRICS)) {
    const option = document.createElement("option");
    option.value = metric;
    option.textContent = metric;
    $("metricSelect").append(option);
  }
  $("metricSelect").value = "教師參與人次";

  for (const [value, label] of Object.entries(GROUP_LABELS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    $("groupSelect").append(option);
  }
  $("groupSelect").value = "project_family";

  if (!config.GOOGLE_CLIENT_ID) {
    setStatus("尚未設定 Google OAuth Client ID；程式已就緒，完成 OAuth 設定後即可上線。", "warning");
    $("authorizeBtn").disabled = true;
    return;
  }

  try {
    await waitForGoogle();
    initAuth();
    $("authorizeBtn").disabled = false;
    setStatus("請使用有 Mirror 檢視權限的 Google 帳號授權。");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

boot();
