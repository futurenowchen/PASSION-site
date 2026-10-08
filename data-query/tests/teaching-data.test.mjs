import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateTeaching,
  canonicalizeTeaching,
  canonicalizeVerifiedTeachingDetail,
  filterTeachingRecords,
  historicalOverviewGroupKey,
  mergeVerifiedTeachingDetail,
  overlayHistoricalDiagnosticEnrichment,
  applyApprovedHistoricalSupplements,
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


test("verified historical detail replaces only its matching overview group", () => {
  const base = [
    {
      fact_id: "overview-1",
      batch_id: "hist-big-overview-20261008-v1",
      date_start: "2020-09-01",
      date_end: "2020-09-30",
      time_granularity: "month",
      academic_year: 109,
      semester: "上學期",
      project_name: "國教署",
      metric_type: "diagnostic_person_time",
      metric_value: 10,
    },
    {
      fact_id: "overview-pending",
      batch_id: "hist-big-overview-20261008-v1",
      date_start: "2021-09-01",
      date_end: "2021-09-30",
      time_granularity: "month",
      academic_year: 110,
      semester: "上學期",
      project_name: "USR",
      metric_type: "diagnostic_person_time",
      metric_value: 5,
    },
  ];
  const detailValues = [
    ["group_key","group_target","metric_type","project_name","period","date_start","date_end","time_granularity","academic_year","semester","county_city","school_name","school_level","subject","diagnostic_item","grade","metric_value","source_reference","notes"],
    ["diagnostic_person_time|國教署|109.9",10,"diagnostic_person_time","國教署","109.9","2020-09-01","2020-09-30","month",109,"上學期","花蓮縣","富北國中","國中","英文","閱讀","7",6,"detail!A1",""],
    ["diagnostic_person_time|國教署|109.9",10,"diagnostic_person_time","國教署","109.9","2020-09-01","2020-09-30","month",109,"上學期","花蓮縣","東里國中","國中","英文","閱讀","7",4,"detail!A2",""],
  ];
  const detail = canonicalizeVerifiedTeachingDetail(detailValues);
  const merged = mergeVerifiedTeachingDetail(base, detail);

  assert.equal(historicalOverviewGroupKey(base[0]), "diagnostic_person_time|國教署|109.9");
  assert.equal(merged.some(record => record.fact_id === "overview-1"), false);
  assert.equal(merged.some(record => record.fact_id === "overview-pending"), true);
  assert.equal(teachingMetricTotals(merged).diagnostic_person_time, 15);
  assert.deepEqual(
    teachingDimensionValues(merged, "school_name"),
    ["東里國中","富北國中"],
  );
});

test("verified detail also replaces semester-level root overview facts", () => {
  const overview = {
    batch_id: "hist-big-overview-20261008-v1",
    time_granularity: "semester",
    academic_year: 113,
    semester: "下學期",
    project_name: "國教署",
    metric_type: "root_class",
  };
  assert.equal(historicalOverviewGroupKey(overview), "root_class|國教署|113-2");
});

