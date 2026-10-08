import test from "node:test";
import assert from "node:assert/strict";
import {evaluateTeachingAcceptance} from "../js/teaching-acceptance.js";

const distribution = {
  "水碓國小": [21, 21, 21, 21, 21, 21],
  "永光國小": [12, 48, 48, 48, 48, 49],
  "華南國小": [6, 25, 25, 25, 25, 29],
  "樟湖國中小": [4, 18, 18, 18, 18, 24],
};
const items = ["國文", "文法", "詞彙", "聽力", "閱讀", "數學"];
const metric = (metric_type, metric_value, extra = {}) => ({metric_type, metric_value, ...extra});
const cohort = (period, metric_value) => metric("diagnostic_person_time", metric_value, {
  project_name: "雲林", verified_group_key: `diagnostic_person_time|雲林|${period}`,
});

function sampleRecords() {
  const yunlin = Object.entries(distribution).flatMap(([school_name, counts]) =>
    counts.map((metric_value, index) => metric("diagnostic_person_time", metric_value, {
      project_name: "雲林", verified_group_key: "diagnostic_person_time|雲林|110.6",
      school_name, diagnostic_item: items[index],
    })));
  return [
    metric("diagnostic_person_time", 121136),
    metric("root_class", 2315),
    metric("root_person_time", 15844),
    cohort("110.2", 587),
    cohort("110.12", 620),
    ...yunlin,
  ];
}

test("all seven release acceptance checks pass for the approved aggregate baseline", () => {
  const result = evaluateTeachingAcceptance(sampleRecords());
  assert.equal(result.total, 7);
  assert.equal(result.passed, 7);
  assert.equal(result.allPassed, true);
});

test("detects total drift and Yunlin 110.6 value drift without silent pass", () => {
  const rows = sampleRecords();
  rows.at(-1).metric_value += 1;
  const result = evaluateTeachingAcceptance(rows);
  assert.equal(result.allPassed, false);
  assert.deepEqual(result.checks.filter(c => !c.pass).map(c => c.code),
    ["diagnostic", "yunlin-110.6"]);
});

test("rejects missing school or duplicate item even when numeric total is unchanged", () => {
  const rows = sampleRecords();
  rows.at(-1).school_name = null;
  const result = evaluateTeachingAcceptance(rows);
  assert.equal(result.checks.find(c => c.code === "yunlin-110.6-detail").pass, false);
  assert.equal(result.checks.find(c => c.code === "yunlin-110.6").pass, true);
});

test("accepts legacy month summary for 110.12 but not a wrong month", () => {
  const rows = sampleRecords();
  const index = rows.findIndex(r => r.verified_group_key?.endsWith("110.12"));
  rows[index] = metric("diagnostic_person_time", 620, {
    project_name: "雲林", batch_id: "hist-big-overview-20261008-v1",
    date_start: "2021-12-01", time_granularity: "month",
  });
  assert.equal(evaluateTeachingAcceptance(rows).allPassed, true);
  rows[index].date_start = "2022-01-01";
  assert.equal(evaluateTeachingAcceptance(rows).checks.find(c => c.code === "yunlin-110.12").pass, false);
});

test("empty loaded data fails closed for all tracked baseline totals", () => {
  const result = evaluateTeachingAcceptance([]);
  assert.equal(result.allPassed, false);
  assert.equal(result.passed, 0);
});
