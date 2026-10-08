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
  applyOriginalPriorityHistoricalReplacement,
  replaceApproved1136OverviewWithRaw,
  replaceApprovedUSR1111And1149Overviews,
  replaceYunlin1106WithDedupedSource,
  replaceHualienMeteringPeriods,
  replaceNational1149Official,
  replaceUsrRoot1121,
  applyNmoe1109RawPriority,
  applyApprovedHistoricalDetailDecisions,
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

test("original-source priority completely replaces 111.6 verified school-item group and preserves other groups", () => {
  const key="diagnostic_person_time|國教署|111.6";
  const old=[
    {verified_group_key:key,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"美崙國中",school_level:"國中",diagnostic_item:"文法",metric_value:231},
    {verified_group_key:key,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"富北國中",school_level:"國中",diagnostic_item:"數學",metric_value:51},
    {verified_group_key:"root_class|國教署|110-2",project_name:"國教署",metric_type:"root_class",metric_value:5},
  ];
  const raw=[
    {verified_group_key:key,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"美崙國中",school_level:"國中",diagnostic_item:"文法",grade:"7",metric_value:112,group_baseline:282,group_target:281},
    {verified_group_key:key,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"美崙國中",school_level:"國中",diagnostic_item:"文法",grade:"8",metric_value:119,group_baseline:282,group_target:281},
    {verified_group_key:key,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"富北國中",school_level:"國中",diagnostic_item:"數學",grade:"7",metric_value:50,group_baseline:282,group_target:281},
  ];
  const updated=applyOriginalPriorityHistoricalReplacement(old,raw);
  assert.equal(updated.length,4);
  assert.equal(teachingMetricTotals(updated).diagnostic_person_time,281);
  assert.equal(teachingMetricTotals(updated).root_class,5);
  assert.equal(updated.some(r=>r.school_name==="美崙國中" && !r.grade),false);
});

test("original-source replacement fails closed on incomplete, changed, duplicate or mismatched groups", () => {
  const key="diagnostic_person_time|國教署|111.6";
  const old=[{verified_group_key:key,metric_type:"diagnostic_person_time",school_name:"美崙國中",school_level:"國中",diagnostic_item:"文法",metric_value:3}];
  const value={verified_group_key:key,project_name:"國教署",metric_type:"diagnostic_person_time",school_name:"美崙國中",school_level:"國中",diagnostic_item:"文法",grade:"7",metric_value:2,group_baseline:3,group_target:2};
  assert.equal(applyOriginalPriorityHistoricalReplacement(old,[value]).length,1);
  assert.throws(()=>applyOriginalPriorityHistoricalReplacement(old,[{...value,group_baseline:4}]),/未能與官方基準/);
  assert.throws(()=>applyOriginalPriorityHistoricalReplacement(old,[{...value,group_target:3}]),/未能與官方基準/);
  assert.throws(()=>applyOriginalPriorityHistoricalReplacement(old,[value,value]),/不合法或重複/);
  assert.throws(()=>applyOriginalPriorityHistoricalReplacement(old,[{...value,grade:""}]),/不合法或重複/);
  assert.throws(()=>applyOriginalPriorityHistoricalReplacement([], [value]),/群組不存在/);
  assert.equal(applyOriginalPriorityHistoricalReplacement(old,[]),old);
});

