import {fetchTeachingDetailSheet, fetchTeachingSheets, GoogleSheetsError} from "./sheets.js";
import {
  TEACHING_FILTER_FIELDS,
  TEACHING_FILTER_LABELS,
  TEACHING_GROUP_LABELS,
  aggregateTeaching,
  canonicalizeTeaching,
  canonicalizeVerifiedTeachingDetail,
  filterTeachingRecords,
  mergeVerifiedTeachingDetail,
  overlayHistoricalDiagnosticEnrichment,
  applyApprovedHistoricalSupplements,
  applyOriginalPriorityHistoricalReplacement,
  replaceApproved1136OverviewWithRaw,
  replaceApprovedUSR1111And1149Overviews,
  applyApprovedHistoricalDetailDecisions,
  teachingDateBounds,
  teachingDimensionValues,
  teachingMetricTotals,
  teachingPeriodLabel,
} from "./teaching-data.js";
import {clearSheetsSession, restoreSheetsSession, storeSheetsSession} from "./auth-session.js";

const config = window.PASSION_CONFIG || {};
const state = {
  accessToken: null,
  tokenClient: null,
  records: [],
  filtered: [],
  partialRecords: [],
  page: 1,
  dateBounds: {min: null, max: null},
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

function markAuthorized() {
  $("signoutBtn").hidden = false;
  $("authorizeBtn").textContent = "重新授權";
}

function markSignedOut() {
  $("teachingWorkspace").hidden = true;
  $("signoutBtn").hidden = true;
  $("reloadBtn").disabled = true;
  $("authorizeBtn").textContent = "使用 Google 帳號讀取資料";
}

function initAuth() {
  state.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: config.GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    hosted_domain: config.GOOGLE_HOSTED_DOMAIN || undefined,
    callback: async (response) => {
      if (response?.error) {
        setStatus("Google 授權失敗：" + response.error, "error");
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
      storeSheetsSession(response);
      markAuthorized();
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
  setStatus("正在從 Teaching Data Hub 讀取資料…");
  try {
    const [sheets, verifiedDetailValues, enrichmentValues, supplementValues, rawAuthorityValues, raw1136Values, approvedDetailValues, rawUSR11111149Values] = await Promise.all([
      fetchTeachingSheets({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_SPREADSHEET_ID,
        factsSheet: config.TEACHING_FACTS_SHEET,
        schoolsSheet: config.TEACHING_SCHOOLS_SHEET,
      }),
      fetchTeachingDetailSheet({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_DETAIL_SPREADSHEET_ID,
        sheetName: config.TEACHING_DETAIL_SHEET,
      }),
      fetchTeachingDetailSheet({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_DETAIL_SPREADSHEET_ID,
        sheetName: config.TEACHING_ENRICHMENT_SHEET,
      }),
      fetchTeachingDetailSheet({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_DETAIL_SPREADSHEET_ID,
        sheetName: config.TEACHING_SUPPLEMENT_SHEET,
      }),
      fetchTeachingDetailSheet({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_DETAIL_SPREADSHEET_ID,
        sheetName: config.TEACHING_RAW_AUTHORITY_SHEET,
        endColumn: "T",
      }),
      fetchTeachingDetailSheet({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_DETAIL_SPREADSHEET_ID,
        sheetName: config.TEACHING_RAW1136_SHEET,
        endColumn: "T",
      }),
      fetchTeachingDetailSheet({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_DETAIL_SPREADSHEET_ID,
        sheetName: config.TEACHING_APPROVED_DETAIL_SHEET,
        endColumn: "T",
      }),
      fetchTeachingDetailSheet({
        accessToken: state.accessToken,
        spreadsheetId: config.TEACHING_DETAIL_SPREADSHEET_ID,
        sheetName: config.TEACHING_USR1111_1149_SHEET,
        endColumn: "T",
      }),
    ]);
    const baseRecords = canonicalizeTeaching(sheets);
    const verifiedDetail = canonicalizeVerifiedTeachingDetail(verifiedDetailValues);
    const enrichment = canonicalizeVerifiedTeachingDetail(enrichmentValues).map((record, index) => ({
      ...record,
      fact_id: `hist-diag-enrichment:${index + 1}`,
      batch_id: "hist-diagnostic-enrichment-20261008-v1",
      source_type: "historical_diagnostic_raw_verified",
    }));
    const reconciledDetail = overlayHistoricalDiagnosticEnrichment(verifiedDetail, enrichment);
    const supplements = canonicalizeVerifiedTeachingDetail(supplementValues).map((record, index) => ({
      ...record,
      fact_id: `hist-diag-supplement:${index + 1}`,
      batch_id: "hist-meilun-1109-dedup-20261008-v1",
      source_type: "historical_diagnostic_approved_supplement",
    }));
    const rawAuthority = canonicalizeVerifiedTeachingDetail(rawAuthorityValues).map((record, index) => ({
      ...record,
      fact_id: `hist-diag-original-priority:${index + 1}`,
      batch_id: "hist-diag-original-priority-1116-20261008-v1",
      source_type: "historical_diagnostic_original_priority",
    }));
    const approvedSourceDetail = applyOriginalPriorityHistoricalReplacement(reconciledDetail, rawAuthority);
    const finalDetail = applyApprovedHistoricalSupplements(approvedSourceDetail, supplements);
    const raw1136 = canonicalizeVerifiedTeachingDetail(raw1136Values).map((record, index) => ({
      ...record,
      fact_id: `hist-diag-original-priority-1136:${index + 1}`,
      batch_id: "hist-diag-original-priority-1136-20261008-v1",
      source_type: "historical_diagnostic_original_priority",
    }));
    const approvedDetail = canonicalizeVerifiedTeachingDetail(approvedDetailValues).map((record, index) => ({
      ...record,
      fact_id: `approved-detail-20261008:${index + 1}`,
      batch_id: "hist-approved-detail-20261008-v1",
      source_type: "historical_user_approved_detail",
    }));
    const newerUSRRaw = canonicalizeVerifiedTeachingDetail(rawUSR11111149Values).map((record, index) => ({
      ...record,
      fact_id: `original-priority-usr-1111-1149:${index + 1}`,
      batch_id: "hist-usr-1111-1149-original-priority-20261008-v1",
      source_type: "historical_diagnostic_original_priority",
    }));
    state.records = replaceApprovedUSR1111And1149Overviews(
      applyApprovedHistoricalDetailDecisions(
        replaceApproved1136OverviewWithRaw(
          mergeVerifiedTeachingDetail(baseRecords, finalDetail), raw1136),
        approvedDetail,
      ), newerUSRRaw,
    );
    state.page = 1;
    state.dateBounds = teachingDateBounds(state.records);
    buildFilterControls();
    setDateBounds();
    renderAll();
    const totals = teachingMetricTotals(state.records);
    setStatus(
      "教學資料載入完成：" + state.records.length.toLocaleString() +
      " 筆統計事實；目前診斷人次 " +
      totals.diagnostic_person_time.toLocaleString() +
      "；已套用核對通過的歷史明細及新核准補正。",
      "success",
    );
    $("teachingWorkspace").hidden = false;
    $("reloadBtn").disabled = false;
  } catch (error) {
    if (error instanceof GoogleSheetsError && error.status === 401) {
      clearSheetsSession();
      state.accessToken = null;
      markSignedOut();
    }
    const detail = error instanceof GoogleSheetsError && error.details ? "（" + error.details + "）" : "";
    setStatus((error.message || "資料載入失敗。") + " " + detail, "error");
  } finally {
    setBusy(false);
  }
}

function signOut() {
  if (state.accessToken) google.accounts.oauth2.revoke(state.accessToken, () => {});
  clearSheetsSession();
  state.accessToken = null;
  state.records = [];
  state.filtered = [];
  state.partialRecords = [];
  markSignedOut();
  setStatus("已解除本頁面的 Google 授權。");
}

function setDateBounds() {
  const {min, max} = state.dateBounds;
  if (!min || !max) return;
  for (const id of ["teachingStartDate", "teachingEndDate"]) {
    $(id).min = min;
    $(id).max = max;
  }
  $("teachingStartDate").value = "";
  $("teachingEndDate").value = "";
}

function buildFilterControls() {
  const root = $("teachingFilters");
  root.replaceChildren();

  for (const field of TEACHING_FILTER_FIELDS) {
    const values = teachingDimensionValues(state.records, field);
    const details = document.createElement("details");
    details.className = "filter-panel";
    const summary = document.createElement("summary");
    summary.textContent = TEACHING_FILTER_LABELS[field];
    const list = document.createElement("div");
    list.className = "check-list";
    list.dataset.field = field;

    if (!values.length) {
      const empty = document.createElement("p");
      empty.className = "filter-placeholder";
      empty.textContent = "目前資料未提供";
      list.append(empty);
    } else {
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
        text.textContent = field === "academic_year" ? String(value) + "學年度" : String(value);
        label.append(input, text);
        list.append(label);
      }
    }

    details.append(summary, list);
    root.append(details);
  }
}

function updateFilterSummary(details, summary, field) {
  const count = details.querySelectorAll("input:checked").length;
  summary.textContent = count
    ? TEACHING_FILTER_LABELS[field] + "（" + count + "）"
    : TEACHING_FILTER_LABELS[field];
}

function selectedFilters() {
  const filters = {};
  for (const list of document.querySelectorAll("#teachingFilters .check-list")) {
    const selected = [...list.querySelectorAll("input:checked")].map((input) => input.value);
    if (selected.length) filters[list.dataset.field] = selected;
  }
  return filters;
}

function currentFilterState() {
  return {
    keyword: $("teachingKeyword").value,
    startDate: $("teachingStartDate").value || null,
    endDate: $("teachingEndDate").value || null,
    filters: selectedFilters(),
  };
}

function clearTeachingFilters() {
  $("teachingKeyword").value = "";
  $("teachingStartDate").value = "";
  $("teachingEndDate").value = "";

  for (const list of document.querySelectorAll("#teachingFilters .check-list")) {
    for (const input of list.querySelectorAll("input:checked")) input.checked = false;
    const details = list.closest(".filter-panel");
    const summary = details?.querySelector("summary");
    if (details && summary) updateFilterSummary(details, summary, list.dataset.field);
  }

  state.page = 1;
  renderAll();
}

function clearTable(table) {
  while (table.tBodies[0]?.rows.length) table.tBodies[0].deleteRow(0);
}

function appendCell(row, value, className = "") {
  const cell = row.insertCell();
  cell.textContent = value ?? "";
  if (className) cell.className = className;
  return cell;
}

function renderMetrics() {
  const totals = teachingMetricTotals(state.filtered);
  $("metricDiagnostic").textContent = totals.diagnostic_person_time.toLocaleString();
  $("metricRootClasses").textContent = totals.root_class.toLocaleString();
  $("metricRootPeople").textContent = totals.root_person_time.toLocaleString();
}

function renderAggregation() {
  const groupBy = $("teachingGroupSelect").value;
  const rows = aggregateTeaching(state.filtered, groupBy);
  const table = $("teachingSummaryTable");
  clearTable(table);
  const tbody = table.tBodies[0];

  if (!rows.length) {
    const row = tbody.insertRow();
    const cell = appendCell(row, "目前條件沒有資料");
    cell.colSpan = 4;
    cell.className = "empty-cell";
  } else {
    for (const item of rows) {
      const row = tbody.insertRow();
      appendCell(row, item.group);
      appendCell(row, item.diagnostic_person_time.toLocaleString(), "num");
      appendCell(row, item.root_class.toLocaleString(), "num");
      appendCell(row, item.root_person_time.toLocaleString(), "num");
    }
  }

  $("teachingSummaryTitle").textContent =
    "教學成果｜依" + (TEACHING_GROUP_LABELS[groupBy] || "學校");
}

function metricCells(record) {
  return {
    diagnostic: record.metric_type === "diagnostic_person_time" ? record.metric_value : 0,
    rootClass: record.metric_type === "root_class" ? record.metric_value : 0,
    rootPeople: record.metric_type === "root_person_time" ? record.metric_value : 0,
  };
}

function renderDetails() {
  const pageSize = Number(config.PAGE_SIZE || 50);
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * pageSize;
  const pageRows = state.filtered.slice(start, start + pageSize);
  const table = $("teachingDetailTable");
  clearTable(table);
  const tbody = table.tBodies[0];

  if (!pageRows.length) {
    const row = tbody.insertRow();
    const cell = appendCell(row, "目前條件沒有資料");
    cell.colSpan = 14;
    cell.className = "empty-cell";
  } else {
    for (const record of pageRows) {
      const row = tbody.insertRow();
      const metrics = metricCells(record);
      const values = [
        teachingPeriodLabel(record),
        record.academic_year ?? "",
        record.semester ?? "",
        record.project_name ?? "",
        record.county_city ?? "",
        record.school_name ?? "",
        record.school_level ?? "",
        record.subject ?? "",
        record.diagnostic_item ?? "",
        record.grade ?? "",
        metrics.diagnostic.toLocaleString(),
        metrics.rootClass.toLocaleString(),
        metrics.rootPeople.toLocaleString(),
        record.source_reference ?? "",
      ];
      values.forEach((value, index) => appendCell(row, value, index >= 10 && index <= 12 ? "num" : ""));
    }
  }

  $("teachingDetailCount").textContent =
    "符合 " + state.filtered.length.toLocaleString() + " 筆統計事實";
  $("teachingPageInfo").textContent = "第 " + state.page + " / " + totalPages + " 頁";
  $("teachingPrevPage").disabled = state.page <= 1;
  $("teachingNextPage").disabled = state.page >= totalPages;
}

function renderActiveFilters() {
  const items = [];
  const current = currentFilterState();
  if (current.keyword?.trim()) items.push("關鍵字：" + current.keyword.trim());

  if (
    current.startDate && current.endDate &&
    (current.startDate !== state.dateBounds.min || current.endDate !== state.dateBounds.max)
  ) {
    items.push("日期：" + current.startDate + "～" + current.endDate);
  }

  for (const [field, values] of Object.entries(current.filters)) {
    items.push(TEACHING_FILTER_LABELS[field] + "：" + values.join("、"));
  }

  $("teachingActiveFilters").textContent =
    items.length ? "目前條件｜" + items.join(" ｜ ") : "目前顯示全部資料";

  const warning = $("teachingDateWarning");
  if (state.partialRecords.length) {
    const affected = teachingMetricTotals(state.partialRecords);
    const total = affected.diagnostic_person_time + affected.root_class + affected.root_person_time;
    warning.textContent =
      "日期區間只涵蓋部分粗粒度資料，已保守排除 " +
      state.partialRecords.length.toLocaleString() + " 筆統計事實（指標量 " +
      total.toLocaleString() + "）。請改用完整期間或學年度／學期篩選。";
    warning.hidden = false;
  } else {
    warning.hidden = true;
    warning.textContent = "";
  }
}

function renderAll() {
  const result = filterTeachingRecords(state.records, currentFilterState());
  state.filtered = result.records;
  state.partialRecords = result.partialRecords;
  renderMetrics();
  renderAggregation();
  renderDetails();
  renderActiveFilters();
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

function downloadCsv() {
  const header = [
    "日期／期間","學年度","學期","計畫項目","地區","學校","學制","科目","診斷項目","年級",
    "診斷人次","扎根班","扎根人次","資料來源",
  ];
  const lines = state.filtered.map((record) => {
    const metrics = metricCells(record);
    return [
      teachingPeriodLabel(record),
      record.academic_year ?? "",
      record.semester ?? "",
      record.project_name ?? "",
      record.county_city ?? "",
      record.school_name ?? "",
      record.school_level ?? "",
      record.subject ?? "",
      record.diagnostic_item ?? "",
      record.grade ?? "",
      metrics.diagnostic,
      metrics.rootClass,
      metrics.rootPeople,
      record.source_reference ?? "",
    ].map(escapeCsv).join(",");
  });

  const blob = new Blob([
    "\ufeff" + [header.map(escapeCsv).join(","), ...lines].join("\r\n"),
  ], {type: "text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "PASSION_teaching_filtered.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindUi() {
  $("authorizeBtn").addEventListener("click", authorize);
  $("reloadBtn").addEventListener("click", loadData);
  $("signoutBtn").addEventListener("click", signOut);
  $("clearTeachingFiltersBtn").addEventListener("click", clearTeachingFilters);
  $("teachingKeyword").addEventListener("input", () => {
    state.page = 1;
    renderAll();
  });
  $("teachingStartDate").addEventListener("change", () => {
    state.page = 1;
    renderAll();
  });
  $("teachingEndDate").addEventListener("change", () => {
    state.page = 1;
    renderAll();
  });
  $("teachingGroupSelect").addEventListener("change", renderAll);
  $("teachingPrevPage").addEventListener("click", () => {
    state.page -= 1;
    renderDetails();
  });
  $("teachingNextPage").addEventListener("click", () => {
    state.page += 1;
    renderDetails();
  });
  $("downloadTeachingBtn").addEventListener("click", downloadCsv);
}

async function boot() {
  bindUi();

  if (
    !config.GOOGLE_CLIENT_ID ||
    !config.TEACHING_SPREADSHEET_ID ||
    !config.TEACHING_DETAIL_SPREADSHEET_ID ||
    !config.TEACHING_ENRICHMENT_SHEET ||
    !config.TEACHING_SUPPLEMENT_SHEET ||
    !config.TEACHING_RAW_AUTHORITY_SHEET ||
    !config.TEACHING_RAW1136_SHEET ||
    !config.TEACHING_APPROVED_DETAIL_SHEET ||
    !config.TEACHING_USR1111_1149_SHEET
  ) {
    setStatus("尚未設定教學資料 Google Sheet 或 OAuth Client ID。", "warning");
    $("authorizeBtn").disabled = true;
    return;
  }

  try {
    await waitForGoogle();
    initAuth();
    const restored = restoreSheetsSession();
    if (restored) {
      state.accessToken = restored;
      markAuthorized();
      await loadData();
    } else {
      $("authorizeBtn").disabled = false;
      setStatus("請使用臺師大心測中心PASSION扎根教學團隊帳號授權。");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
}

boot();
