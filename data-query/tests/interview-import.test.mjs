import test from "node:test";
import assert from "node:assert/strict";
import {canonicalizeInterviewImport,canonicalizeSources,applyFilters,metricTotal} from "../js/data.js";
const HEAD=["批次ID","活動日期","學年度","計畫名稱","活動形式","服務對象",
 "科目","活動類別","其他活動名稱","訪談種類","受訪教師人次","受訪學生人次",
 "受訪校方其他人員人次","來源原始檔位置","備註","核定狀態"];

function sourceRows() {
  const out=[HEAD];let id=1;
  for(const [year,teacherSessions,studentSessions,otherSessions,studentCounts] of [
    [110,8,8,0,[2,2,2,2,1,1,1,1]],
    [111,32,10,0,[5,5,5,5,5,5,5,4,4,4]],
    [112,33,38,2,[...Array(7).fill(2),...Array(31).fill(1)]],
    [113,46,34,0,[...Array(8).fill(2),...Array(26).fill(1)]],
    [114,43,31,0,[...Array(5).fill(3),...Array(26).fill(2)]]
  ]) {
    const types=[
      ...Array.from({length:teacherSessions},()=>[1,0,0,"教師"]),
      ...Array.from({length:studentSessions},(_,i)=>[0,studentCounts[i],0,"學生"]),
      ...Array.from({length:otherSessions},()=>[0,0,1,"校方人員"]),
    ];
    for(const [t,s,o,kind] of types) {
      const time=String(8+Math.floor(id/60)).padStart(2,"0")+":"+
        String(id%60).padStart(2,"0");
      out.push(["PIV-20261013-V2-"+String(id++).padStart(4,"0"),
        (year+1912)+"/05/01",year,"PASSION扎根團隊","待確認",
        "富北國中","語文","訪談","富北國中訪談（"+time+"）",kind,t,s,o,
        "訪談紀錄彙整.xlsx::"+year+"學生訪談名單!"+id,
        "匿名資料；不含訪談者姓名或視訊網址",
        "已核定（受訪者人次；時段已確認）"]);
    }
  }
  for(const [index,date,school,students,source] of [
    [286,"2023/05/30","玉東國中",15,"111學生訪談名單!2:17"],
    [287,"2023/06/06","卓楓國小",2,"111學生訪談名單!46:49"],
    [288,"2023/06/27","卓楓國小",2,"111學生訪談名單!50:51"],
  ]){
    out.push(["PIV-20261013-V3-"+String(index).padStart(4,"0"),
      date,111,"PASSION扎根團隊","待確認",school,"語文","訪談",
      school+"學生訪談","學生",0,students,0,
      "訪談紀錄彙整.xlsx::"+source,
      "匿名；僅按日期建立活動，不以缺訪談時間阻擋",
      "已核定（受訪者人次；僅日期）"]);
  }
  return out;
}
test("110-114 V3 dated sessions and 396 interviewee person-times",()=>{
  const list=canonicalizeInterviewImport(sourceRows());
  assert.equal(list.length,288);
  assert.equal(metricTotal(list,"活動場次"),288);
  assert.equal(metricTotal(list,"總參與人次"),396);
  assert.equal(metricTotal(list,"教師參與人次"),162);
  assert.equal(list.reduce((n,x)=>n+x.interview_student_count,0),232);
  assert.equal(list.reduce((n,x)=>n+x.interview_other_school_staff_count,0),2);
  assert.equal(applyFilters(list,{filters:{category:["訪談"]}}).length,288);
  for(const [yr,num] of [[110,16],[111,45],[112,73],[113,80],[114,74]])
    assert.equal(list.filter(x=>x.academic_year===yr).length,num);
});
test("canonicalizeSources loads V3 dated rows without original student IDs",()=>{
  const list=canonicalizeSources({interviews:sourceRows()});
  assert.equal(list.length,285);
  assert.ok(list.every(r=>r.rooted_student_count===null));
  assert.equal(list.filter(r=>r.activity_id.startsWith("PIV-20261013-V3-")).length,3);
});
test("rejects duplicates, wrong academic year, unpublished cohort counts",()=>{
  const x=sourceRows();x[2][0]=x[1][0];
  assert.throws(()=>canonicalizeInterviewImport(x),/不合規/);
  const y=sourceRows();y[1][2]=114;
  assert.throws(()=>canonicalizeInterviewImport(y),/不合規/);
  const z=sourceRows();z.pop();
  assert.throws(()=>canonicalizeInterviewImport(z),/未對平/);
});
test("rejects mistaken roles, incomplete imports, or leaked call URLs",()=>{
  const x=sourceRows();x[1][15]="待確認";
  assert.throws(()=>canonicalizeInterviewImport(x),/不合規/);
  const y=sourceRows();y[1][11]=1;
  assert.throws(()=>canonicalizeInterviewImport(y),/不合規/);
  const z=sourceRows();z[1][14]="https://meet.google.com/unsafe";
  assert.throws(()=>canonicalizeInterviewImport(z),/不合規/);
});