test("113.6 USR is a verified full-group replacement, not an addition", () => {
  const key = "diagnostic_person_time|USR|113.6";
  const baseline = {
    fact_id:"overview", batch_id:"hist-big-overview-20261008-v1",
    metric_type:"diagnostic_person_time",project_name:"USR",
    time_granularity:"month",date_start:"2024-06-01",metric_value:109,
  };
  const unrelated = {fact_id:"unrelated",metric_type:"root_class",metric_value:5};
  const amounts = [
    ["吉貝國中",[5,5,5,5,5]],
    ["富里國中",[8,8,8,8,8]],
    ["海端國中",[8,8,8,8,7]],
    ["望安國中",[1,1,1,1,1]],
    ["萬榮國中",[9,9,9,9,9]],
  ];
  const items=["數學","文法","詞彙","聽力","閱讀"];
  const raw = amounts.flatMap(([school,vals]) => items.map((item,i) => ({
    verified_group_key:key,project_name:"USR",metric_type:"diagnostic_person_time",
    school_name:school,school_level:"國中",grade:"7",
    diagnostic_item:item,metric_value:vals[i],group_baseline:109,group_target:154,
    date_start:"2024-06-01",date_end:"2024-06-30",
  })));
  const result = replaceApproved1136OverviewWithRaw([baseline,unrelated],raw);
  assert.equal(result.length,26);
  assert.equal(result.some(x=>x.fact_id==="overview"),false);
  assert.equal(teachingMetricTotals(result).diagnostic_person_time,154);
  assert.equal(teachingMetricTotals(result).root_class,5);
  assert.throws(()=>replaceApproved1136OverviewWithRaw([baseline,unrelated],[]),/基準或完整/);
  assert.throws(()=>replaceApproved1136OverviewWithRaw([baseline,unrelated],raw.slice(1)),/基準或完整/);
  assert.throws(()=>replaceApproved1136OverviewWithRaw(
    [{...baseline,metric_value:110},unrelated],raw),/基準或完整/);
  assert.throws(()=>replaceApproved1136OverviewWithRaw(
    [baseline,{verified_group_key:key,metric_value:109}],raw),/基準或完整/);
  assert.throws(()=>replaceApproved1136OverviewWithRaw(
    [baseline,unrelated],raw.map((r,i)=>i===0?{...r,metric_value:6}:r)),/數字不符/);
  assert.throws(()=>replaceApproved1136OverviewWithRaw(
    [baseline,unrelated],raw.map((r,i)=>i===0?{...r,grade:"8"}:r)),/數字不符/);
  assert.throws(()=>replaceApproved1136OverviewWithRaw(
    [baseline,unrelated],[raw[0],...raw.slice(1).map((r,i)=>i===0?{...r,school_name:"吉貝國中",diagnostic_item:"數學"}:r)]),/重複/);
});

test("8 approved historical cohorts replace overview instead of stacking totals", () => {
  const contracts = [
    ["root_class","花蓮教育處","113-1",22,21,7,"2024-08-01","2025-01-15",113],
    ["root_class","花蓮教育處","113-2",19,25,7,"2025-02-01","2025-07-31",113],
    ["root_class","花蓮教育處","114-1",23,28,6,"2025-08-01","2026-01-15",114],
    ["root_person_time","花蓮教育處","113-1",77,85,7,"2024-08-01","2025-01-15",113],
    ["root_person_time","花蓮教育處","113-2",84,105,7,"2025-02-01","2025-07-31",113],
    ["root_person_time","花蓮教育處","114-1",91,115,6,"2025-08-01","2026-01-15",114],
    ["diagnostic_person_time","光華高工","112.6",0,1272,18,"2023-06-01","2023-06-30",111],
    ["diagnostic_person_time","芳和中學","111.1",0,49,6,"2022-01-01","2022-01-31",110],
  ];
  const base = [{fact_id:"unrelated",metric_type:"diagnostic_person_time",metric_value:5}];
  const details = [];
  for (const [metric,project,period,baseline,target,amount,from,to,academic_year] of contracts) {
    const key = [metric,project,period].join("|");
    if (baseline !== 0) {
      base.push({batch_id:"hist-big-overview-20261008-v1",metric_type:metric,
        project_name:project,time_granularity:"semester",academic_year,
        semester:period.endsWith("-1")?"上學期":"下學期",metric_value:baseline});
    }
    for (let n=0;n<amount;n++) {
      const metric_value = project==="芳和中學"?(n===5?49:0):
        Math.floor(target/amount)+(n<target%amount?1:0);
      const item=["國文","文法","詞彙","聽力","閱讀","數學"][n%6];
      details.push({verified_group_key:key,metric_type:metric,project_name:project,
        group_target:target,group_baseline:baseline,
        date_start:from,date_end:to,academic_year,
        school_name:metric==="diagnostic_person_time"?project:"學校"+n,
        school_level:metric==="diagnostic_person_time"?(project==="光華高工"?"高職":"國中"):"國小",
        diagnostic_item:metric==="diagnostic_person_time"?item:null,
        grade:metric==="diagnostic_person_time"?"高一":null,
        metric_value,source_reference:key+"!A"+n});
    }
  }
  const updated=applyApprovedHistoricalDetailDecisions(base,details);
  assert.equal(updated.length,65);
  assert.equal(teachingMetricTotals(updated).diagnostic_person_time,1326);
  assert.equal(teachingMetricTotals(updated).root_class,74);
  assert.equal(teachingMetricTotals(updated).root_person_time,305);
  assert.equal(applyApprovedHistoricalDetailDecisions(base,details).length,65);
  assert.throws(()=>applyApprovedHistoricalDetailDecisions(base,details.slice(1)),/64列/);
  assert.throws(()=>applyApprovedHistoricalDetailDecisions(base,details.map((r,i)=>
    i===0?{...r,metric_value:r.metric_value+1}:r)),/未對平/);
  assert.throws(()=>applyApprovedHistoricalDetailDecisions(base,details.map((r,i)=>
    i===0?{...r,group_baseline:99}:r)),/不合法/);
  assert.throws(()=>applyApprovedHistoricalDetailDecisions(base,details.map((r,i)=>
    i===0?{...r,source_reference:details[1].source_reference}:r)),/未對平/);
  assert.throws(()=>applyApprovedHistoricalDetailDecisions(
    base.map(x=>x.project_name==="花蓮教育處"&&x.metric_type==="root_class"?{...x,metric_value:x.metric_value+1}:x),details),/未對平/);
  assert.throws(()=>applyApprovedHistoricalDetailDecisions([
    ...base,{verified_group_key:"diagnostic_person_time|光華高工|112.6",metric_value:1272},
  ],details),/未對平/);
});

