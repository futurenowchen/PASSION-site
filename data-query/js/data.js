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
const SCHOOL_SUFFIXES = ["國中","國小","高中","高職","高工","中學","國中小","國民中學","國民小學","高中國中部","國中部","學校"];
const NO_SERVICE_VALUES = new Set(["無","無服務對象","不限","-","—"]);
const VALID_TAIWAN_REGIONS = new Set([
  "基隆市","臺北市","新北市","桃園市","新竹市","新竹縣","苗栗縣","臺中市","彰化縣",
  "南投縣","雲林縣","嘉義市","嘉義縣","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣",
  "臺東縣","澎湖縣","金門縣","連江縣","全臺",
]);
const INTERNATIONAL_REGION_PREFIXES = ["土耳其","敘利亞","越南","泰國","緬甸"];

export const FILTER_FIELDS = [
  "academic_year",
  "project",
  "category",
  "subject",
  "service_region",
  "service_target",
  "venue_region",
  "venue",
];

export const FILTER_LABELS = Object.freeze({
  academic_year: "學年度",
  project: "計畫項目",
  category: "活動類別",
  subject: "科目／主題",
  service_region: "服務對象所在地區",
  service_target: "服務對象／學校",
  venue_region: "舉辦地區",
  venue: "舉辦地點",
});

