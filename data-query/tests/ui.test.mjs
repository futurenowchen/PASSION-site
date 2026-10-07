import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const activity = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const teaching = fs.readFileSync(new URL("../teaching.html", import.meta.url), "utf8");

test("data query exposes the four top-level categories", () => {
  for (const label of ["活動資料", "教學資料", "問卷資料", "PASSION學程資料"]) {
    assert.match(activity, new RegExp(label));
    assert.match(teaching, new RegExp(label));
  }
});

test("teaching query includes required metrics, auth, and time/filter dimensions", () => {
  for (const label of [
    "診斷人次", "扎根班", "扎根人次",
    "學年度", "學期", "計畫項目", "地區", "學校", "學制", "科目", "診斷項目", "年級",
    "起始日期", "結束日期"
  ]) {
    assert.match(teaching, new RegExp(label));
  }
  assert.match(teaching, /08\/01–01\/15 上學期/);
  assert.match(teaching, /02\/01–07\/31 下學期/);
  assert.match(teaching, /id="authorizeBtn"/);
  assert.match(teaching, /id="teachingFilters"/);
  assert.match(teaching, /id="metricDiagnostic"/);
  assert.match(teaching, /id="teachingSummaryTable"/);
  assert.match(teaching, /id="teachingDetailTable"/);
  assert.doesNotMatch(teaching, /尚未接入正式教學資料/);
});
