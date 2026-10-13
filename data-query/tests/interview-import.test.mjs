import test from "node:test";
import assert from "node:assert/strict";
import {canonicalizeInterviewImport,canonicalizeSources,aggregate,applyFilters,metricTotal} from "../js/data.js";

const HEADER=["批次ID","活動日期","學年度","計畫名稱","活動形式","服務對象",
 "科目","活動類別","其他活動名稱","訪談種類","受訪教師人次","受訪學生人次",
 "來源原始檔位置","備註","核定狀態"];
const school="富北國中";
function fixture(){
  const rows=[HEADER];
  for(let i=0;i<243;i++){
    const teacher=i<121,year=i<15?111:i<85?112:i<165?113:114;
    const date={111:"2023/05/30",112:"2024/05/15",113:"2025/05/22",114:"2026/05/28"}[year];
    const students=teacher?0:(i-121<92?2:1);
    rows.push(["PIV-20261013-"+String(i+1).padStart(4,"0"),date,year,
      "PASSION扎根團隊（原檔未列正式計畫全名）","待確認",school,"英文","訪談",
      teacher?"富北國中 英文 教師訪談":"富北國中 英文 學生訪談",
      teacher?"教師":"學生",teacher?1:0,students,
      "訪談紀錄彙整.xlsx::"+(teacher?"112教師訪談名單":"114學生訪談名單")+"!"+(i+2),
      "原始訪談名單已確認完成；沒有受訪者姓名或視訊連結","已核定（僅受訪者人次）"]);
  }
  return rows;
}
test("243 anonymous interview sessions count 335 interviewee person-times only",()=>{
  const parsed=canonicalizeInterviewImport(fixture());
  assert.equal(parsed.length,243);
  assert.equal(parsed.reduce((n,r)=>n+r.teacher_participant_count,0),121);
  assert.equal(parsed.reduce((n,r)=>n+r.interview_student_count,0),214);
  assert.equal(parsed.reduce((n,r)=>n+r.total_participant_count,0),335);
  assert.ok(parsed.every(r=>r.rooted_student_count===null));
});
test("interview batch merges once and is searchable as activity",()=>{
  const data=canonicalizeSources({interviews:fixture()});
  assert.equal(data.length,243);
  assert.equal(applyFilters(data,{filters:{category:["訪談"]}}).length,243);
  assert.equal(metricTotal(data,"活動場次"),243);
  assert.equal(metricTotal(data,"總參與人次"),335);
});
test("duplicate ID and missing completion are rejected (fail-closed)",()=>{
  const dup=fixture();dup[2][0]=dup[1][0];
  assert.throws(()=>canonicalizeInterviewImport(dup),/重複/);
  const pending=fixture();pending[2][14]="待確認";
  assert.throws(()=>canonicalizeInterviewImport(pending),/不合規/);
});
test("the reported ROC academic year must agree with the actual activity date",()=>{
  const source=fixture();source[1][1]="2023/08/01";
  assert.throws(()=>canonicalizeInterviewImport(source),/不合規/);
});
test("a missing person, source or wrong cohort size is not silently counted",()=>{
  const rows=fixture();rows[1][10]=0;
  assert.throws(()=>canonicalizeInterviewImport(rows),/不合規/);
  const rows2=fixture();rows2.pop();
  assert.throws(()=>canonicalizeInterviewImport(rows2),/未對平/);
  const rows3=fixture();rows3[1][12]="";
  assert.throws(()=>canonicalizeInterviewImport(rows3),/不合規/);
});