export const GROUP_LABELS = Object.freeze({
  project: "計畫項目",
  academic_year: "學年度",
  category: "活動類別",
  subject: "科目／主題",
  service_region: "服務地區",
  service_target: "服務對象／學校",
  activity_mode: "活動形式",
  venue_region: "舉辦地區",
  venue: "舉辦地點",
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

const TOKEN_FIELDS = new Set(["subject", "service_region", "service_target", "venue_region"]);
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

export function normalizeServiceRegion(value) {
  const text = cleanText(value);
  if (!text || NO_SERVICE_VALUES.has(text)) return null;

  const parts = text
    .replaceAll("台", "臺")
    .replace(/[、，]/g, ",")
    .split(",")
    .map((item) => cleanText(item))
    .filter(Boolean)
    .map((item) => {
      if (item.startsWith("臺灣/")) {
        const region = REGION_ALIASES[item.slice(3)] || item.slice(3);
        return VALID_TAIWAN_REGIONS.has(region) ? region : null;
      }
      const normalized = REGION_ALIASES[item] || item;
      if (VALID_TAIWAN_REGIONS.has(normalized)) return normalized;
      if (INTERNATIONAL_REGION_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(prefix + "/"))) {
        return normalized;
      }
      return null;
    })
    .filter(Boolean);

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
  if (!text || NO_SERVICE_VALUES.has(text)) return null;
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

function looksLikeLegacySchool(value) {
  const text = cleanText(value)?.replaceAll("台", "臺");
  if (!text) return false;
  if (SCHOOL_SUFFIXES.some((suffix) => text.includes(suffix))) return true;
  return /[一二三四五六七八九十]中$/.test(text);
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
    const legacyRegionRaw = cleanText(pick(row, headers, "地區"));
    const legacyVenueRaw = cleanText(pick(row, headers, "地點"));
    const inferredLegacyServiceTarget = looksLikeLegacySchool(legacyVenueRaw)
      ? normalizeServiceTarget(legacyVenueRaw)
      : null;
    const inferredLegacyServiceRegion = inferredLegacyServiceTarget
      ? normalizeRegion(legacyRegionRaw)
      : null;
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
      service_region: inferredLegacyServiceRegion,
      service_region_raw: inferredLegacyServiceRegion ? legacyRegionRaw : null,
      service_target: inferredLegacyServiceTarget,
      service_target_raw: inferredLegacyServiceTarget ? legacyVenueRaw : null,
      venue_region: normalizeRegion(legacyRegionRaw),
      venue: legacyVenueRaw,
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
      service_region: normalizeServiceRegion(serviceRegionRaw),
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

/**
 * 110-114 interview history is stored as a separate approved, anonymous batch.
 * Interviewees are counted as participants, but students are NOT assumed to be
 * 扎根生 and interviewers are NOT counted without a confirmed attendance basis.
 * No student names, respondent IDs or video URLs are read.
 */
export function canonicalizeInterviewImport(values = []) {
  if (values.length < 2) throw new Error("缺少110–114訪談修正版批次，停止載入。");
  const headers=headerMap(values[0]);
  const required=["批次ID","活動日期","學年度","計畫名稱","服務對象","科目",
    "活動類別","其他活動名稱","訪談種類","受訪教師人次","受訪學生人次",
    "受訪校方其他人員人次","來源原始檔位置","核定狀態"];
  if(required.some(key=>!headers.has(key)))throw new Error("訪談V2缺必要欄位，停止載入。");
  const seen=new Set(),records=[],byYear=new Map();
  const expectedDateOnly=new Map([
    ["PIV-20261013-V3-0286",["2023-05-30","玉東國中",15,"111學生訪談名單!2:17"]],
    ["PIV-20261013-V3-0287",["2023-06-06","卓楓國小",2,"111學生訪談名單!46:49"]],
    ["PIV-20261013-V3-0288",["2023-06-27","卓楓國小",2,"111學生訪談名單!50:51"]],
  ]);
  let dateOnlyCount=0;
  for(const row of values.slice(1)){
    const id=cleanText(pick(row,headers,"批次ID"));
    if(!id)continue;
    const date=toIsoDate(pick(row,headers,"活動日期"));
    const year=toInt(pick(row,headers,"學年度"));
    const school=cleanText(pick(row,headers,"服務對象"));
    const subject=cleanText(pick(row,headers,"科目"));
    const type=cleanText(pick(row,headers,"訪談種類"));
    const teacher=toInt(pick(row,headers,"受訪教師人次"));
    const student=toInt(pick(row,headers,"受訪學生人次"));
    const other=toInt(pick(row,headers,"受訪校方其他人員人次"));
    const name=cleanText(pick(row,headers,"其他活動名稱"));
    const project=cleanText(pick(row,headers,"計畫名稱"));
    const source=cleanText(pick(row,headers,"來源原始檔位置"));
    const notes=cleanText(pick(row,headers,"備註"));
    const status=cleanText(pick(row,headers,"核定狀態"));
    const count=(teacher??0)+(student??0)+(other??0);
    const expectedType=teacher&&student?"教師與學生":teacher?"教師":student?"學生":"校方人員";
    const dateOnly=expectedDateOnly.get(id);
    const dateOnlyValid=dateOnly && dateOnly[0]===date && dateOnly[1]===school &&
      dateOnly[2]===student && teacher===0 && other===0 &&
      source==="訪談紀錄彙整.xlsx::"+dateOnly[3] &&
      status==="已核定（受訪者人次；僅日期）";
    if(seen.has(id)||!/^PIV-20261013-(?:V2|V3)-\d{4}$/.test(id)||
       !date||year<110||year>114||academicYearRoc(date)!==year||
       !school||!subject||!name||!project||!source?.startsWith("訪談紀錄彙整.xlsx::")||
       cleanText(pick(row,headers,"活動類別"))!=="訪談"||
       [teacher,student,other].some(n=>n===null||n<0)||count<1||
       type!==expectedType||(!dateOnlyValid && (dateOnly || status!=="已核定（受訪者人次；時段已確認）"))||
       /meet\.google\.com|https?:\/\//i.test(name+" "+notes+" "+source)){
      throw new Error("訪談V2原始場次、核定口徑或個資欄位不合規："+(id||"未知"));
    }
    seen.add(id);
    if(dateOnlyValid)dateOnlyCount++;
    byYear.set(year,(byYear.get(year)||0)+1);
    records.push({
      activity_id:id,source_type:"interview_import",source_row_number:null,
      activity_date:date,academic_year:year,project,project_raw:project,project_family:project,
      category:"訪談",category_raw:"訪談",subject,subject_raw:subject,
      activity_name:name,activity_mode:null,
      service_target:school,service_target_raw:school,
      service_region:null,service_region_raw:null,venue_region:null,venue:null,
      ntnu_professor_count:null,ntnu_staff_count:null,ntnu_student_count:null,
      alumni_count:null,advisor_teacher_count:null,rooted_student_count:null,
      partner_school_staff_count:teacher+other,government_staff_count:null,npo_staff_count:null,
      external_teacher_count:null,external_university_professor_count:null,
      external_university_staff_count:null,external_university_student_count:null,
      media_count:null,legacy_external_participant_count:null,
      teacher_participant_count:teacher,total_participant_count:count,
      interview_student_count:student,interview_other_school_staff_count:other,
      notes:(notes||"")+"；僅計受訪者，不含訪談團隊成員",source_reference:source,
    });
  }
  const expectedYears=new Map([[110,16],[111,45],[112,73],[113,80],[114,74]]);
  if(records.length!==288||dateOnlyCount!==3||
     records.reduce((n,r)=>n+r.total_participant_count,0)!==396||
     records.reduce((n,r)=>n+r.teacher_participant_count,0)!==162||
     records.reduce((n,r)=>n+r.interview_student_count,0)!==232||
     records.reduce((n,r)=>n+r.interview_other_school_staff_count,0)!==2||
     [...expectedYears].some(([y,n])=>byYear.get(y)!==n))
    throw new Error("110–114訪談V3場次／人次／年度數量未對平，停止載入。");
  return records;
}

export function canonicalizeSources({legacy = [], current = [], interviews = []}) {
  return [
    ...canonicalizeLegacy(legacy),
    ...canonicalizeCurrent(current),
    ...canonicalizeInterviewImport(interviews),
  ];
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
