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
    const message =
      response.status === 403
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
