const CATEGORY_ALIASES = Object.freeze({
  "增能": "增能研習",
  "增能研習": "增能研習",
  "觀課": "觀議課",
  "觀議課": "觀議課",
  "成果展": "成果展",
  "學科交流": "學科交流",
  "會議": "會議",
  "說明會": "說明會",
  "計畫說明會": "說明會",
  "行政說明會": "說明會",
  "讀本說明會": "說明會",
  "評核說明會": "說明會",
  "諮詢會議": "諮詢會",
  "師培諮詢會議": "諮詢會",
});

const PROJECT_FAMILIES = Object.freeze({
  "偏鄉中小學學生學力增能計畫": "偏鄉學力增能計畫",
  "偏鄉暨弱勢國中小學生學力增能計畫": "偏鄉學力增能計畫",
  "偏鄉暨弱勢中小學學生學力增能計畫": "偏鄉學力增能計畫",
  "深耕偏鄉弱勢教育計畫": "深耕偏鄉教育計畫",
  "深耕偏鄉教育計畫": "深耕偏鄉教育計畫",
  "深耕偏鄉教育計畫：深化、廣化、國際化、永續化": "深耕偏鄉教育計畫",
  "PASSION與博幼偏鄉優質教師培育計畫": "PASSION與博幼偏鄉優質教師培育計畫",
});

const REGION_ALIASES = Object.freeze({
  "高雄": "高雄市",
  "高雄縣": "高雄市",
  "南投": "南投縣",
  "屏東": "屏東縣",
  "台東縣": "臺東縣",
  "台北市": "臺北市",
  "台中市": "臺中市",
  "台南市": "臺南市",
});

const SCHOOL_PREFIXES = [
  "基隆市","臺北市","新北市","桃園市","新竹市","新竹縣","苗栗縣","臺中市","彰化縣",
  "南投縣","雲林縣","嘉義市","嘉義縣","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣",
  "臺東縣","澎湖縣","金門縣","連江縣",
];
const SCHOOL_SUFFIXES = ["國中","國小","高中","高職","中學","國民中學","國民小學","高中國中部","國中部"];

export const FILTER_FIELDS = [
  "academic_year",
  "project_family",
  "project",
  "category",
  "subject",
  "service_region",
  "service_target",
];

export const FILTER_LABELS = Object.freeze({
  academic_year: "學年度",
  project_family: "計畫族",
  project: "正式計畫名稱",
  category: "活動類別",
  subject: "科目／主題",
  service_region: "服務地區",
  service_target: "服務對象／學校",
});

export const GROUP_LABELS = Object.freeze({
  project_family: "計畫族",
  project: "正式計畫名稱",
  academic_year: "學年度",
  category: "活動類別",
  subject: "科目／主題",
  service_region: "服務地區",
  service_target: "服務對象／學校",
  activity_mode: "活動形式",
  venue_region: "舉辦地區",
  source_type: "資料來源",
});

export const METRICS = Object.freeze({
  "活動場次": null,
  "教師參與人次": "teacher_participant_count",
  "總參與人次": "total_participant_count",
  "合作學校人員": "partner_school_staff_count",
  "NPO人員": "npo_staff_count",
  "校外教師": "external_teacher_count",
  "師大教授": "ntnu_professor_count",
  "師大助理／研究員": "ntnu_staff_count",
  "師大學生": "ntnu_student_count",
  "學程結業學友": "alumni_count",
  "顧問老師": "advisor_teacher_count",
  "扎根生／中學生": "rooted_student_count",
  "公部門人員": "government_staff_count",
  "校外大學教授": "external_university_professor_count",
  "校外大學助理／研究員": "external_university_staff_count",
  "校外大學學生": "external_university_student_count",
  "媒體記者": "media_count",
  "舊表外部參與人數": "legacy_external_participant_count",
});

const TOKEN_FIELDS = new Set(["subject", "service_region", "service_target"]);
const SEARCH_FIELDS = [
  "project","project_family","project_raw","category","subject","service_region","service_region_raw",
  "service_target","service_target_raw","venue_region","venue","activity_name","notes",
];

export function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replaceAll("\u3000", " ").trim().replace(/\s+/g, " ");
  return text || null;
}

function headerMap(headerRow = []) {
  const map = new Map();
  headerRow.forEach((value, index) => {
    const key = cleanText(value);
    if (key) map.set(key, index);
  });
  return map;
}

