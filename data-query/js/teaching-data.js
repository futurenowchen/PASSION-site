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