test("111.1 and 114.9 USR replace two full source-verified overview groups", () => {
  const periods=[
    {key:"diagnostic_person_time|USR|111.1",baseline:262,target:280,period:"111.1",
      from:"2022-01-01",to:"2022-01-31",year:110,file:"11101資料.xlsx",
      schools:[["富源國中",18,false],["萬榮國中",9,false],["平和國中",29,false]]},
    {key:"diagnostic_person_time|USR|114.9",baseline:29,target:154,period:"114.9",
      from:"2025-09-01",to:"2025-09-30",year:114,file:"11409資料.xlsx",
      schools:[["萬榮國中",4,false],["東里國中",9,true],["富里國中",16,false],
        ["海端國中",6,false],["望安國中",3,false]]},
  ];
  const baseline=[{metric_type:"root_class",metric_value:3}];
  const detail=[];
  for (const g of periods) {
    baseline.push({batch_id:"hist-big-overview-20261008-v1",metric_type:"diagnostic_person_time",
      project_name:"USR",date_start:g.from,time_granularity:"month",metric_value:g.baseline});
    for (const [school,n,mathOnly] of g.schools) {
      const items=mathOnly?["數學"]:["數學","文法","詞彙","聽力","閱讀"];
      for (const item of items) detail.push({
        verified_group_key:g.key,group_baseline:g.baseline,group_target:g.target,
        metric_type:"diagnostic_person_time",project_name:"USR",date_start:g.from,
        date_end:g.to,academic_year:g.year,school_name:school,school_level:"國中",
        grade:"7",subject:item==="數學"?"數學":"英文",diagnostic_item:item,metric_value:n,
        source_reference:g.file+"::"+(item==="數學"?"數學":"英語")+"::"+school+"::七年級",
      });
    }
  }
  const r=replaceApprovedUSR1111And1149Overviews(baseline,detail);
  assert.equal(detail.length,36);
  assert.equal(r.length,37);
  assert.equal(teachingMetricTotals(r).diagnostic_person_time,434);
  assert.equal(teachingMetricTotals(r).root_class,3);
  assert.equal(r.some(x=>x.batch_id==="hist-big-overview-20261008-v1"),false);
  assert.throws(()=>replaceApprovedUSR1111And1149Overviews(baseline,detail.slice(1)),/36列/);
  assert.throws(()=>replaceApprovedUSR1111And1149Overviews(
    baseline,detail.map((x,i)=>i===0?{...x,metric_value:x.metric_value+1}:x)),/不符/);
  assert.throws(()=>replaceApprovedUSR1111And1149Overviews(
    baseline,detail.map((x,i)=>i===0?{...x,source_reference:"unknown"}:x)),/不符/);
  assert.throws(()=>replaceApprovedUSR1111And1149Overviews(
    baseline,detail.map((x,i)=>i===0?{...x,diagnostic_item:"文法"}:x)),/不符/);
  assert.throws(()=>replaceApprovedUSR1111And1149Overviews(
    baseline.map(x=>x.metric_value===262?{...x,metric_value:263}:x),detail),/基準/);
  assert.throws(()=>replaceApprovedUSR1111And1149Overviews(
    [...baseline,{verified_group_key:"diagnostic_person_time|USR|114.9",metric_value:154}],detail),/基準/);
});