function pick(row, headers, ...candidates) {
  for (const candidate of candidates) {
    if (!headers.has(candidate)) continue;
    const value = row[headers.get(candidate)];
    if (value !== undefined) return value;
  }
  return null;
}

export function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const text = cleanText(value);
  if (!text || ["無","後補","-","—"].includes(text)) return null;
  const number = Number(text.replaceAll(",", ""));
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function sumKnown(...values) {
  return values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
}

export function toIsoDate(value) {
  const text = cleanText(value);
  if (!text) return null;
  const match = text.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const month = String(Number(m)).padStart(2, "0");
  const day = String(Number(d)).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

export function academicYearRoc(isoDate) {
  if (!isoDate) return null;
  const [year, month] = isoDate.split("-").map(Number);
  return year - (month >= 8 ? 1911 : 1912);
}

export function normalizeRegion(value) {
  const text = cleanText(value);
  if (!text) return null;
  const parts = text
    .replaceAll("台", "臺")
    .replace(/[、，]/g, ",")
    .split(",")
    .map((item) => cleanText(item))
    .filter(Boolean)
    .map((item) => item.startsWith("臺灣/") ? item.slice(3) : item)
    .map((item) => REGION_ALIASES[item] || item);
  return [...new Set(parts)].join(", ") || null;
}

export function normalizeSubject(value) {
  const text = cleanText(value);
  if (!text || ["無","無,","-"].includes(text)) return null;
  if (text === "國英數3科") return "國文, 英文, 數學";
  const aliases = {"英語":"英文","國語":"國文"};
  const parts = text
    .replace(/[、，]/g, ",")
    .split(",")
    .map((item) => cleanText(item))
    .filter((item) => item && item !== "無")
    .map((item) => aliases[item] || item);
  const unique = [...new Set(parts)];
  const order = {"國文":0,"英文":1,"數學":2,"華語":3};
  if (unique.length && unique.every((item) => item in order)) {
    unique.sort((a,b) => order[a] - order[b]);
  }
  return unique.join(", ") || null;
}

export function normalizeServiceTarget(value) {
  const text = cleanText(value);
  if (!text) return null;
  const parts = text
    .replaceAll("台", "臺")
    .replace(/[、，]/g, ",")
    .split(",")
    .map((item) => cleanText(item))
    .filter(Boolean)
    .map((part) => {
      for (const prefix of SCHOOL_PREFIXES) {
        if (!part.startsWith(prefix)) continue;
        const rest = part.slice(prefix.length);
        const schoolLike =
          rest.length >= 4 &&
          !["中小學","國中","國小"].includes(rest) &&
          SCHOOL_SUFFIXES.some((suffix) => rest.endsWith(suffix));
        return schoolLike ? rest : part;
      }
      return part;
    });
  return [...new Set(parts)].join(", ") || null;
}

function normalizeCategory(value) {
  const text = cleanText(value);
  return text ? (CATEGORY_ALIASES[text] || text) : null;
}

function projectFamily(project) {
  return project ? (PROJECT_FAMILIES[project] || project) : null;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return null;
}

function baseRecord(sourceType, rowNumber) {
  return {
    activity_id: `${sourceType}:${rowNumber}`,
    source_type: sourceType,
    source_row_number: rowNumber,
  };
}

export function canonicalizeLegacy(values = []) {
  if (values.length < 2) return [];
  const headers = headerMap(values[0]);
  const records = [];

  values.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const activityDate = toIsoDate(pick(row, headers, "日期"));
    if (!activityDate || activityDate > "2022-12-31") return;

    const projectRaw = cleanText(pick(row, headers, "計畫名稱 (要全名)", "計畫名稱"));
    const project = projectRaw;
    const categoryRaw = cleanText(pick(row, headers, "類別"));
    const serviceRegionRaw = cleanText(pick(row, headers, "地區"));
    const serviceTargetRaw = cleanText(pick(row, headers, "地點"));
    const subjectRaw = cleanText(pick(row, headers, "科目"));

    const ntnuProfessor = toInt(pick(row, headers, "師大教授 人數"));
    const ntnuStaff = toInt(pick(row, headers, "師大研究員 或助理人數"));
    const advisor = toInt(pick(row, headers, "顧問老師 人數"));
    const legacyExternal = toInt(
      pick(
        row,
        headers,
        "參與人數 （合作學校、公部門、NPO等外校人員）",
        "參與人數（合作學校、公部門、NPO等外校人員）",
      ),
    );
    const rooted = toInt(pick(row, headers, "扎根生or中學生 人數"));
    const students = toInt(pick(row, headers, "修業生or大學生 人數"));
    const sourceTotal = toInt(pick(row, headers, "總人數"));
    const calculatedTotal = sumKnown(ntnuProfessor, ntnuStaff, advisor, legacyExternal, rooted, students);

    records.push({
      ...baseRecord("legacy", rowNumber),
      activity_date: activityDate,
      academic_year: academicYearRoc(activityDate),
      project,
      project_family: projectFamily(project),
      project_raw: projectRaw,
      activity_mode: cleanText(pick(row, headers, "遠距請打V")) ? "遠距" : "現場",
      service_region: normalizeRegion(serviceRegionRaw),
      service_region_raw: serviceRegionRaw,
      service_target: normalizeServiceTarget(serviceTargetRaw),
      service_target_raw: serviceTargetRaw,
      venue_region: normalizeRegion(serviceRegionRaw),
      venue: serviceTargetRaw,
      subject: normalizeSubject(subjectRaw),
      subject_raw: subjectRaw,
      category: normalizeCategory(categoryRaw),
      category_raw: categoryRaw,
      activity_name: cleanText(pick(row, headers, "性質")),
      ntnu_professor_count: ntnuProfessor,
      ntnu_staff_count: ntnuStaff,
      ntnu_student_count: students,
      alumni_count: null,
      advisor_teacher_count: advisor,
      rooted_student_count: rooted,
      partner_school_staff_count: null,
      government_staff_count: null,
      npo_staff_count: null,
      external_teacher_count: null,
      external_university_professor_count: null,
      external_university_staff_count: null,
      external_university_student_count: null,
      media_count: null,
      legacy_external_participant_count: legacyExternal,
      total_participant_count: sourceTotal ?? calculatedTotal,
      teacher_participant_count: legacyExternal ?? 0,
      notes: cleanText(pick(row, headers, "其他註記")),
    });
  });

  return records;
}

