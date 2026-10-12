// PASSION Program Data Hub: aggregate-only reader for authenticated staff pages.
// Never fetch or expose PROGRAM_ENROLLMENTS, IDs, or certificate numbers in the browser.
const headerIndex = (head = []) => new Map(head.map((name, i) => [String(name).trim(), i]));
const cell = (row, headers, name) => String(row[headers.get(name)] ?? "").trim();
const count = (text) => {
  const value = String(text ?? "").trim().replaceAll(",", "");
  if (!value) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
};
const rows = (values, required) => {
  if (!values?.length) throw new Error("學程資料缺少標題列：" + required.join("、"));
  const headers = headerIndex(values[0]);
  for (const name of required) if (!headers.has(name)) {
    throw new Error("學程資料缺少必要欄位：" + name);
  }
  return {headers, body: values.slice(1).filter(row => row?.some(v => String(v ?? "").trim()))};
};

export function canonicalizeProgramSheets(raw = {}) {
  const control = rows(raw.control, ["指標代碼","沿用對外數字"]);
  const kpis = new Map(control.body.map(r => [
    cell(r, control.headers, "指標代碼"),
    count(cell(r, control.headers, "沿用對外數字"))
  ]));
  const admitted = kpis.get("admitted_people_total");
  const certified = kpis.get("certified_people_total");
  if (admitted === null || admitted === undefined || certified === null || certified === undefined)
    throw new Error("尚無核定的學程錄取或認證統計。");

  const distribution = rows(raw.distribution, ["來源學校","學院","系所","錄取人數"]);
  const departments = distribution.body.map(r => ({
    school: cell(r, distribution.headers, "來源學校"),
    college: cell(r, distribution.headers, "學院"),
    department: cell(r, distribution.headers, "系所"),
    admitted: count(cell(r, distribution.headers, "錄取人數")),
  }));
  if (!departments.length || departments.some(r => !r.school || !r.college || !r.department || r.admitted === null))
    throw new Error("學程來源校系統計資料不完整。");
  const distributionTotal = departments.reduce((sum, r) => sum + r.admitted, 0);
  if (distributionTotal !== admitted)
    throw new Error("校院系所分布總和與正式錄取人數不相符，停止顯示。");

  const yearly = rows(raw.yearly, ["錄取西元年（按實際錄取日期）","原始錄取紀錄數","該年錄取中已認證筆數"]);
  const years = yearly.body.map(r => ({
    year: count(cell(r, yearly.headers, "錄取西元年（按實際錄取日期）")),
    admissions: count(cell(r, yearly.headers, "原始錄取紀錄數")),
    certified: count(cell(r, yearly.headers, "該年錄取中已認證筆數")),
  })).filter(r => r.year !== null);
  if (!years.length || years.some(r => r.admissions === null || r.certified === null))
    throw new Error("原始年度名單統計不完整。");

  const sum = rows(raw.summer, ["服務西元年","參與大學生人數","偏鄉學生人次","核定狀態"]);
  const summers = sum.body.map(r => ({
    year: count(cell(r, sum.headers, "服務西元年")),
    period: cell(r, sum.headers, "月份／期間"),
    courseStudents: count(cell(r, sum.headers, "參與大學生人數")),
    servedStudents: count(cell(r, sum.headers, "偏鄉學生人次")),
    schools: count(cell(r, sum.headers, "服務學校數")),
    teachingHours: count(cell(r, sum.headers, "教學課時")),
    status: cell(r, sum.headers, "核定狀態"),
    notes: cell(r, sum.headers, "備註"),
  })).filter(r => r.year !== null);

  const remote = rows(raw.remote, ["學年度（民國）","學期","服務西元年","參與大學生人數","偏鄉學生人次","核定狀態"]);
  const remotes = remote.body.map(r => ({
    academicYear: count(cell(r, remote.headers, "學年度（民國）")),
    semester: count(cell(r, remote.headers, "學期")),
    year: count(cell(r, remote.headers, "服務西元年")),
    courseStudents: count(cell(r, remote.headers, "參與大學生人數")),
    servedStudents: count(cell(r, remote.headers, "偏鄉學生人次")),
    schools: count(cell(r, remote.headers, "服務學校數")),
    teachingHours: count(cell(r, remote.headers, "教學課時")),
    status: cell(r, remote.headers, "核定狀態"),
    notes: cell(r, remote.headers, "備註"),
  })).filter(r => r.academicYear !== null && (r.semester === 1 || r.semester === 2));

  const rawAdmitted = years.reduce((n, r) => n + r.admissions, 0);
  const rawCertified = years.reduce((n, r) => n + r.certified, 0);
  return {
    official: {admitted, certified},
    raw: {admitted: rawAdmitted, certified: rawCertified},
    departments, years, summers, remotes,
  };
}

export function filterProgramDepartments(data, {keyword = "", school = "", college = ""} = {}) {
  const query = String(keyword).trim().toLocaleLowerCase("zh-Hant");
  return data.filter(row =>
    (!school || row.school === school) &&
    (!college || row.college === college) &&
    (!query || [row.school,row.college,row.department]
      .join(" ").toLocaleLowerCase("zh-Hant").includes(query))
  );
}

export function aggregateProgramDepartments(filtered = [], groupBy = "school") {
  const map = new Map();
  for (const row of filtered) {
    const key = groupBy === "college" ? row.college
      : groupBy === "department" ? row.school + "｜" + row.department
        : row.school;
    map.set(key, (map.get(key) || 0) + row.admitted);
  }
  return [...map].map(([group, admitted]) => ({group, admitted}))
    .sort((a,b) => b.admitted - a.admitted || a.group.localeCompare(b.group,"zh-Hant"));
}

export function approvedOnlyTotals(rows, fields) {
  const approved = rows.filter(r => r.status === "已核定");
  const result = {};
  for (const field of fields) {
    const numbers = approved.map(r => r[field]).filter(n => n !== null);
    result[field] = numbers.length ? numbers.reduce((a,b) => a + b, 0) : null;
  }
  return {periods: approved.length, totals: result};
}
