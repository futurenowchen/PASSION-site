export const TEACHING_FILTER_FIELDS = [
  "academic_year",
  "semester",
  "project_name",
  "county_city",
  "school_name",
  "school_level",
  "subject",
  "diagnostic_item",
  "grade",
];

export const TEACHING_FILTER_LABELS = Object.freeze({
  academic_year: "學年度",
  semester: "學期",
  project_name: "計畫項目",
  county_city: "地區",
  school_name: "學校",
  school_level: "學制",
  subject: "科目",
  diagnostic_item: "診斷項目",
  grade: "年級",
});

export const TEACHING_GROUP_LABELS = Object.freeze({
  school: "學校",
  time: "時間",
  project: "計畫",
  subject: "科目",
  region: "地區",
});

export const CORE_METRICS = Object.freeze({
  diagnostic_person_time: "診斷人次",
  root_class: "扎根班",
  root_person_time: "扎根人次",
});

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replaceAll("\u3000", " ").trim().replace(/\s+/g, " ");
  return text || null;
}

function headerMap(row = []) {
  const map = new Map();
  row.forEach((value, index) => {
    const key = cleanText(value);
    if (key) map.set(key, index);
  });
  return map;
}

function pick(row, headers, name) {
  if (!headers.has(name)) return null;
  return row[headers.get(name)] ?? null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

function schoolDimension(values = []) {
  if (values.length < 2) return new Map();
  const headers = headerMap(values[0]);
  const map = new Map();
  for (const row of values.slice(1)) {
    const id = cleanText(pick(row, headers, "school_id"));
    if (!id) continue;
    map.set(id, {
      county_city: cleanText(pick(row, headers, "county_city")),
      school_level: cleanText(pick(row, headers, "school_level")),
      canonical_name: cleanText(pick(row, headers, "canonical_name")),
    });
  }
  return map;
}

export function canonicalizeTeaching({facts = [], schools = []} = {}) {
  if (facts.length < 2) return [];
  const headers = headerMap(facts[0]);
  const schoolMap = schoolDimension(schools);
  const records = [];

  for (const row of facts.slice(1)) {
    const factId = cleanText(pick(row, headers, "fact_id"));
    const status = cleanText(pick(row, headers, "status"));
    if (!factId || (status && status !== "active")) continue;

    const schoolId = cleanText(pick(row, headers, "school_id"));
    const school = schoolMap.get(schoolId) || {};
    const metricType = cleanText(pick(row, headers, "metric_type"));
    if (!metricType) continue;

    const academicYearText = cleanText(pick(row, headers, "academic_year"));
    const academicYear = academicYearText === null ? null : Number(academicYearText);
    const dateStart = cleanText(pick(row, headers, "date_start"));
    const dateEnd = cleanText(pick(row, headers, "date_end")) || dateStart;
    const semester = cleanText(pick(row, headers, "semester"));

    records.push({
      fact_id: factId,
      batch_id: cleanText(pick(row, headers, "batch_id")),
      status: status || "active",
      date_start: dateStart,
      date_end: dateEnd,
      time_granularity: cleanText(pick(row, headers, "time_granularity")) || "custom",
      academic_year: Number.isFinite(academicYear) ? academicYear : academicYearText,
      semester,
      project_id: cleanText(pick(row, headers, "project_id")),
      project_name: cleanText(pick(row, headers, "project_name")),
      school_id: schoolId,
      school_name: cleanText(pick(row, headers, "school_name")) || school.canonical_name || null,
      county_city: cleanText(pick(row, headers, "county_city")) || school.county_city || null,
      school_level: cleanText(pick(row, headers, "school_level")) || school.school_level || null,
      subject: cleanText(pick(row, headers, "subject")),
      diagnostic_item: cleanText(pick(row, headers, "diagnostic_item")),
      grade: cleanText(pick(row, headers, "grade")),
      metric_type: metricType,
      metric_value: toNumber(pick(row, headers, "metric_value")),
      unit: cleanText(pick(row, headers, "unit")),
      source_type: cleanText(pick(row, headers, "source_type")),
      source_reference: cleanText(pick(row, headers, "source_reference")),
      notes: cleanText(pick(row, headers, "notes")),
    });
  }

  return records;
}


export function canonicalizeVerifiedTeachingDetail(values = []) {
  if (values.length < 2) return [];
  const headers = headerMap(values[0]);
  const records = [];

  values.slice(1).forEach((row, offset) => {
    const groupKey = cleanText(pick(row, headers, "group_key"));
    const metricType = cleanText(pick(row, headers, "metric_type"));
    if (!groupKey || !metricType) return;

    const academicYearText = cleanText(pick(row, headers, "academic_year"));
    const academicYear = academicYearText === null ? null : Number(academicYearText);
    const projectName = cleanText(pick(row, headers, "project_name"));
    const schoolName = cleanText(pick(row, headers, "school_name"));
    const dateStart = cleanText(pick(row, headers, "date_start"));
    const dateEnd = cleanText(pick(row, headers, "date_end")) || dateStart;

    records.push({
      fact_id: `verified-detail:${offset + 2}`,
      batch_id: "hist-detail-verified-20261008-v1",
      status: "active",
      verified_group_key: groupKey,
      group_target: toNumber(pick(row, headers, "group_target")),
      group_baseline: toNumber(pick(row, headers, "group_baseline")),
      date_start: dateStart,
      date_end: dateEnd,
      time_granularity: cleanText(pick(row, headers, "time_granularity")) || "custom",
      academic_year: Number.isFinite(academicYear) ? academicYear : academicYearText,
      semester: cleanText(pick(row, headers, "semester")),
      project_id: projectName ? `project:${projectName}` : null,
      project_name: projectName,
      school_id: schoolName ? `school:${schoolName}` : null,
      school_name: schoolName,
      county_city: cleanText(pick(row, headers, "county_city")),
      school_level: cleanText(pick(row, headers, "school_level")),
      subject: cleanText(pick(row, headers, "subject")),
      diagnostic_item: cleanText(pick(row, headers, "diagnostic_item")),
      grade: cleanText(pick(row, headers, "grade")),
      metric_type: metricType,
      metric_value: toNumber(pick(row, headers, "metric_value")),
      unit: metricType === "root_class" ? "班" : "人次",
      source_type: "historical_detail_verified",
      source_reference: cleanText(pick(row, headers, "source_reference")),
      notes: cleanText(pick(row, headers, "notes")),
    });
  });

  return records;
}

function rocMonthFromIso(isoDate) {
  if (!isoDate) return null;
  const match = String(isoDate).match(/^(\d{4})-(\d{2})-/);
  if (!match) return null;
  return `${Number(match[1]) - 1911}.${Number(match[2])}`;
}

export function historicalOverviewGroupKey(record) {
  if (record.batch_id !== "hist-big-overview-20261008-v1") return null;
  let period = null;

  if (record.time_granularity === "month") {
    period = rocMonthFromIso(record.date_start);
  } else if (
    record.time_granularity === "semester" ||
    record.time_granularity === "academic_year"
  ) {
    const suffix =
      record.semester === "上學期" ? "1" :
      record.semester === "下學期" ? "2" :
      record.semester === "暑期" ? "3" : null;
    if (suffix && record.academic_year !== null && record.academic_year !== undefined) {
      period = `${record.academic_year}-${suffix}`;
    }
  }

  return period && record.metric_type && record.project_name
    ? `${record.metric_type}|${record.project_name}|${period}`
    : null;
}

export function mergeVerifiedTeachingDetail(baseRecords = [], detailRecords = []) {
  const verifiedKeys = new Set(
    detailRecords.map(record => record.verified_group_key).filter(Boolean),
  );
  const retained = baseRecords.filter(record => {
    const key = historicalOverviewGroupKey(record);
    return !key || !verifiedKeys.has(key);
  });
  return [...retained, ...detailRecords];
}

// Supplement only approved, independently reconciled diagnostic records.
// The old historical overview remains intact; a verified group is augmented
// only when the resulting whole-group sum agrees with its approved target.
export function applyApprovedHistoricalSupplements(records = [], supplements = []) {
  if (!supplements.length) return records;
  const originals = new Map();
  for (const record of records) {
    const key = record.verified_group_key;
    if (!key) continue;
    originals.set(key, (originals.get(key) || 0) + Number(record.metric_value || 0));
  }

  const grouped = new Map();
  const seen = new Set();
  for (const record of supplements) {
    const key = record.verified_group_key;
    const fields = key?.split("|");
    if (!key || fields?.length !== 3 ||
        fields[0] !== "diagnostic_person_time" ||
        record.metric_type !== "diagnostic_person_time" ||
        fields[1] !== record.project_name ||
        !record.school_name || !record.diagnostic_item ||
        !record.grade || !Number.isSafeInteger(record.metric_value) ||
        record.metric_value <= 0 ||
        !Number.isSafeInteger(record.group_target) ||
        record.group_target <= 0) {
      throw new Error("核准補計資料格式不完整，已停止載入。");
    }
    const identity = [key, record.school_name, record.grade, record.diagnostic_item].join("|");
    if (seen.has(identity)) throw new Error("核准補計資料有重複項目：" + identity);
    seen.add(identity);
    if (!grouped.has(key)) grouped.set(key, {amount: 0, targets: new Set()});
    const group = grouped.get(key);
    group.amount += record.metric_value;
    group.targets.add(record.group_target);
  }
  for (const [key, group] of grouped) {
    if (!originals.has(key) || group.targets.size !== 1 ||
        originals.get(key) + group.amount !== [...group.targets][0]) {
      throw new Error("核准補計未能對平既有歷史群組：" + key);
    }
  }
  return [...records, ...supplements];
}

// Use newly reconciled original source data in preference to legacy big-table
// numbers, but only after validating the complete school-by-item group.
// Group replacement is atomic: no partial append or accidental double count.
export function applyOriginalPriorityHistoricalReplacement(verifiedDetail = [], replacements = []) {
  if (!replacements.length) return verifiedDetail;
  const byGroup = (records) => {
    const groups = new Map();
    for (const record of records) {
      const key = record.verified_group_key;
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    return groups;
  };
  const original = byGroup(verifiedDetail);
  const updated = byGroup(replacements);
  const itemKey = (r) => [r.school_name, r.school_level, r.diagnostic_item].join("|");
  for (const [key, rows] of updated) {
    const before = original.get(key);
    const fields = key.split("|");
    if (!before?.length || fields.length !== 3 || fields[0] !== "diagnostic_person_time") {
      throw new Error("原始資料優先替換群組不存在或指標不符：" + key);
    }
    const baseline = before.reduce((sum, row) => sum + Number(row.metric_value || 0), 0);
    const keys = new Set(before.map(itemKey));
    const replacementItems = new Set(rows.map(itemKey));
    const grades = new Set();
    const totals = new Set(rows.map(row => row.group_target));
    const baselines = new Set(rows.map(row => row.group_baseline));
    let current = 0;
    for (const row of rows) {
      const pk = [key, row.school_name, row.school_level, row.diagnostic_item, row.grade].join("|");
      if (grades.has(pk) || !keys.has(itemKey(row)) ||
          !row.grade || !row.school_name || !row.diagnostic_item ||
          row.project_name !== fields[1] || row.metric_type !== fields[0] ||
          !Number.isSafeInteger(row.metric_value) || row.metric_value <= 0) {
        throw new Error("原始資料替換內容不合法或重複：" + pk);
      }
      grades.add(pk);
      current += row.metric_value;
    }
    if (replacementItems.size !== keys.size ||
        totals.size !== 1 || baselines.size !== 1 ||
        !Number.isSafeInteger([...totals][0]) ||
        [...baselines][0] !== baseline || [...totals][0] !== current) {
      throw new Error("原始資料替換未能與官方基準及去重結果對平：" + key);
    }
  }
  return [...verifiedDetail.filter(row => !updated.has(row.verified_group_key)), ...replacements];
}

export function teachingDimensionValues(records, field) {
  const values = new Set();
  for (const record of records) {
    const value = record[field];
    if (value !== null && value !== undefined && value !== "") values.add(value);
  }
  const result = [...values];
  if (field === "academic_year") return result.sort((a, b) => Number(b) - Number(a));
  if (field === "grade") return result.sort((a, b) => Number(a) - Number(b));
  return result.sort((a, b) => String(a).localeCompare(String(b), "zh-Hant"));
}

function searchableText(record) {
  return [
    record.project_name,
    record.county_city,
    record.school_name,
    record.school_level,
    record.subject,
    record.diagnostic_item,
    record.grade,
    record.source_reference,
    record.notes,
  ].filter(Boolean).join(" ").toLocaleLowerCase("zh-Hant");
}

function dateDecision(record, startDate, endDate) {
  if (!startDate && !endDate) return {include: true, partial: false};
  const start = record.date_start;
  const end = record.date_end || start;
  if (!start || !end) return {include: false, partial: false};

  if (startDate && end < startDate) return {include: false, partial: false};
  if (endDate && start > endDate) return {include: false, partial: false};

  if (record.time_granularity === "day" && start === end) {
    return {include: true, partial: false};
  }

  const cutsLeft = Boolean(startDate && startDate > start);
  const cutsRight = Boolean(endDate && endDate < end);
  if (cutsLeft || cutsRight) return {include: false, partial: true};
  return {include: true, partial: false};
}

export function filterTeachingRecords(records, state = {}) {
  const terms = cleanText(state.keyword)
    ?.toLocaleLowerCase("zh-Hant")
    .split(/\s+/)
    .filter(Boolean) || [];
  const filters = state.filters || {};
  const result = [];
  const partialRecords = [];

  for (const record of records) {
    let selectedMatch = true;
    for (const [field, selected] of Object.entries(filters)) {
      if (!selected?.length) continue;
      if (!selected.some((value) => String(record[field] ?? "") === String(value))) {
        selectedMatch = false;
        break;
      }
    }
    if (!selectedMatch) continue;

    if (terms.length) {
      const haystack = searchableText(record);
      if (!terms.every((term) => haystack.includes(term))) continue;
    }

    const date = dateDecision(record, state.startDate || null, state.endDate || null);
    if (date.partial) {
      partialRecords.push(record);
      continue;
    }
    if (!date.include) continue;

    result.push(record);
  }

  return {records: result, partialRecords};
}

export function teachingMetricTotals(records) {
  const totals = {
    diagnostic_person_time: 0,
    root_class: 0,
    root_person_time: 0,
  };
  for (const record of records) {
    if (record.metric_type in totals) totals[record.metric_type] += Number(record.metric_value || 0);
  }
  return totals;
}

export function teachingGroupValue(record, groupBy) {
  if (groupBy === "school") return record.school_name || "（未填）";
  if (groupBy === "project") return record.project_name || "（未填）";
  if (groupBy === "subject") return record.subject || "（未填）";
  if (groupBy === "region") return record.county_city || "（未填）";
  if (groupBy === "time") {
    const ay = record.academic_year ? String(record.academic_year) + "學年度" : "未標學年度";
    return ay + "｜" + (record.semester || "未分期");
  }
  return "（未填）";
}

export function aggregateTeaching(records, groupBy) {
  const groups = new Map();
  for (const record of records) {
    const key = teachingGroupValue(record, groupBy);
    const current = groups.get(key) || {
      group: key,
      diagnostic_person_time: 0,
      root_class: 0,
      root_person_time: 0,
      matchedRows: 0,
    };
    if (record.metric_type in CORE_METRICS) {
      current[record.metric_type] += Number(record.metric_value || 0);
    }
    current.matchedRows += 1;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) =>
    (b.diagnostic_person_time + b.root_class + b.root_person_time) -
    (a.diagnostic_person_time + a.root_class + a.root_person_time) ||
    String(a.group).localeCompare(String(b.group), "zh-Hant")
  );
}

export function teachingDateBounds(records) {
  const starts = records.map((record) => record.date_start).filter(Boolean).sort();
  const ends = records.map((record) => record.date_end || record.date_start).filter(Boolean).sort();
  return {
    min: starts[0] || null,
    max: ends.at(-1) || null,
  };
}

export function teachingPeriodLabel(record) {
  if (!record.date_start) return "";
  return record.date_start === record.date_end
    ? record.date_start
    : record.date_start + "～" + record.date_end;
}

// Replace whole verified historical groups only when both the total and each
// diagnostic item match. Never append source rows on top of an existing total.
export function overlayHistoricalDiagnosticEnrichment(verifiedDetail = [], enrichment = []) {
  if (!enrichment.length) return verifiedDetail;
  const previous = new Map();
  const incoming = new Map();
  for (const record of verifiedDetail) {
    const key = record.verified_group_key;
    if (!key) continue;
    if (!previous.has(key)) previous.set(key, []);
    previous.get(key).push(record);
  }
  for (const record of enrichment) {
    const key = record.verified_group_key;
    if (!key || record.metric_type !== "diagnostic_person_time" ||
        !record.school_name || !Number.isFinite(record.metric_value) ||
        record.metric_value <= 0) {
      throw new Error("歷史施測補齊明細格式不完整，已停止套用。");
    }
    if (!incoming.has(key)) incoming.set(key, []);
    incoming.get(key).push(record);
  }
  const perItem = (items) => {
    const counts = new Map();
    for (const record of items) {
      const item = record.diagnostic_item;
      if (!item) throw new Error("歷史施測補齊缺少診斷項目。");
      counts.set(item, (counts.get(item) || 0) + record.metric_value);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, "zh-Hant"));
  };
  for (const [key, replacements] of incoming) {
    const existing = previous.get(key);
    if (!existing?.length ||
        JSON.stringify(perItem(existing)) !== JSON.stringify(perItem(replacements))) {
      throw new Error("歷史施測補齊與既有大表分項不一致：" + key);
    }
  }
  return [
    ...verifiedDetail.filter(r => !incoming.has(r.verified_group_key)),
    ...enrichment,
  ];
}