export function canonicalizeCurrent(values = []) {
  if (values.length < 2) return [];
  const headers = headerMap(values[0]);
  const records = [];

  values.slice(1).forEach((row, offset) => {
    const rowNumber = offset + 2;
    const activityDate = toIsoDate(pick(row, headers, "活動日期"));
    if (!activityDate || activityDate < "2023-01-01") return;

    const projectRaw = cleanText(pick(row, headers, "計畫名稱"));
    const project = projectRaw;
    const categoryRaw = cleanText(pick(row, headers, "活動類別"));
    const serviceRegionRaw = cleanText(pick(row, headers, "服務對象所在地區"));
    const serviceTargetRaw = cleanText(pick(row, headers, "服務對象"));
    const venueRegionRaw = cleanText(pick(row, headers, "舉辦地區"));
    const subjectRaw = cleanText(pick(row, headers, "科目"));

    const counts = {
      ntnu_professor_count: toInt(pick(row, headers, "師大教授（人數）")),
      ntnu_staff_count: toInt(pick(row, headers, "師大助理／研究員（人數）")),
      ntnu_student_count: toInt(pick(row, headers, "師大學生 (人數)")),
      alumni_count: toInt(pick(row, headers, "學程結業學友(人數)")),
      advisor_teacher_count: toInt(pick(row, headers, "顧問老師（人數）")),
      rooted_student_count: toInt(pick(row, headers, "扎根生 (人數)")),
      partner_school_staff_count: toInt(pick(row, headers, "合作學校人員（人數）")),
      government_staff_count: toInt(pick(row, headers, "公部門人員（人數）")),
      npo_staff_count: toInt(pick(row, headers, "NPO人員（人數）")),
      external_teacher_count: toInt(pick(row, headers, "校外教師（人數）")),
      external_university_professor_count: toInt(pick(row, headers, "校外大學教授（人數）")),
      external_university_staff_count: toInt(pick(row, headers, "校外大學助理/研究員（人數）")),
      external_university_student_count: toInt(pick(row, headers, "校外大學學生 (人數)")),
      media_count: toInt(pick(row, headers, "媒體記者 (人數)")),
    };

    const total = sumKnown(...Object.values(counts));
    const teacher = sumKnown(
      counts.partner_school_staff_count,
      counts.npo_staff_count,
      counts.external_teacher_count,
    );

    records.push({
      ...baseRecord("current", rowNumber),
      activity_date: activityDate,
      academic_year: academicYearRoc(activityDate),
      project,
      project_family: projectFamily(project),
      project_raw: projectRaw,
      activity_mode: cleanText(pick(row, headers, "活動形式")),
      service_region: normalizeRegion(serviceRegionRaw),
      service_region_raw: serviceRegionRaw,
      service_target: normalizeServiceTarget(serviceTargetRaw),
      service_target_raw: serviceTargetRaw,
      venue_region: normalizeRegion(venueRegionRaw),
      venue: cleanText(pick(row, headers, "舉辦地點")),
      subject: normalizeSubject(subjectRaw),
      subject_raw: subjectRaw,
      category: normalizeCategory(categoryRaw),
      category_raw: categoryRaw,
      activity_name: firstNonEmpty(
        pick(row, headers, "增能研習名稱"),
        pick(row, headers, "觀議課/學科交流/成果展名稱"),
        pick(row, headers, "會議名稱"),
        pick(row, headers, "其他活動名稱"),
      ),
      ...counts,
      legacy_external_participant_count: null,
      total_participant_count: total,
      teacher_participant_count: teacher,
      notes: cleanText(pick(row, headers, "備註（非必要填寫）")),
    });
  });

  return records;
}