test("Yunlin 110.6 dedup 658 to 614 removes old six totals atomically", () => {
  const group = "diagnostic_person_time|雲林|110.6";
  const items = ["國文","文法","詞彙","聽力","閱讀","數學"];
  const old = items.map((item,index)=>({
    verified_group_key:group,metric_type:"diagnostic_person_time",
    project_name:"雲林",school_name:null,diagnostic_item:item,
    metric_value:index===0?43:123,
  }));
  const source = [
    ["水碓國小",[21,21,21,21,21,21]],
    ["永光國小",[12,48,48,48,48,49]],
    ["華南國小",[6,25,25,25,25,29]],
    ["樟湖國中小",[4,18,18,18,18,24]],
  ].flatMap(([school,counts]) => counts.map((value,i) => ({
    verified_group_key:group,group_baseline:658,group_target:614,
    metric_type:"diagnostic_person_time",project_name:"雲林",
    school_name:school,school_level:"國小",grade:null,academic_year:109,
    semester:"下學期",date_start:"2021-06-01",date_end:"2021-06-30",
    subject:i===0?"國文":i===5?"數學":"英文",
    diagnostic_item:items[i],metric_value:value,
    source_reference:"11006雲林.zip::"+items[i]+"::"+school,
  })));
  const oldUnrelated = {metric_type:"root_class",metric_value:5};
  const updated = replaceYunlin1106WithDedupedSource([...old,oldUnrelated],source);
  assert.equal(updated.length,25);
  assert.equal(teachingMetricTotals(updated).diagnostic_person_time,614);
  assert.equal(teachingMetricTotals(updated).root_class,5);
  assert.equal(updated.some(row=>!row.school_name&&row.metric_type==="diagnostic_person_time"),false);
  assert.throws(()=>replaceYunlin1106WithDedupedSource([...old,oldUnrelated],source.slice(1)),/基準|未對平/);
  assert.throws(()=>replaceYunlin1106WithDedupedSource([...old,oldUnrelated],source.map((r,i)=>i===0?{...r,metric_value:22}:r)),/無效/);
  assert.throws(()=>replaceYunlin1106WithDedupedSource([...old,oldUnrelated],source.map((r,i)=>i===0?{...r,group_baseline:657}:r)),/無效/);
  assert.throws(()=>replaceYunlin1106WithDedupedSource([...old,oldUnrelated],source.map((r,i)=>i===0?{...r,diagnostic_item:"數學"}:r)),/重複/);
  assert.throws(()=>replaceYunlin1106WithDedupedSource([...old,oldUnrelated],source.map((r,i)=>i===0?{...r,school_name:"其他國小"}:r)),/無效/);
  assert.throws(()=>replaceYunlin1106WithDedupedSource(updated,source),/基準|未對平/);
  assert.throws(()=>replaceYunlin1106WithDedupedSource([
    ...old,oldUnrelated,{
      fact_id:"extra",batch_id:"hist-big-overview-20261008-v1",
      project_name:"雲林",metric_type:"diagnostic_person_time",
      time_granularity:"month",date_start:"2021-06-01",metric_value:658,
    }],source),/基準|未對平/);
});

test("Yunlin 110.02 original session stays February without changing 587", () => {
  const corrected = {
    batch_id:"hist-big-overview-20261008-v1",
    project_name:"雲林",metric_type:"diagnostic_person_time",
    time_granularity:"month",date_start:"2021-02-01",date_end:"2021-02-28",
    metric_value:587,
  };
  assert.equal(historicalOverviewGroupKey(corrected),"diagnostic_person_time|雲林|110.2");
  assert.equal(mergeVerifiedTeachingDetail([corrected],[
    {verified_group_key:"diagnostic_person_time|雲林|110.2",metric_value:587}
  ]).length,1);
});

