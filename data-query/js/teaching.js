const $ = (id) => document.getElementById(id);

const groupLabels = Object.freeze({
  school: "學校",
  time: "時間",
  project: "計畫",
  subject: "科目",
  region: "地區",
});

function clearTeachingFilters() {
  $("teachingKeyword").value = "";
  $("teachingStartDate").value = "";
  $("teachingEndDate").value = "";
  for (const details of document.querySelectorAll(".filter-panel")) details.open = false;
}

function updateGroupTitle() {
  const value = $("teachingGroupSelect").value;
  $("teachingSummaryTitle").textContent = `教學成果｜依${groupLabels[value] || "學校"}`;
}

$("clearTeachingFiltersBtn").addEventListener("click", clearTeachingFilters);
$("teachingGroupSelect").addEventListener("change", updateGroupTitle);