export function canonicalizeSources({legacy = [], current = []}) {
  return [...canonicalizeLegacy(legacy), ...canonicalizeCurrent(current)];
}

function tokens(value) {
  return cleanText(value)
    ?.split(",")
    .map((item) => cleanText(item))
    .filter(Boolean) || [];
}

export function dimensionValues(records, field) {
  const values = new Set();
  for (const record of records) {
    if (TOKEN_FIELDS.has(field)) {
      for (const value of tokens(record[field])) values.add(value);
    } else if (record[field] !== null && record[field] !== undefined && record[field] !== "") {
      values.add(record[field]);
    }
  }
  const result = [...values];
  if (field === "academic_year") return result.sort((a,b) => Number(b) - Number(a));
  return result.sort((a,b) => String(a).localeCompare(String(b), "zh-Hant"));
}

function matchesSelected(record, field, selected) {
  if (!selected?.length) return true;
  if (TOKEN_FIELDS.has(field)) {
    const recordTokens = new Set(tokens(record[field]));
    return selected.some((value) => recordTokens.has(String(value)));
  }
  return selected.some((value) => String(record[field] ?? "") === String(value));
}

function searchableText(record) {
  return SEARCH_FIELDS.map((field) => record[field] ?? "").join(" ").toLocaleLowerCase("zh-Hant");
}

export function applyFilters(records, state = {}) {
  const keywordTerms = cleanText(state.keyword)
    ?.toLocaleLowerCase("zh-Hant")
    .split(/\s+/)
    .filter(Boolean) || [];
  const filterMap = state.filters || {};

  return records.filter((record) => {
    if (state.startDate && record.activity_date < state.startDate) return false;
    if (state.endDate && record.activity_date > state.endDate) return false;

    for (const [field, selected] of Object.entries(filterMap)) {
      if (!matchesSelected(record, field, selected)) return false;
    }

    if (keywordTerms.length) {
      const haystack = searchableText(record);
      if (!keywordTerms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

export function metricValue(record, metricLabel) {
  const column = METRICS[metricLabel];
  if (column === undefined) throw new Error(`Unknown metric: ${metricLabel}`);
  if (column === null) return 1;
  return Number(record[column] ?? 0) || 0;
}

export function metricTotal(records, metricLabel) {
  return records.reduce((sum, record) => sum + metricValue(record, metricLabel), 0);
}

export function aggregate(records, metricLabel, groupBy) {
  const groups = new Map();
  for (const record of records) {
    const key = record[groupBy] ?? "（未填）";
    const current = groups.get(key) || {group: key, value: 0, matchedRows: 0};
    current.value += metricValue(record, metricLabel);
    current.matchedRows += 1;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a,b) => b.value - a.value || String(a.group).localeCompare(String(b.group), "zh-Hant"));
}