test("Hualien metering replaces seven old month groups with six official periods",()=>{
 const specs=[
  ["113.1-2(含112.11-12)",["112.12","113.1"],[255,273],[183,168,171]],
  ["113.5-6",["113.6"],[474],[147,145,157]],
  ["113.9-114.2",["113.9"],[470],[180,180,179]],
  ["114.5-6",["114.6"],[1048],[186,185,172]],
  ["114.9-115.4",["114.9"],[414],[113,113,113]],
  ["115.5-6",["115.6"],[486],[168,168,150]],
 ];
 const original=specs.flatMap(([period,old,values])=>old.map((p,i)=>({
  metric_type:"diagnostic_person_time",project_name:"花蓮教育處",
  verified_group_key:"diagnostic_person_time|花蓮教育處|"+p,metric_value:values[i]
 })));
 const metering=specs.flatMap(([period,old,values,items])=>items.map((value,i)=>({
  metric_type:"diagnostic_person_time",project_name:"花蓮教育處",
  verified_group_key:"diagnostic_person_time|花蓮教育處|計量|"+period,
  diagnostic_item:["詞彙","聽力","SRE閱讀平台"][i],metric_value:value,
  group_baseline:values.reduce((a,b)=>a+b,0),
  group_target:items.reduce((a,b)=>a+b,0),school_name:null,
  source_reference:"計量2026-10-08核定"
 })));
 const unaffected={metric_type:"root_person_time",project_name:"花蓮教育處",metric_value:115};
 const updated=replaceHualienMeteringPeriods([...original,unaffected],metering);
 assert.equal(updated.length,19);
 assert.equal(updated.reduce((s,r)=>s+(r.metric_type==="diagnostic_person_time"?r.metric_value:0),0),2878);
 assert.equal(updated.find(r=>r.metric_type==="root_person_time").metric_value,115);
 assert.throws(()=>replaceHualienMeteringPeriods([...original,unaffected],metering.slice(1)),/18列/);
 assert.throws(()=>replaceHualienMeteringPeriods([...original,unaffected],metering.map((x,i)=>i===0?{...x,metric_value:999}:x)),/不吻合/);
 assert.throws(()=>replaceHualienMeteringPeriods([...original.slice(1),unaffected],metering),/基準/);
});

test("official NMOE 114.9 reconciles all 54 school items and replaces old 2866 once", () => {
  const six = [
    ["國文",331,[4,15,8,146,12,52,10,3,81]],
    ["文法",535,[4,15,8,177,184,52,10,3,82]],
    ["詞彙",535,[4,15,8,177,184,52,10,3,82]],
    ["聽力",533,[4,15,8,176,184,51,10,3,82]],
    ["閱讀",534,[4,15,8,177,184,51,10,3,82]],
    ["數學",401,[4,15,8,177,12,52,3,49,81]],
  ];
  const group="diagnostic_person_time|國教署|114.9";
  const nationalOld={metric_type:"diagnostic_person_time",project_name:"國教署",
    batch_id:"hist-big-overview-20261008-v1",time_granularity:"month",
    date_start:"2025-09-01",metric_value:2866};
  const unaffected={metric_type:"root_person_time",project_name:"國教署",metric_value:77};
  const rows=six.flatMap(([item,total,counts])=>counts.map((metric_value,i)=>({
    metric_type:"diagnostic_person_time",project_name:"國教署",verified_group_key:group,
    group_baseline:2866,group_target:2869,diagnostic_item:item,
    school_name:(item==="數學"?["明里國小","育仁國小","長良國小","凌雲國中","富北國中","富岡國中","玉東國中","竹圍國中","觀音國中"]:
      ["明里國小","育仁國小","長良國小","凌雲國中","富北國中","富岡國中","東里國中","玉東國中","觀音國中"])[i],
    school_level:i<3?"國小":"國中",subject:["國文","數學"].includes(item)?item:"英文",
    metric_value,date_start:"2025-09-01",date_end:"2025-09-30",
    time_granularity:"month",academic_year:114,
    source_reference:"20260819臺師大績效指標-PASSION診斷平台服務人次.xlsx::108-114國教署!V"+(17+i),
  })));
  assert.equal(rows.length,54);
  assert.equal(rows.reduce((a,r)=>a+r.metric_value,0),2869);
  const result=replaceNational1149Official([nationalOld,unaffected],rows);
  assert.equal(result.length,55);
  assert.equal(result.filter(r=>r.metric_type==="diagnostic_person_time").reduce((a,r)=>a+r.metric_value,0),2869);
  assert.equal(result.find(r=>r.metric_type==="root_person_time"),unaffected);
  assert.throws(()=>replaceNational1149Official([{...nationalOld,metric_value:2869}],rows),/不吻合/);
  assert.throws(()=>replaceNational1149Official([nationalOld,unaffected],rows.slice(1)),/不吻合/);
  assert.throws(()=>replaceNational1149Official([nationalOld,unaffected],rows.map((r,i)=>
    i===0?{...r,metric_value:r.metric_value+1}:r)),/不吻合/);
  assert.throws(()=>replaceNational1149Official(result,rows),/不吻合/);
});

