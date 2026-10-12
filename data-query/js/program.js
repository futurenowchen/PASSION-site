import {canonicalizeProgramSheets,filterProgramDepartments,aggregateProgramDepartments,approvedOnlyTotals} from "./program-data.js";
import {GoogleSheetsError} from "./sheets.js";
import {clearSheetsSession,restoreSheetsSession,storeSheetsSession} from "./auth-session.js";

const config=window.PASSION_CONFIG||{};
const state={accessToken:null,tokenClient:null,data:null,filtered:[],page:1};
const $=id=>document.getElementById(id);
const fmt=n=>n===null||n===undefined?"—":Number(n).toLocaleString("zh-TW");
function status(msg,kind="neutral"){$("statusBox").textContent=msg;$("statusBox").dataset.kind=kind;}
function busy(v){document.body.classList.toggle("busy",v);$("authorizeBtn").disabled=v||!config.GOOGLE_CLIENT_ID;$("reloadBtn").disabled=v||!state.accessToken;}
function signedIn(){$("signoutBtn").hidden=false;$("authorizeBtn").textContent="重新授權";}
function signedOut(){$("programWorkspace").hidden=true;$("signoutBtn").hidden=true;$("reloadBtn").disabled=true;$("authorizeBtn").textContent="使用 Google 帳號讀取資料";}
function quoteSheet(name){return "'"+String(name).replaceAll("'","''")+"'";}
async function fetchData(accessToken){
  // Privacy boundary: request only control/aggregated data, never PROGRAM_ENROLLMENTS.
  const selections=[
    [config.PROGRAM_KPI_SHEET,"A1:D3"],
    [config.PROGRAM_YEARLY_SHEET,"A1:C15"],
    [config.PROGRAM_DISTRIBUTION_SHEET,"A1:F150"],
    [config.PROGRAM_SUMMER_SHEET,"A1:L30"],
    [config.PROGRAM_REMOTE_SHEET,"A1:M40"]
  ];
  const p=new URLSearchParams();
  for(const [name,rect] of selections)p.append("ranges",quoteSheet(name)+"!"+rect);
  p.set("majorDimension","ROWS");p.set("valueRenderOption","FORMATTED_VALUE");
  p.set("fields","valueRanges(range,values)");
  const url="https://sheets.googleapis.com/v4/spreadsheets/"+
    encodeURIComponent(config.PROGRAM_SPREADSHEET_ID)+"/values:batchGet?"+p;
  const res=await fetch(url,{headers:{Authorization:"Bearer "+accessToken,Accept:"application/json"}});
  if(!res.ok){
    let details="";
    try{details=(await res.json())?.error?.message||"";}catch{}
    const msg=res.status===401?"Google 授權已失效，請重新登入。":
      res.status===403?"目前登入帳號沒有學程資料中心的檢視權限，請先取得分享權限。":
      res.status===404?"找不到學程資料中心，或登入帳號無權讀取。":
      "學程資料讀取失敗（HTTP "+res.status+"）。";
    throw new GoogleSheetsError(msg,res.status,details);
  }
  const sheets=(await res.json()).valueRanges||[];
  if(sheets.length!==5)throw new Error("學程資料分頁回傳不完整。");
  return canonicalizeProgramSheets({
    control:sheets[0]?.values,yearly:sheets[1]?.values,distribution:sheets[2]?.values,
    summer:sheets[3]?.values,remote:sheets[4]?.values
  });
}
function clearAuthorization(){clearSheetsSession();state.accessToken=null;state.data=null;signedOut();}
async function loadData(){
  if(!state.accessToken)return;
  busy(true);status("正在從學程資料中心讀取年度及校系彙總…");
  try{
    state.data=await fetchData(state.accessToken);
    fillSelectors();state.page=1;renderAll();
    $("programWorkspace").hidden=false;
    status("學程資料已載入：對外來源校系 "+fmt(state.data.official.admitted)+" 人，原始錄取 "+
      fmt(state.data.raw.admitted)+" 筆。服務成果另依核定狀態標示。","success");
  }catch(error){
    $("programWorkspace").hidden=true;
    if(error instanceof GoogleSheetsError&&error.status===401)clearAuthorization();
    status(error.message||"學程資料載入失敗。","error");
  }finally{busy(false);}
}
async function waitForGoogle(){
  const started=Date.now();
  return new Promise((resolve,reject)=>{
    const timer=setInterval(()=>{
      if(window.google?.accounts?.oauth2){clearInterval(timer);resolve();}
      else if(Date.now()-started>12000){clearInterval(timer);reject(new Error("Google 帳號登入元件載入逾時。"));}
    },80);
  });
}
function authInit(){
  state.tokenClient=google.accounts.oauth2.initTokenClient({
    client_id:config.GOOGLE_CLIENT_ID,
    scope:"https://www.googleapis.com/auth/spreadsheets.readonly",
    hosted_domain:config.GOOGLE_HOSTED_DOMAIN||undefined,
    callback:async response=>{
      if(response?.error){status("Google 授權失敗："+response.error,"error");busy(false);return;}
      if(!response?.access_token||!google.accounts.oauth2.hasGrantedAllScopes(
        response,"https://www.googleapis.com/auth/spreadsheets.readonly")){
        status("未取得 Google Sheets 唯讀權限。","error");busy(false);return;
      }
      state.accessToken=response.access_token;storeSheetsSession(response);signedIn();await loadData();
    }
  });
}
function authorize(){
  if(!state.tokenClient)return;
  busy(true);status("正在開啟 Google 帳號授權…");
  state.tokenClient.requestAccessToken({prompt:state.accessToken?"":"select_account"});
}
function signOut(){
  if(state.accessToken)google.accounts.oauth2.revoke(state.accessToken,()=>{});
  clearAuthorization();status("已解除本頁 Google 授權。");
}
function distinct(rows,key){return [...new Set(rows.map(r=>r[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"zh-Hant"));}
function options(id,items,prev){
  const target=$(id);target.replaceChildren();
  for(const [value,label] of items){const o=document.createElement("option");o.value=value;o.textContent=label;target.append(o);}
  if(items.some(([x])=>x===prev))target.value=prev;
}
function fillCollege(){
  const school=$("programSchool").value,old=$("programCollege").value;
  const subset=state.data.departments.filter(x=>!school||x.school===school);
  options("programCollege",[["","所有學院"],...distinct(subset,"college").map(x=>[x,x])],old);
}
function fillSelectors(){
  const current=$("programSchool").value;
  options("programSchool",[["","所有學校"],...distinct(state.data.departments,"school").map(x=>[x,x])],current);
  fillCollege();
  const oldYear=$("programServiceYear").value;
  const years=[...new Set([...state.data.summers,...state.data.remotes].map(r=>r.year)
    .filter(Number.isInteger))].sort((a,b)=>a-b);
  options("programServiceYear",[["","全部年度"],...years.map(x=>[String(x),String(x)])],oldYear);
}
function tableClear(id){$(id).tBodies[0].replaceChildren();}
function tableRow(id,values,emptyText="沒有符合條件的資料"){
  const t=$(id),tr=document.createElement("tr");
  const items=values?.length?values:[emptyText];
  if(!values?.length)tr.className="empty-row";
  for(const x of items){const td=document.createElement("td");td.textContent=x??"—";
    if(!values?.length)td.colSpan=t.tHead.rows[0].cells.length;
    tr.append(td);}
  t.tBodies[0].append(tr);
}
function renderDistribution(){
  const school=$("programSchool").value,college=$("programCollege").value;
  state.filtered=filterProgramDepartments(state.data.departments,{
    school,college,keyword:$("programKeyword").value
  });
  const total=state.filtered.reduce((n,r)=>n+r.admitted,0);
  $("programFilterInfo").textContent="符合 "+state.filtered.length+" 個校系組合，共 "+fmt(total)+" 人（同事對外統計口徑）。";
  const group=$("programGroup").value;
  $("programGroupTitle").textContent=group==="school"?"依學校彙總":group==="college"?"依學院彙總":"依科系彙總";
  tableClear("programSummaryTable");
  const aggregates=aggregateProgramDepartments(state.filtered,group);
  for(const r of aggregates)tableRow("programSummaryTable",[r.group,fmt(r.admitted)]);
  if(!aggregates.length)tableRow("programSummaryTable",[]);
  const pageSize=Math.max(1,Number(config.PAGE_SIZE||50));
  const pages=Math.max(1,Math.ceil(state.filtered.length/pageSize));
  state.page=Math.max(1,Math.min(state.page,pages));
  tableClear("programDepartmentTable");
  for(const r of state.filtered.slice((state.page-1)*pageSize,state.page*pageSize))
    tableRow("programDepartmentTable",[r.school,r.college,r.department,fmt(r.admitted)]);
  if(!state.filtered.length)tableRow("programDepartmentTable",[]);
  $("programPageInfo").textContent="第 "+state.page+" / "+pages+" 頁";
  $("programPrev").disabled=state.page<=1;$("programNext").disabled=state.page>=pages;
}
function renderYears(){
  tableClear("programYearlyTable");
  for(const r of state.data.years)tableRow("programYearlyTable",[r.year,fmt(r.admissions),fmt(r.certified)]);
}
function renderService(){
  const year=$("programServiceYear").value;
  const selected=r=>(!year||String(r.year)===year)&&r.status!=="未提供"&&
    (r.courseStudents!==null||r.servedStudents!==null||r.teachingHours!==null);
  const summers=state.data.summers.filter(selected),remotes=state.data.remotes.filter(selected);
  const cols=r=>[fmt(r.courseStudents),"—",fmt(r.servedStudents),fmt(r.teachingHours),r.status||"待確認"];
  tableClear("programSummerTable");
  for(const r of summers)tableRow("programSummerTable",[r.year,...cols(r)]);
  if(!summers.length)tableRow("programSummerTable",[],"目前沒有可顯示的暑期服務資料。");
  tableClear("programRemoteTable");
  for(const r of remotes)tableRow("programRemoteTable",[r.academicYear+"-"+r.semester,...cols(r)]);
  if(!remotes.length)tableRow("programRemoteTable",[],"目前沒有可顯示的遠距教學資料。");
  const a=approvedOnlyTotals(summers,["servedStudents"]),b=approvedOnlyTotals(remotes,["servedStudents"]);
  $("programServiceInfo").textContent="暫載：暑期 "+summers.length+" 年、遠距 "+
    remotes.length+" 學期；其中已核定暑期 "+a.periods+" 年、遠距 "+b.periods+" 學期。";
}
function renderAll(){
  if(!state.data)return;
  $("programOfficialAdmitted").textContent=fmt(state.data.official.admitted);
  $("programOfficialCertified").textContent=fmt(state.data.official.certified);
  $("programRawAdmitted").textContent=fmt(state.data.raw.admitted);
  $("programRawCertified").textContent=fmt(state.data.raw.certified);
  renderDistribution();renderYears();renderService();
}
function csvCell(x){
  const original=String(x??"");
  const safe=/^[=+\-@\t\r]/.test(original)?"'"+original:original;
  return /[",\r\n]/.test(safe)?'"'+safe.replaceAll('"','""')+'"':safe;
}
function downloadCsv(){
  const rows=[["來源學校","學院","系所","錄取人數"],...state.filtered.map(r=>[r.school,r.college,r.department,r.admitted])];
  const csv="\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="PASSION_program_departments_filtered.csv";a.click();
  URL.revokeObjectURL(url);
}
function bind(){
  $("authorizeBtn").addEventListener("click",authorize);
  $("reloadBtn").addEventListener("click",loadData);
  $("signoutBtn").addEventListener("click",signOut);
  $("programKeyword").addEventListener("input",()=>{state.page=1;renderDistribution();});
  $("programSchool").addEventListener("change",()=>{fillCollege();state.page=1;renderDistribution();});
  $("programCollege").addEventListener("change",()=>{state.page=1;renderDistribution();});
  $("programGroup").addEventListener("change",renderDistribution);
  $("programServiceYear").addEventListener("change",renderService);
  $("programPrev").addEventListener("click",()=>{state.page--;renderDistribution();});
  $("programNext").addEventListener("click",()=>{state.page++;renderDistribution();});
  $("programDownloadBtn").addEventListener("click",downloadCsv);
  $("programClearBtn").addEventListener("click",()=>{
    $("programKeyword").value="";$("programSchool").value="";fillCollege();
    $("programCollege").value="";$("programGroup").value="school";state.page=1;renderDistribution();
  });
}
async function boot(){
  bind();
  const required=["PROGRAM_SPREADSHEET_ID","PROGRAM_KPI_SHEET","PROGRAM_YEARLY_SHEET",
    "PROGRAM_DISTRIBUTION_SHEET","PROGRAM_SUMMER_SHEET","PROGRAM_REMOTE_SHEET"];
  if(!config.GOOGLE_CLIENT_ID||required.some(k=>!config[k])){
    status("尚未設定 Google OAuth 或學程資料庫。","error");$("authorizeBtn").disabled=true;return;
  }
  try{
    await waitForGoogle();authInit();
    const restored=restoreSheetsSession();
    if(restored){state.accessToken=restored;signedIn();await loadData();}
    else{$("authorizeBtn").disabled=false;status("請使用有學程資料權限的 PASSION Google 帳號授權。");}
  }catch(error){status(error.message||"登入初始化失敗。","error");busy(false);}
}
boot();
