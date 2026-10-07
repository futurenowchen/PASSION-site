import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateTeaching,
  canonicalizeTeaching,
  filterTeachingRecords,
  teachingDimensionValues,
  teachingMetricTotals,
} from "../js/teaching-data.js";

const factsHeader = [
  "fact_id","batch_id","status","date_start","date_end","time_granularity","academic_year","semester",
  "project_id","project_name","school_id","school_name","county_city","school_level","subject","diagnostic_item",
  "grade","metric_type","metric_value","unit","source_type","source_reference","source_hash","parser_version","created_at","notes",
];

const facts = [
  factsHeader,
  ["f1","b1","active","2026-01-10","2026-01-10","day",114,"上學期","p1","國教署","s1","富北國中","","國中","國文","國文","7","diagnostic_person_time",3,"人次","diagnostic_raw_xlsx","raw::國文","","v1","",""],
  ["f2","b1","active","2026-01-01","2026-01-31","month",114,"跨期/未知","p1","國教署","s1","富北國中","","國中","英文","閱讀","7","diagnostic_person_time",10,"人次","diagnostic_raw_xlsx","raw::英文","","v1","",""],
  ["f3","b2","active","2026-02-01","2026-07-31","semester",114,"下學期","p2","USR","s2","海端國中","","國中","數學","","7","root_class",2,"班","manual","form","","v1","",""],
  ["f4","b0","superseded","2026-01-01","2026-01-31","month",114,"跨期/未知","p1","國教署","s1","富北國中","","國中","英文","閱讀","7","diagnostic_person_time",99,"人次","diagnostic_raw_xlsx","old","","v0","",""],
];

const schools = [
  ["school_id","canonical_name","short_name","aliases","county_city","district","school_level","active_from","active_to","status","notes"],
  ["s1","富北國中","富北","","花蓮縣","","國中","","","active",""],
  ["s2","海端國中","海端","","臺東縣","","國中","","","active",""],
];

test("canonical teaching facts join school dimensions and ignore superseded rows", () => {
  const records = canonicalizeTeaching({facts, schools});
  assert.equal(records.length, 3);
  assert.equal(records[0].county_city, "花蓮縣");
  assert.equal(records[2].county_city, "臺東縣");
  assert.equal(teachingMetricTotals(records).diagnostic_person_time, 13);
  assert.equal(teachingMetricTotals(records).root_class, 2);
});

test("partial date cuts conservatively exclude coarse-grained records", () => {
  const records = canonicalizeTeaching({facts, schools});
  const result = filterTeachingRecords(records, {
    startDate: "2026-01-01",
    endDate: "2026-01-15",
  });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].fact_id, "f1");
  assert.equal(result.partialRecords.length, 1);
  assert.equal(result.partialRecords[0].fact_id, "f2");
});

test("full coarse period is included and filters remain AND across dimensions", () => {
  const records = canonicalizeTeaching({facts, schools});
  const result = filterTeachingRecords(records, {
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    filters: {
      project_name: ["國教署"],
      subject: ["英文"],
    },
  });
  assert.deepEqual(result.records.map(r => r.fact_id), ["f2"]);
  assert.equal(result.partialRecords.length, 0);
});

test("teaching aggregation keeps the three core metrics side by side", () => {
  const records = canonicalizeTeaching({facts, schools});
  const rows = aggregateTeaching(records, "school");
  const fubei = rows.find(row => row.group === "富北國中");
  assert.equal(fubei.diagnostic_person_time, 13);
  assert.equal(fubei.root_class, 0);
  assert.deepEqual(teachingDimensionValues(records, "county_city"), ["花蓮縣","臺東縣"]);
});


test("date precision warnings respect the other active filters", () => {
  const records = canonicalizeTeaching({facts, schools});
  const result = filterTeachingRecords(records, {
    startDate: "2026-01-01",
    endDate: "2026-01-15",
    filters: {project_name: ["USR"]},
  });
  assert.equal(result.records.length, 0);
  assert.equal(result.partialRecords.length, 0);
});


test("undated academic-year facts remain visible when no date range is selected", () => {
  const undated = [{
    fact_id: "summer-1",
    date_start: null,
    date_end: null,
    time_granularity: "academic_year",
    academic_year: 114,
    semester: "暑期",
    project_name: "暑期實習",
    metric_type: "root_person_time",
    metric_value: 228,
  }];
  const all = filterTeachingRecords(undated, {});
  assert.equal(all.records.length, 1);
  const dated = filterTeachingRecords(undated, {
    startDate: "2025-08-01",
    endDate: "2026-07-31",
  });
  assert.equal(dated.records.length, 0);
});