test("USR 112-1 subject-based people-time fixes isolated -2 discrepancy", () => {
  const old={metric_type:"root_person_time",project_name:"USR",
    batch_id:"hist-big-overview-20261008-v1",time_granularity:"semester",
    date_start:"2023-08-01",metric_value:104};
  const official=["英文","數學"].map((subject,i)=>({
    metric_type:"root_person_time",project_name:"USR",subject,
    verified_group_key:"root_person_time|USR|112-1",metric_value:51,
    group_baseline:104,group_target:102,academic_year:112,
    semester:"上學期",date_start:"2023-08-01",date_end:"2024-01-15",
    source_reference:"20260819臺師大績效指標-PASSION診斷平台服務人次.xlsx::USR!"+(i===0?"K":"L")+"22",
  }));
  const independent={metric_type:"diagnostic_person_time",project_name:"USR",metric_value:99};
  const updated=replaceUsrRoot1121([old,independent],official);
  assert.equal(updated.filter(x=>x.metric_type==="root_person_time").reduce((n,x)=>n+x.metric_value,0),102);
  assert.equal(updated.find(x=>x.metric_type==="diagnostic_person_time"),independent);
  assert.throws(()=>replaceUsrRoot1121([{...old,metric_value:102}],official),/不吻合/);
  assert.throws(()=>replaceUsrRoot1121([old],official.slice(1)),/不吻合/);
  assert.throws(()=>replaceUsrRoot1121([old],official.map((r,i)=>i===1?{...r,metric_value:52}:r)),/無效/);
});

test("approved NMOE 110.9 raw values replace only 3 cells and preserve Meilun 661",()=>{
 const key="diagnostic_person_time|國教署|110.9";
 const targets=[["東里國中","國文",9,8],["東里國中","數學",10,8],["卓楓國小","數學",8,7]];
 const named=targets.map(([school_name,diagnostic_item,metric_value])=>({
   verified_group_key:key,metric_type:"diagnostic_person_time",project_name:"國教署",
   school_name,diagnostic_item,metric_value,source_type:"historical_detail_verified",
   source_reference:"108-114國教署!J28",group_target:1311
 }));
 const rest=Array.from({length:63},(_,i)=>({
   verified_group_key:key,metric_type:"diagnostic_person_time",project_name:"國教署",
   school_name:"測試學校"+i,diagnostic_item:"文法",metric_value:i===62?44:20,
   source_type:"historical_detail_verified",group_target:1311
 }));
 const supplements=Array.from({length:6},(_,i)=>({
   verified_group_key:key,metric_type:"diagnostic_person_time",project_name:"國教署",
   school_name:"美崙國中",diagnostic_item:["國文","文法","詞彙","聽力","閱讀","數學"][i],
   metric_value:i===5?111:110,source_type:"historical_diagnostic_approved_supplement",
   group_target:1972
 }));
 const correction=targets.map(([school_name,diagnostic_item,old,n])=>({
   verified_group_key:key,project_name:"國教署",metric_type:"diagnostic_person_time",
   school_name,diagnostic_item,subject:diagnostic_item,metric_value:n,
   group_target:1968,group_baseline:1972,date_start:"2021-09-01",
   date_end:"2021-09-30",academic_year:110,grade:null,
   source_reference:"11009資料.xlsx::"+diagnostic_item+"|"+school_name,
   notes:"approved 2026-10-08",
 }));
 const unrelated={metric_type:"root_person_time",metric_value:777};
 const original=[...named,...rest,...supplements,unrelated];
 assert.equal(original.filter(x=>x.verified_group_key===key).reduce((s,x)=>s+x.metric_value,0),1972);
 const modified=applyNmoe1109RawPriority(original,correction);
 assert.equal(modified.filter(x=>x.verified_group_key===key).reduce((s,x)=>s+x.metric_value,0),1968);
 assert.equal(modified.filter(x=>x.source_type==="historical_diagnostic_approved_supplement")
  .reduce((s,x)=>s+x.metric_value,0),661);
 assert.equal(modified.find(x=>x.metric_type==="root_person_time"),unrelated);
 assert.equal(modified.filter(x=>x.verified_group_key===key&&
  x.source_type==="historical_diagnostic_original_priority_user_approved").length,3);
 assert.throws(()=>applyNmoe1109RawPriority(modified,correction),/基準/);
 assert.throws(()=>applyNmoe1109RawPriority(original,correction.slice(1)),/基準/);
 assert.throws(()=>applyNmoe1109RawPriority(original,correction.map((x,i)=>i===0?{...x,metric_value:9}:x)),/不一致/);
 assert.throws(()=>applyNmoe1109RawPriority(original.map(x=>
  x.school_name==="美崙國中"?{...x,metric_value:x.metric_value+1}:x),correction),/基準/);
});
