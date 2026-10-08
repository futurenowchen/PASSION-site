// Aggregate-only release acceptance checks. Never read or emit student identities.
export const TEACHING_ACCEPTANCE_BASELINE = Object.freeze({
  diagnostic_person_time: 122418,
  root_class: 2315,
  root_person_time: 15844,
  yunlin_1102: 587,
  yunlin_1106: 614,
  yunlin_11012: 620,
});

const YUNLIN_ITEMS = ["國文", "文法", "詞彙", "聽力", "閱讀", "數學"];
const YUNLIN_SCHOOLS = ["水碓國小", "永光國小", "華南國小", "樟湖國中小"];

function recordGroupKey(record) {
  if (record.verified_group_key) return record.verified_group_key;
  if (record.batch_id !== "hist-big-overview-20261008-v1" ||
      record.time_granularity !== "month") return null;
  const match = String(record.date_start || "").match(/^(\d{4})-(\d{2})-/);
  return match && record.metric_type && record.project_name
    ? `${record.metric_type}|${record.project_name}|${Number(match[1]) - 1911}.${Number(match[2])}`
    : null;
}

function check(code, label, actual, expected, pass = actual === expected) {
  return {code, label, actual, expected, pass};
}

/**
 * Evaluate the fully merged, unfiltered records used by the teaching page.
 * This is a dated release baseline; change it only after a separately approved data update.
 */
export function evaluateTeachingAcceptance(records = []) {
  const totals = {diagnostic_person_time: 0, root_class: 0, root_person_time: 0};
  const cohorts = new Map([
    ["110.2", []], ["110.6", []], ["110.12", []],
  ]);
  for (const record of records) {
    if (Object.hasOwn(totals, record.metric_type)) {
      totals[record.metric_type] += Number(record.metric_value || 0);
    }
    if (record.project_name !== "雲林" ||
        record.metric_type !== "diagnostic_person_time") continue;
    const key = recordGroupKey(record);
    for (const [period, rows] of cohorts) {
      if (key === `diagnostic_person_time|雲林|${period}`) rows.push(record);
    }
  }
  const checks = [
    check("diagnostic", "診斷總人次", totals.diagnostic_person_time,
      TEACHING_ACCEPTANCE_BASELINE.diagnostic_person_time),
    check("root-classes", "扎根班", totals.root_class,
      TEACHING_ACCEPTANCE_BASELINE.root_class),
    check("root-people", "扎根人次", totals.root_person_time,
      TEACHING_ACCEPTANCE_BASELINE.root_person_time),
  ];
  for (const [period, expected] of [
    ["110.2", TEACHING_ACCEPTANCE_BASELINE.yunlin_1102],
    ["110.6", TEACHING_ACCEPTANCE_BASELINE.yunlin_1106],
    ["110.12", TEACHING_ACCEPTANCE_BASELINE.yunlin_11012],
  ]) {
    const actual = cohorts.get(period).reduce((sum, row) =>
      sum + Number(row.metric_value || 0), 0);
    checks.push(check(`yunlin-${period}`, `雲林 ${period} 人次`, actual, expected));
  }
  const rows1106 = cohorts.get("110.6");
  const combinations = new Set(rows1106.map(row =>
    `${row.school_name || ""}|${row.diagnostic_item || ""}`));
  const expectedCombinations = new Set(YUNLIN_SCHOOLS.flatMap(school =>
    YUNLIN_ITEMS.map(item => `${school}|${item}`)));
  const structurePass = rows1106.length === 24 && combinations.size === 24 &&
    [...combinations].every(item => expectedCombinations.has(item));
  checks.push(check("yunlin-110.6-detail", "雲林 110.6 分校六項完整性",
    `${rows1106.length} 筆／${combinations.size} 組`, "24 筆／24 組", structurePass));
  return {checks, passed: checks.filter(item => item.pass).length,
    total: checks.length, allPassed: checks.every(item => item.pass)};
}
