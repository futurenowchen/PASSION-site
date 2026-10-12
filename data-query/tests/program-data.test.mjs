import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
  canonicalizeProgramSheets,filterProgramDepartments,aggregateProgramDepartments,approvedOnlyTotals
} from "../js/program-data.js";

const source={
  control:[
    ["指標代碼","沿用對外數字"],
    ["admitted_people_total","498"],
    ["certified_people_total","149"]
  ],
  distribution:[
    ["來源學校","學院","系所","錄取人數"],
    ["臺師大","教育學院","特殊教育學系","247"],
    ["臺師大","文學院","國文學系","212"],
    ["臺大","文學院","外國語文學系","36"],
    ["臺科大","設計學院","設計系","3"]
  ],
  yearly:[
    ["錄取西元年（按實際錄取日期）","原始錄取紀錄數","該年錄取中已認證筆數"],
    ["2018","59","21"],["2019","78","29"],["2020","58","21"],
    ["2021","71","18"],["2022","58","18"],["2023","42","18"],
    ["2024","50","10"],["2025","60","9"],["2026","24","0"],
    ["合計","500","144"]
  ],
  summer:[
    ["服務西元年","月份／期間","參與大學生人數","偏鄉學生人次","教學課時","核定狀態"],
    ["2018","107-3 暑期","38","213","","待確認"],
    ["2025","114-3 暑期","","228","","待確認"]
  ],
  remote:[
    ["學年度（民國）","學期","服務西元年","參與大學生人數","偏鄉學生人次","教學課時","核定狀態"],
    ["114","2","2026","24","66","","待確認"]
  ]
};

test("keeps official 498/149 separate from 500/144 original records",()=>{
  const result=canonicalizeProgramSheets(source);
  assert.deepEqual(result.official,{admitted:498,certified:149});
  assert.deepEqual(result.raw,{admitted:500,certified:144});
  assert.equal(result.departments.reduce((n,r)=>n+r.admitted,0),498);
});
test("search and school/college filters are case-independent AND filters",()=>{
  const data=canonicalizeProgramSheets(source);
  const x=filterProgramDepartments(data.departments,{
    school:"臺師大",college:"文學院",keyword:"國文"
  });
  assert.equal(x.length,1);
  assert.equal(x[0].admitted,212);
  assert.deepEqual(aggregateProgramDepartments(data.departments,"school")
    .map(x=>[x.group,x.admitted]),[["臺師大",459],["臺大",36],["臺科大",3]]);
  assert.deepEqual(aggregateProgramDepartments(x,"department"),[{
    group:"臺師大｜國文學系",admitted:212
  }]);
});
test("incomplete service fields are missing, never silently 0 or confirmed",()=>{
  const data=canonicalizeProgramSheets(source);
  assert.equal(data.summers[1].courseStudents,null);
  assert.equal(data.summers[0].teachingHours,null);
  assert.equal(data.remotes[0].servedStudents,66);
  assert.equal(approvedOnlyTotals(data.summers,["servedStudents"]).periods,0);
  assert.equal(approvedOnlyTotals(data.summers,["servedStudents"]).totals.servedStudents,null);
});
test("only explicitly approved periods contribute to approved totals",()=>{
  const rows=[{status:"待確認",servedStudents:200},
    {status:"已核定",servedStudents:40,teachingHours:null},
    {status:"已核定",servedStudents:20,teachingHours:12}];
  assert.deepEqual(approvedOnlyTotals(rows,["servedStudents","teachingHours"]),
    {periods:2,totals:{servedStudents:60,teachingHours:12}});
});
test("rejects partially imported/misleading official college totals",()=>{
  assert.throws(()=>canonicalizeProgramSheets({...source,
    distribution:source.distribution.slice(0,-1)
  }),/不相符/);
});
test("site navigations and Program Hub page read only aggregates",async()=>{
  const html=await readFile(new URL("../program.html",import.meta.url),"utf8");
  const activities=await readFile(new URL("../index.html",import.meta.url),"utf8");
  const teaching=await readFile(new URL("../teaching.html",import.meta.url),"utf8");
  const code=await readFile(new URL("../js/program.js",import.meta.url),"utf8");
  const cfg=await readFile(new URL("../config.js",import.meta.url),"utf8");
  assert.match(html,/program\.js\?v=/);
  for(const page of [activities,teaching])assert.match(page,/href="\.\/program\.html"/);
  assert.match(code,/values:batchGet/);
  assert.doesNotMatch(code,/quoteSheet\("PROGRAM_ENROLLMENTS"/);
  assert.match(cfg,/PROGRAM_SPREADSHEET_ID/);
});