/**
 * Replace the 113.6 USR historical overview with a complete, audited source cohort.
 * The overview is removed atomically; source rows MUST NOT be appended to 109.
 */
export function replaceApproved1136OverviewWithRaw(records = [], raw = []) {
  const groupKey = "diagnostic_person_time|USR|113.6";
  const schools = {
    "吉貝國中": [5, 5, 5, 5, 5],
    "富里國中": [8, 8, 8, 8, 8],
    "海端國中": [8, 8, 8, 8, 7],
    "望安國中": [1, 1, 1, 1, 1],
    "萬榮國中": [9, 9, 9, 9, 9],
  };
  const items = ["數學", "文法", "詞彙", "聽力", "閱讀"];
  const legacy = records.filter(row => historicalOverviewGroupKey(row) === groupKey);
  if (legacy.length !== 1 || legacy[0].metric_value !== 109 ||
      records.some(row => row.verified_group_key === groupKey) || raw.length !== 25) {
    throw new Error("113.6 USR 官方基準或完整原始群組不符，已停止載入。");
  }
  const seen = new Set();
  let total = 0;
  for (const row of raw) {
    const expected = schools[row.school_name];
    const itemIndex = items.indexOf(row.diagnostic_item);
    const key = row.school_name + "|" + row.diagnostic_item;
    if (row.verified_group_key !== groupKey ||
        row.project_name !== "USR" || row.metric_type !== "diagnostic_person_time" ||
        row.group_baseline !== 109 || row.group_target !== 154 ||
        row.grade !== "7" || row.school_level !== "國中" ||
        row.date_start !== "2024-06-01" || row.date_end !== "2024-06-30" ||
        !expected || itemIndex < 0 || seen.has(key) ||
        !Number.isSafeInteger(row.metric_value) ||
        row.metric_value !== expected[itemIndex]) {
      throw new Error("113.6 USR 原始資料重複、缺漏或數字不符，已停止載入。");
    }
    seen.add(key);
    total += row.metric_value;
  }
  if (seen.size !== 25 || total !== 154) {
    throw new Error("113.6 USR 原始群組總量未對平，已停止載入。");
  }
  return [
    ...records.filter(row => historicalOverviewGroupKey(row) !== groupKey),
    ...raw,
  ];
}


