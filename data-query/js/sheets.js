export class GoogleSheetsError extends Error {
  constructor(message, status = 0, details = "") {
    super(message);
    this.name = "GoogleSheetsError";
    this.status = status;
    this.details = details;
  }
}

function quotedSheet(name) {
  return "'" + String(name).replaceAll("'", "''") + "'";
}

export async function fetchPassionSheets({
  accessToken,
  spreadsheetId,
  legacySheet,
  currentSheet,
}) {
  const params = new URLSearchParams();
  params.append("ranges", `${quotedSheet(legacySheet)}!A:U`);
  params.append("ranges", `${quotedSheet(currentSheet)}!A:BA`);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "FORMATTED_VALUE");
  params.set("fields", "valueRanges(range,values)");

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      const body = await response.json();
      details = body?.error?.message || JSON.stringify(body);
    } catch {
      details = await response.text();
    }
    const detailsLower = details.toLowerCase();
    const apiDisabled =
      detailsLower.includes("has not been used in project") ||
      detailsLower.includes("it is disabled") ||
      detailsLower.includes("api has not been used");

    const message =
      response.status === 403 && apiDisabled
        ? "Google Sheets API 尚未在這個 Google Cloud 專案啟用，請先啟用後再重試。"
        : response.status === 403
          ? "這個 Google 帳號沒有 Mirror 試算表的讀取權限，請確認該帳號已被分享為檢視者。"
          : response.status === 401
            ? "Google 授權已失效，請重新登入。"
            : `Google Sheets API 讀取失敗（HTTP ${response.status}）。`;
    throw new GoogleSheetsError(message, response.status, details);
  }

  const body = await response.json();
  const ranges = body.valueRanges || [];
  return {
    legacy: ranges[0]?.values || [],
    current: ranges[1]?.values || [],
  };
}


export async function fetchTeachingSheets({
  accessToken,
  spreadsheetId,
  factsSheet = "TEACHING_FACTS",
  schoolsSheet = "DIM_SCHOOLS",
}) {
  const params = new URLSearchParams();
  params.append("ranges", `${quotedSheet(factsSheet)}!A:Z`);
  params.append("ranges", `${quotedSheet(schoolsSheet)}!A:K`);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "FORMATTED_VALUE");
  params.set("fields", "valueRanges(range,values)");

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      const body = await response.json();
      details = body?.error?.message || JSON.stringify(body);
    } catch {
      details = await response.text();
    }
    const detailsLower = details.toLowerCase();
    const apiDisabled =
      detailsLower.includes("has not been used in project") ||
      detailsLower.includes("it is disabled") ||
      detailsLower.includes("api has not been used");

    const message =
      response.status === 403 && apiDisabled
        ? "Google Sheets API 尚未在這個 Google Cloud 專案啟用，請先啟用後再重試。"
        : response.status === 403
          ? "這個 Google 帳號沒有 Teaching Data Hub 的讀取權限，請確認已分享給目前登入帳號。"
          : response.status === 401
            ? "Google 授權已失效，請重新登入。"
            : `Google Sheets API 讀取失敗（HTTP ${response.status}）。`;
    throw new GoogleSheetsError(message, response.status, details);
  }

  const body = await response.json();
  const ranges = body.valueRanges || [];
  return {
    facts: ranges[0]?.values || [],
    schools: ranges[1]?.values || [],
  };
}
