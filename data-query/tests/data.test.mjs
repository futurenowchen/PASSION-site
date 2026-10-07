import test from "node:test";
import assert from "node:assert/strict";
import {
  FILTER_FIELDS,
  FILTER_LABELS,
  GROUP_LABELS,
  aggregate,
  applyFilters,
  canonicalizeSources,
  dimensionValues,
  metricTotal,
} from "../js/data.js";

const legacy = [
  [
    "日期","計畫名稱 (要全名)","地區","地點","性質","科目","類別",
    "師大教授 人數","師大研究員 或助理人數","顧問老師 人數",
    "參與人數 （合作學校、公部門、NPO等外校人員）",
    "扎根生or中學生 人數","修業生or大學生 人數","總人數","其他註記","遠距請打V",
  ],
  ["2022/12/01","偏鄉暨弱勢國中小學生學力增能計畫","台東縣","台東縣海端國中","研習","英文","增能",1,2,4,20,0,0,27,"歷史", ""],
];

const currentHeader = [
  "活動日期","計畫名稱","活動形式","服務對象所在地區","服務對象","舉辦地區","舉辦地點","科目","活動類別",
  "增能研習名稱","觀議課/學科交流/成果展名稱","會議名稱","其他活動名稱",
  "師大教授（人數）","師大助理／研究員（人數）","師大學生 (人數)","學程結業學友(人數)",
  "顧問老師（人數）","扎根生 (人數)","合作學校人員（人數）","公部門人員（人數）","NPO人員（人數）",
  "校外教師（人數）","校外大學教授（人數）","校外大學助理/研究員（人數）","校外大學學生 (人數)",
  "媒體記者 (人數)","備註（非必要填寫）",
];

const current = [
  currentHeader,
  ["2025/09/01","PASSION與博幼偏鄉優質教師培育計畫","現場","臺灣/花蓮縣","花蓮縣富北國中","花蓮縣","富北國中","英文","增能研習","博幼英文教師增能","","","",1,1,0,0,4,0,10,3,20,5,0,0,0,0,"生成式AI"],
  ["2022/10/01","PASSION與博幼偏鄉優質教師培育計畫","現場","花蓮縣","富北國中","花蓮縣","富北國中","英文","增能研習","舊重複","","","",0,0,0,0,0,0,10,0,10,0,0,0,0,0,""],
];

test("canonical rules preserve confirmed teacher metric policy", () => {
  const records = canonicalizeSources({legacy, current});
  assert.equal(records.length, 2);

  const old = records.find(r => r.source_type === "legacy");
  assert.equal(old.teacher_participant_count, 20);
  assert.equal(old.advisor_teacher_count, 4);
  assert.equal(old.project_family, "偏鄉學力增能計畫");
  assert.equal(old.service_region, "臺東縣");
  assert.equal(old.service_target, "海端國中");

  const now = records.find(r => r.source_type === "current");
  assert.equal(now.teacher_participant_count, 35);
  assert.equal(now.advisor_teacher_count, 4);
  assert.equal(now.service_target, "富北國中");
});

test("current rows before 2023 are excluded", () => {
  const records = canonicalizeSources({legacy: [], current});
  assert.equal(records.length, 1);
  assert.equal(records[0].activity_date, "2025-09-01");
});

test("filter semantics are OR within dimension and AND across dimensions", () => {
  const records = canonicalizeSources({legacy, current});
  const filtered = applyFilters(records, {
    keyword: "博幼 英文",
    filters: {
      project: ["PASSION與博幼偏鄉優質教師培育計畫"],
      service_region: ["花蓮縣"],
    },
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].teacher_participant_count, 35);
});

test("dimension tokens and aggregation work without double-counting source rows", () => {
  const records = canonicalizeSources({legacy, current});
  assert.deepEqual(dimensionValues(records, "subject"), ["英文"]);
  assert.equal(metricTotal(records, "教師參與人次"), 55);
  const grouped = aggregate(records, "教師參與人次", "project_family");
  assert.equal(grouped.length, 2);
  assert.equal(grouped.reduce((sum, row) => sum + row.value, 0), 55);
});


test("UI exposes raw project values as 計畫項目 instead of project family", () => {
  assert.equal(FILTER_FIELDS.includes("project_family"), false);
  assert.equal(FILTER_FIELDS.includes("project"), true);
  assert.equal(FILTER_LABELS.project, "計畫項目");
  assert.equal(GROUP_LABELS.project, "計畫項目");
});


test("legacy non-school venue stays in venue fields and is excluded from service filters", () => {
  const venueOnlyLegacy = [
    legacy[0],
    ["2021/12/29","「心心向榮」偏鄉國民小學學力增能計畫","臺北市","臺師大、Xpark","記者會及校外參訪","","其他",0,0,0,0,0,0,0,"",""],
  ];
  const [record] = canonicalizeSources({legacy: venueOnlyLegacy, current: []});
  assert.equal(record.service_region, null);
  assert.equal(record.service_target, null);
  assert.equal(record.venue_region, "臺北市");
  assert.equal(record.venue, "臺師大、Xpark");
  assert.equal(dimensionValues([record], "service_target").includes("臺師大、Xpark"), false);
  assert.equal(dimensionValues([record], "venue").includes("臺師大、Xpark"), true);
});

test("current service-region normalization drops obvious non-region spillover", () => {
  const dirtyCurrent = [
    currentHeader,
    ["2023/09/08","深耕偏鄉教育計畫：深化、廣化、國際化、永續化","現場","臺灣/臺北市, USR科技化教學產業學分學程","大學生","臺灣/臺北市","臺師大","無","會議","","","","",0,0,0,0,0,0,0,0,0,0,0,0,0,0,""],
  ];
  const [record] = canonicalizeSources({legacy: [], current: dirtyCurrent});
  assert.equal(record.service_region, "臺北市");
});

test("filter UI includes separate venue dimensions", () => {
  assert.equal(FILTER_LABELS.service_region, "服務對象所在地區");
  assert.equal(FILTER_LABELS.venue_region, "舉辦地區");
  assert.equal(FILTER_LABELS.venue, "舉辦地點");
  assert.equal(FILTER_FIELDS.includes("venue_region"), true);
  assert.equal(FILTER_FIELDS.includes("venue"), true);
});