/**
 * Adopt eight specifically approved detailed cohorts without stacking an old
 * overview total. Only canonical source-ref rows in a complete cohort may load.
 * An absent overview (光華、芳和) is an explicit baseline of zero.
 */
export function applyApprovedHistoricalDetailDecisions(records = [], details = []) {
  const spec = new Map([
    ["root_class|花蓮教育處|113-1", {baseline:22,target:21,rows:7,from:"2024-08-01",to:"2025-01-15",academicYear:113}],
    ["root_class|花蓮教育處|113-2", {baseline:19,target:25,rows:7,from:"2025-02-01",to:"2025-07-31",academicYear:113}],
    ["root_class|花蓮教育處|114-1", {baseline:23,target:28,rows:6,from:"2025-08-01",to:"2026-01-15",academicYear:114}],
    ["root_person_time|花蓮教育處|113-1", {baseline:77,target:85,rows:7,from:"2024-08-01",to:"2025-01-15",academicYear:113}],
    ["root_person_time|花蓮教育處|113-2", {baseline:84,target:105,rows:7,from:"2025-02-01",to:"2025-07-31",academicYear:113}],
    ["root_person_time|花蓮教育處|114-1", {baseline:91,target:115,rows:6,from:"2025-08-01",to:"2026-01-15",academicYear:114}],
    ["diagnostic_person_time|光華高工|112.6", {baseline:0,target:1272,rows:18,from:"2023-06-01",to:"2023-06-30",academicYear:111}],
    ["diagnostic_person_time|芳和中學|111.1", {baseline:0,target:49,rows:6,from:"2022-01-01",to:"2022-01-31",academicYear:110}],
  ]);
  if (!Array.isArray(details) || details.length !== 64) {
    throw new Error("已核准明細不是完整64列，已停止載入。");
  }
  const grouped = new Map();
  for (const row of details) {
    const key = row.verified_group_key;
    const contract = spec.get(key);
    if (!contract || !row.source_reference ||
        !Number.isSafeInteger(row.metric_value) || row.metric_value < 0 ||
        row.group_target !== contract.target ||
        row.group_baseline !== contract.baseline ||
        row.date_start !== contract.from || row.date_end !== contract.to ||
        row.academic_year !== contract.academicYear ||
        !row.school_name || !row.school_level ||
        !["國小","國中","高職"].includes(row.school_level)) {
      throw new Error("已核准明細欄位不合法或缺少來源：" + key);
    }
    const [metric, project, period] = key.split("|");
    if (row.metric_type !== metric || row.project_name !== project ||
        !["root_class","root_person_time","diagnostic_person_time"].includes(metric) ||
        (metric === "diagnostic_person_time" &&
          (!["國文","文法","詞彙","聽力","閱讀","數學"].includes(row.diagnostic_item) || !row.grade)) ||
        (metric !== "diagnostic_person_time" && row.diagnostic_item)) {
      throw new Error("已核准明細指標或科目不符：" + key);
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  if (grouped.size !== spec.size) {
    throw new Error("缺少已核准歷史群組，已停止載入。");
  }
  const replaced = new Set();
  for (const [key, contract] of spec) {
    const rows = grouped.get(key) || [];
    const referenceSet = new Set(rows.map(row => row.source_reference));
    const total = rows.reduce((n,row)=>n+row.metric_value,0);
    const original = records.filter(row => historicalOverviewGroupKey(row) === key);
    if (rows.length !== contract.rows ||
        referenceSet.size !== rows.length ||
        total !== contract.target ||
        original.length !== (contract.baseline ? 1 : 0) ||
        (original.length === 1 && original[0].metric_value !== contract.baseline) ||
        records.some(row => row.verified_group_key === key)) {
      throw new Error("已核准明細整期替換未對平，拒絕重複加計：" + key);
    }
    replaced.add(key);
  }
  return [
    ...records.filter(row => !replaced.has(historicalOverviewGroupKey(row))),
    ...details,
  ];
}

// Approved USR original priority: replace the entire overview rather than add
// the original-source school/item details on top of an obsolete overview.
export function replaceApprovedUSR1111And1149Overviews(records = [], sourceRows = []) {
  const contracts = [
    {"key":"diagnostic_person_time|USR|111.1","baseline":262,"target":280,"from":"2022-01-01","to":"2022-01-31","year":110,"file":"11101資料.xlsx","schools":{"富源國中":[18,"all"],"萬榮國中":[9,"all"],"平和國中":[29,"all"]},"rows":15},
    {"key":"diagnostic_person_time|USR|114.9","baseline":29,"target":154,"from":"2025-09-01","to":"2025-09-30","year":114,"file":"11409資料.xlsx","schools":{"萬榮國中":[4,"all"],"東里國中":[9,"math"],"富里國中":[16,"all"],"海端國中":[6,"all"],"望安國中":[3,"all"]},"rows":21},
  ];
  if (sourceRows.length !== 36) throw new Error("111.1／114.9 USR 原始明細未達完整36列。");
  const selected = new Set(contracts.map(c=>c.key));
  const groups = new Map();
  for (const row of sourceRows) {
    if (!selected.has(row.verified_group_key)) throw new Error("USR 原始明細包含未核准群組。");
    if (!groups.has(row.verified_group_key)) groups.set(row.verified_group_key, []);
    groups.get(row.verified_group_key).push(row);
  }
  const removed = new Set();
  for (const spec of contracts) {
    const cohort = groups.get(spec.key) || [];
    const old = records.filter(row => historicalOverviewGroupKey(row) === spec.key);
    const identities = new Set();
    let subtotal = 0;
    if (cohort.length !== spec.rows ||
        old.length !== 1 || old[0].metric_value !== spec.baseline ||
        records.some(row=>row.verified_group_key === spec.key)) {
      throw new Error("USR 原始優先整組替換基準／列數不符：" + spec.key);
    }
    for (const row of cohort) {
      const school = spec.schools[row.school_name];
      const allItems = ["數學","文法","詞彙","聽力","閱讀"];
      const allowed = school?.[1] === "math" ? ["數學"] : allItems;
      const identity = row.school_name + "|" + row.diagnostic_item;
      const subject = row.diagnostic_item === "數學" ? "數學" : "英文";
      if (!school || !allowed.includes(row.diagnostic_item) ||
          identities.has(identity) ||
          row.metric_type !== "diagnostic_person_time" ||
          row.project_name !== "USR" ||
          row.group_baseline !== spec.baseline || row.group_target !== spec.target ||
          row.date_start !== spec.from || row.date_end !== spec.to ||
          row.academic_year !== spec.year || row.school_level !== "國中" ||
          row.grade !== "7" || row.subject !== subject ||
          row.metric_value !== school[0] || !Number.isSafeInteger(row.metric_value) ||
          !row.source_reference?.startsWith(spec.file + "::")) {
        throw new Error("USR 原始明細科目／學校／來源不符：" + spec.key);
      }
      identities.add(identity);
      subtotal += row.metric_value;
    }
    if (identities.size !== spec.rows || subtotal !== spec.target) {
      throw new Error("USR 原始明細整組總量未對平：" + spec.key);
    }
    removed.add(spec.key);
  }
  return [...records.filter(row=>!removed.has(historicalOverviewGroupKey(row))), ...sourceRows];
}

/**
 * Original-source authoritative, full-cohort Yunlin 110.6 replacement.
 * The legacy six anonymous item totals (658) are removed atomically and
 * replaced with 24 school-item records (614). Never append the difference.
 */
export function replaceYunlin1106WithDedupedSource(records = [], sourceRows = []) {
  const key = "diagnostic_person_time|雲林|110.6";
  const items = ["國文","文法","詞彙","聽力","閱讀","數學"];
  const schools = {
    "水碓國小": [21,21,21,21,21,21],
    "永光國小": [12,48,48,48,48,49],
    "華南國小": [6,25,25,25,25,29],
    "樟湖國中小": [4,18,18,18,18,24],
  };
  const old = records.filter(row => row.verified_group_key === key);
  const oldPerItem = new Map();
  for (const row of old) {
    if (row.school_name || !items.includes(row.diagnostic_item) ||
        row.project_name !== "雲林" || row.metric_type !== "diagnostic_person_time" ||
        !Number.isSafeInteger(row.metric_value)) {
      throw new Error("110.6 雲林舊來源基準結構不符，停止載入。");
    }
    oldPerItem.set(row.diagnostic_item,
      (oldPerItem.get(row.diagnostic_item) || 0) + row.metric_value);
  }
  if (old.length !== 6 || oldPerItem.size !== 6 ||
      oldPerItem.get("國文") !== 43 ||
      items.slice(1).some(item => oldPerItem.get(item) !== 123) ||
      sourceRows.length !== 24 ||
      records.some(row => historicalOverviewGroupKey(row) === key)) {
    throw new Error("110.6 雲林舊總覽與來源群組未對平，停止載入。");
  }
  const seen = new Set();
  let sum = 0;
  for (const row of sourceRows) {
    const expected = schools[row.school_name];
    const itemIndex = items.indexOf(row.diagnostic_item);
    const unique = row.school_name + "|" + row.diagnostic_item;
    const expectedSubject = row.diagnostic_item === "國文" ? "國文"
      : row.diagnostic_item === "數學" ? "數學" : "英文";
    if (row.verified_group_key !== key || row.project_name !== "雲林" ||
        row.metric_type !== "diagnostic_person_time" || !expected ||
        itemIndex < 0 || seen.has(unique) ||
        row.metric_value !== expected[itemIndex] ||
        row.group_baseline !== 658 || row.group_target !== 614 ||
        row.date_start !== "2021-06-01" || row.date_end !== "2021-06-30" ||
        row.academic_year !== 109 || row.semester !== "下學期" ||
        row.school_level !== "國小" || row.subject !== expectedSubject ||
        row.grade !== null ||
        !row.source_reference?.startsWith("11006雲林.zip::")) {
      throw new Error("110.6 雲林原始明細無效或含重複學校項目，停止載入。");
    }
    seen.add(unique);
    sum += row.metric_value;
  }
  if (seen.size !== 24 || sum !== 614) {
    throw new Error("110.6 雲林完整群組加總失敗，停止載入。");
  }
  return [...records.filter(row => row.verified_group_key !== key), ...sourceRows];
}