test("validated early historical school-item rows replace, never add to existing total", () => {
  const old = [
    {verified_group_key:"diagnostic_person_time|國教署|105.9", metric_type:"diagnostic_person_time", diagnostic_item:"文法", metric_value:10},
    {verified_group_key:"diagnostic_person_time|國教署|105.9", metric_type:"diagnostic_person_time", diagnostic_item:"詞彙", metric_value:7},
    {verified_group_key:"root_class|國教署|105-1", metric_type:"root_class", diagnostic_item:"數學", metric_value:2},
  ];
  const incoming = [
    {verified_group_key:"diagnostic_person_time|國教署|105.9",metric_type:"diagnostic_person_time",school_name:"富北國中",diagnostic_item:"文法",metric_value:3},
    {verified_group_key:"diagnostic_person_time|國教署|105.9",metric_type:"diagnostic_person_time",school_name:"北安",diagnostic_item:"文法",metric_value:7},
    {verified_group_key:"diagnostic_person_time|國教署|105.9",metric_type:"diagnostic_person_time",school_name:"北安",diagnostic_item:"詞彙",metric_value:7},
  ];
  const after = overlayHistoricalDiagnosticEnrichment(old,incoming);
  assert.equal(after.length,4);
  assert.equal(teachingMetricTotals(after).diagnostic_person_time,17);
  assert.equal(teachingMetricTotals(after).root_class,2);
  assert.deepEqual(after.filter(x=>x.metric_type==="diagnostic_person_time").map(x=>x.school_name),["富北國中","北安","北安"]);
});
test("enrichment fails closed on item mismatch, missing group, or missing school", () => {
  const old=[{verified_group_key:"diagnostic_person_time|國教署|105.9",metric_type:"diagnostic_person_time",diagnostic_item:"閱讀",metric_value:5}];
  const make=(key="diagnostic_person_time|國教署|105.9",item="閱讀",num=5,school="北安")=>
    [{verified_group_key:key,metric_type:"diagnostic_person_time",diagnostic_item:item,metric_value:num,school_name:school}];
  assert.throws(()=>overlayHistoricalDiagnosticEnrichment(old,make(undefined,"文法",5)),/分項不一致/);
  assert.throws(()=>overlayHistoricalDiagnosticEnrichment(old,make(undefined,"閱讀",6)),/分項不一致/);
  assert.throws(()=>overlayHistoricalDiagnosticEnrichment(old,make("diagnostic_person_time|國教署|106.1")) ,/分項不一致/);
  assert.throws(()=>overlayHistoricalDiagnosticEnrichment(old,make(undefined,"閱讀",5,"")),/格式不完整/);
  assert.equal(overlayHistoricalDiagnosticEnrichment(old,[]),old);
});

test("approved Meilun grade-eight supplement is added exactly once after group reconciliation", () => {
  const group = "diagnostic_person_time|國教署|110.9";
  const old = [
    {verified_group_key:group,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"美崙國中",grade:"7",diagnostic_item:"國文",metric_value:119},
    {verified_group_key:group,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"其他國中",grade:"7",diagnostic_item:"國文",metric_value:1192},
    {verified_group_key:"root_class|國教署|110-1",metric_type:"root_class",metric_value:5},
  ];
  const amounts = [["國文",113],["文法",106],["詞彙",106],["聽力",106],["閱讀",106],["數學",124]];
  const supplement = amounts.map(([item,metric_value])=>({
    verified_group_key:group, group_target:1972, project_name:"國教署", school_name:"美崙國中",
    grade:"8", diagnostic_item:item, metric_type:"diagnostic_person_time",metric_value,
  }));
  const merged=applyApprovedHistoricalSupplements(old,supplement);
  assert.equal(merged.length,9);
  assert.equal(teachingMetricTotals(merged).diagnostic_person_time,1972);
  assert.equal(teachingMetricTotals(merged).root_class,5);
  assert.equal(supplement.reduce((sum,r)=>sum+r.metric_value,0),661);
});

test("approved supplements fail closed on different baseline, target, duplicate or missing grade", () => {
  const key="diagnostic_person_time|國教署|110.9";
  const base=[{verified_group_key:key,metric_value:1311}];
  const row={verified_group_key:key,group_target:1972,project_name:"國教署",
    metric_type:"diagnostic_person_time",school_name:"美崙國中",grade:"8",
    diagnostic_item:"國文",metric_value:661};
  assert.equal(applyApprovedHistoricalSupplements(base,[row]).length,2);
  assert.throws(()=>applyApprovedHistoricalSupplements(base,[{...row,group_target:1973}]),/未能對平/);
  assert.throws(()=>applyApprovedHistoricalSupplements(base,[row,row]),/重複項目/);
  assert.throws(()=>applyApprovedHistoricalSupplements(base,[{...row,grade:null}]),/格式不完整/);
  assert.throws(()=>applyApprovedHistoricalSupplements([], [row]),/未能對平/);
});
