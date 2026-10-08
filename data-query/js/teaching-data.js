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
