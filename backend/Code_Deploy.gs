/**
 * 🚙 스마트 차량 점검 리포트 시스템 - 통합 배포 버전 (v3.1)
 * 
 * [v3.1 업데이트 - Few-Shot 학습 기능]
 * 1. 이제 리포트를 생성할 때 텍스트 전문(진단내용 등)이 시트에 함께 기록됩니다.
 * 2. 저장된 과거 데이터를 AI 프로젝트의 학습용 샘플로 활용하여 분석 정교함이 올라갑니다.
 * 3. 시트 [리포트내역] 탭의 컬럼을 최소 11개까지 미리 제목을 적어두세요.
 */

// --- 설정 관련 함수 ---

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🛠️ 리포트 시스템 설정')
    .addItem('⚙️ 시스템 ID 설정', 'showSettingsUI')
    .addSeparator()
    .addItem('📖 사용 방법 및 도움말', 'showHelp')
    .addToUi();
}

/**
 * 사용자로부터 ID 정보를 입력받는 설정창
 */
function showSettingsUI() {
  const props = PropertiesService.getScriptProperties();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.5; }
        .item { margin-bottom: 15px; }
        label { display: block; font-weight: bold; font-size: 12px; color: #555; }
        input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
        .btn { background: #4285f4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; }
        .btn:hover { background: #357ae8; }
        .desc { font-size: 11px; color: #888; margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <h3>⚙️ 시스템 구성 설정</h3>
      <p style="font-size: 12px; color: #d93025;">* 본인의 구글 문서/폴더 주소에서 ID를 복사해 넣으세요.</p>
      
      <div class="item">
        <label>1. 리포트 템플릿 ID (차량점검용)</label>
        <div class="desc">B시트 기반 차량 점검 리포트 구글 문서 ID</div>
        <input type="text" id="reportTemplate" value="${props.getProperty('ID_REPORT_TEMPLATE') || ''}">
      </div>

      <div class="item">
        <label>2. 동의서 템플릿 ID (고객동의용)</label>
        <div class="desc">A시트 기반 개인정보 동의서 구글 문서 ID (선택사항)</div>
        <input type="text" id="agreeTemplate" value="${props.getProperty('ID_AGREE_TEMPLATE') || ''}">
      </div>

      <div class="item">
        <label>3. PDF 저장 폴더 ID</label>
        <div class="desc">생성된 PDF 파일이 저장될 구글 드라이브 폴더 ID</div>
        <input type="text" id="folderId" value="${props.getProperty('ID_SAVE_FOLDER') || ''}">
      </div>

      <div class="item">
        <label>4. 구글 폼 주소 (고객 응답용)</label>
        <div class="desc">고객에게 배포할 구글 폼의 '보내기' 링크 (URL 파라미터 연동용)</div>
        <input type="text" id="googleFormUrl" value="${props.getProperty('URL_GOOGLE_FORM') || ''}">
      </div>

      <button class="btn" onclick="save()">설정 저장하기</button>

      <script>
        function save() {
          const data = {
            reportTemplate: document.getElementById('reportTemplate').value.trim(),
            agreeTemplate: document.getElementById('agreeTemplate').value.trim(),
            folderId: document.getElementById('folderId').value.trim(),
            googleFormUrl: document.getElementById('googleFormUrl').value.trim(),
          };
          google.script.run.withSuccessHandler(() => {
            alert('설정이 저장되었습니다.');
            google.script.host.close();
          }).saveSettings(data);
        }
      </script>
    </body>
    </html>
  `;
  const output = HtmlService.createHtmlOutput(html).setWidth(400).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(output, '시스템 설정');
}

function saveSettings(data) {
  PropertiesService.getScriptProperties().setProperties({
    'ID_REPORT_TEMPLATE': data.reportTemplate,
    'ID_AGREE_TEMPLATE': data.agreeTemplate,
    'ID_SAVE_FOLDER': data.folderId,
    'URL_GOOGLE_FORM': data.googleFormUrl
  });
}

function showHelp() {
  const msg = "📖 사용 방법 안내 (v3.1 학습형)\n\n" +
    "1. [고객데이터] 탭: H(연락처), I(고객명), J(차량번호) 순서\n" +
    "2. [리포트내역] 탭 컬럼 순서:\n" +
    "   (점검일시, 고객명, 연락처, 차종, 연료, 차량번호, 현재주행, 직전주행, PDF링크, 점검내용, 특이사항)\n" +
    "   * 10, 11번째 컬럼에 AI 텍스트가 저장되어 다음 분석 시 참고합니다.\n" +
    "3. 독립 배포: 이 코드를 복사해 새 시트에 연동하면 나만의 정비 노하우 DB가 구축됩니다.";
  SpreadsheetApp.getUi().alert('도움말', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

// --- Web App 메인 로직 (doGet, doPost) ---

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'search') return createJsonResponse(searchCustomer(e.parameter.phone));
    if (action === 'list') return createJsonResponse(listReports());
    if (action === 'settings') return createJsonResponse(getSettings());
    if (action === 'getReferences') return createJsonResponse(getReferences());
    return createJsonResponse({ message: "Ready", version: "3.2" });
  } catch (err) {
    return createJsonResponse({ message: err.toString() }, "error");
  }
}

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const result = createVehicleReportPdf(requestData);
    logToSheet(requestData, result);
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ message: error.toString() }, "error");
  }
}

function createJsonResponse(data, status = "success") {
  return ContentService.createTextOutput(JSON.stringify({ status, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 시스템 설정 정보 반환
 */
function getSettings() {
  const props = PropertiesService.getScriptProperties();
  return {
    googleFormUrl: props.getProperty('URL_GOOGLE_FORM') || "",
    version: "3.1"
  };
}

/**
 * Reference 시트 데이터 반환 (기준 데이터)
 * A-F: 차량정보, G-AD: 점검항목(12개 x 2개), AE: 점검내용, AF: 특이사항
 */
function getReferences() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Reference");
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 3) return []; // 1~3행은 헤더
  
  const results = [];
  for (let i = 3; i < values.length; i++) {
    const row = values[i];
    if (!row[0] && !row[5]) continue; // 차종과 증상이 모두 없으면 스킵

    const checklist = [];
    for (let j = 0; j < 12; j++) {
      checklist.push({
        status: String(row[6 + (j * 2)] || "good"),
        memo: String(row[7 + (j * 2)] || "")
      });
    }

    results.push({
      vehicleModel: String(row[0] || ""),
      fuelType: String(row[1] || ""),
      year: String(row[2] || ""),
      currentMileage: String(row[3] || ""),
      lastMileage: String(row[4] || ""),
      symptom: String(row[5] || ""),
      checklist: checklist,
      mainContent: String(row[30] || ""), // AE (31번째, index 30)
      specialNotes: String(row[31] || "")  // AF (32번째, index 31)
    });
  }
  return results;
}

// --- 핵심 비즈니스 로직 ---

/**
 * 고객데이터(Sheet A) 검색
 */
function searchCustomer(phone) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("고객데이터") || ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  
  const searchClean = phone.replace(/[^0-9]/g, '');
  const searchTail = searchClean.length >= 10 ? searchClean.slice(-10) : searchClean;
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowPhone = String(row[7] || "").replace(/[^0-9]/g, '');
    const rowTail = rowPhone.length >= 10 ? rowPhone.slice(-10) : rowPhone;
    
    if (rowTail !== "" && rowTail === searchTail) {
      return {
        recipientName: String(row[8] || ""),
        recipientPhone: String(row[7] || ""),
        vehicleNumber: String(row[9] || ""),
        vehicleModel: "", fuelType: ""
      };
    }
  }
  return null;
}

/**
 * 리포트내역(Sheet B) 불러오기
 */
function listReports() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("리포트내역") || ss.getSheets()[1];
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const results = [];
  for (let i = values.length - 1; i >= 1 && results.length < 100; i--) {
    const row = values[i];
    let phone = String(row[2] || "").replace(/[^0-9]/g, '');
    if (phone.length === 10 && phone.startsWith('1')) phone = '0' + phone;

    results.push({
      recipientName: String(row[1] || "-"),
      vehicleNumber: String(row[5] || "-"),
      recipientPhone: phone || "-",
      vehicleModel: String(row[3] || ""),
      pdfUrl: (row[8] && String(row[8]).startsWith('http')) ? row[8] : "",
      mainContent: String(row[9] || ""),
      specialNotes: String(row[10] || "")
    });
  }
  return results;
}

/**
 * 차량 점검 리포트 PDF 생성
 */
function createVehicleReportPdf(data) {
  const props = PropertiesService.getScriptProperties();
  const templateId = props.getProperty('ID_REPORT_TEMPLATE');
  const folderId = props.getProperty('ID_SAVE_FOLDER');
  
  if (!templateId || !folderId) throw new Error("시스템 설정(ID 입력)이 완료되지 않았습니다.");

  const templateFile = DriveApp.getFileById(templateId);
  const destFolder = DriveApp.getFolderById(folderId);
  const fileName = `[리포트] ${data.recipientName}_${Utilities.formatDate(new Date(), "GMT+9", "yyyyMMdd")}`;
  
  const copyFile = templateFile.makeCopy(fileName, destFolder);
  const copyDoc = DocumentApp.openById(copyFile.getId());
  const body = copyDoc.getBody();
  
  const reps = {
    "{{고객명}}": data.recipientName,
    "{{연락처}}": data.recipientPhone,
    "{{내용}}": data.mainContent,
    "{{특이사항}}": data.specialNotes,
    "{{차종}}": data.year ? `${data.vehicleModel} (${data.year}년식)` : data.vehicleModel,
    "{{연료형식}}": data.fuelType,
    "{{주행거리}}": data.currentMileage,
    "{{현재주행거리}}": data.currentMileage,
    "{{직전주행거리}}": data.lastMileage,
    "{{증상}}": data.symptom,
    "{{차량번호}}": data.vehicleNumber
  };

  for (let key in reps) { body.replaceText(key, reps[key] || ""); }
  
  const today = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd");
  body.replaceText("{{날짜}}", today);
  body.replaceText("{{점검일자}}", today);

  if (data.checklist && Array.isArray(data.checklist)) {
    data.checklist.forEach((item, index) => {
      const num = index + 1;
      body.replaceText(`{{${num}양}}`, item.status === 'good' ? "V" : "");
      body.replaceText(`{{${num}보}}`, item.status === 'normal' ? "V" : "");
      body.replaceText(`{{${num}정}}`, item.status === 'bad' ? "V" : "");
      body.replaceText(`{{메모${num}}}`, item.memo || "");
    });
  }
  
  copyDoc.saveAndClose();
  const pdfBlob = copyFile.getAs(MimeType.PDF);
  const pdfFile = destFolder.createFile(pdfBlob);
  pdfFile.setName(fileName + ".pdf");
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  copyFile.setTrashed(true);
  
  return { pdfUrl: pdfFile.getUrl() };
}

/**
 * 리포트내역 시트 및 Reference 시트에 로그 기록
 */
function logToSheet(data, result) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 기존 '리포트내역' 시트 기록 (기존 유지)
  let historySheet = ss.getSheetByName("리포트내역") || ss.getSheets()[1] || ss.getSheets()[0];
  const historyRow = [
    new Date(),
    data.recipientName || "-",
    data.recipientPhone || "-",
    data.vehicleModel || "-",
    data.fuelType || "-",
    data.vehicleNumber || "-",
    data.currentMileage || "-",
    data.lastMileage || "-",
    result.pdfUrl || "",
    data.mainContent || "", 
    data.specialNotes || ""
  ];
  historySheet.appendRow(historyRow);
  historySheet.getRange(historySheet.getLastRow(), 1, 1, historyRow.length)
    .setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

  // 2. 'Reference' 시트에 상세 데이터 기록 (추천 시스템용)
  let refSheet = ss.getSheetByName("Reference");
  if (refSheet) {
    const refRow = [
      data.vehicleModel || "",
      data.fuelType || "",
      data.year || "",
      data.currentMileage || "",
      data.lastMileage || "",
      data.symptom || "",
    ];
    
    // G-AD: 점검항목 (12개 x 2열 = 24열)
    if (data.checklist && Array.isArray(data.checklist)) {
      data.checklist.forEach(item => {
        const statusMap = { 'good': '양호', 'normal': '보통', 'bad': '정비' };
        refRow.push(statusMap[item.status] || item.status);
        refRow.push(item.memo || "");
      });
    } else {
      for (let i = 0; i < 24; i++) refRow.push("");
    }
    
    // AE, AF: 점검내용, 특이사항
    refRow.push(data.mainContent || "");
    refRow.push(data.specialNotes || "");

    refSheet.appendRow(refRow);
    refSheet.getRange(refSheet.getLastRow(), 1, 1, refRow.length)
      .setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
  }
}

// --- 구글 폼 동의서 자동화 (A시트 기반) ---

function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    Logger.log("알림: 이 함수는 구글 폼 제출 시 자동으로 실행되는 함수입니다. 수동으로 실행하지 마세요.");
    return;
  }
  try {
    const props = PropertiesService.getScriptProperties();
    const templateId = props.getProperty('ID_AGREE_TEMPLATE');
    const folderId = props.getProperty('ID_SAVE_FOLDER');
    if (!templateId || !folderId) {
      Logger.log("오류: 공유 폴더 ID 또는 템플릿 ID가 설정되지 않았습니다.");
      return;
    }

    const sheet = e.range.getSheet(); // 데이터가 들어온 바로 그 시트
    const responses = e.namedValues;

    const name = responses['이름'] ? responses['이름'][0] : '미기입';
    const vehicleNumber = responses['차량번호를 입력해 주세요'] ? responses['차량번호를 입력해 주세요'][0] : (responses['차량번호'] ? responses['차량번호'][0] : '미기입');
    const date = Utilities.formatDate(new Date(), "GMT+9", "yyyy. MM. dd");
    const rowNum = e.range.getRow();
    const seqNum = (rowNum - 1).toString().padStart(5, '0');
    const managementNo = 'R' + Utilities.formatDate(new Date(), "GMT+9", "yyyyMM") + seqNum;

    const templateFile = DriveApp.getFileById(templateId);
    const destFolder = DriveApp.getFolderById(folderId);
    const tempCopy = templateFile.makeCopy(`동의서_${name}_${managementNo}`, destFolder);
    const doc = DocumentApp.openById(tempCopy.getId());
    const body = doc.getBody();

    body.replaceText('{{이름}}', name);
    body.replaceText('{{날짜}}', date);
    body.replaceText('{{차량번호}}', vehicleNumber);
    // ... 필요한 추가 치환 로직 입력 ...
    doc.saveAndClose();

    const pdfBlob = tempCopy.getAs(MimeType.PDF);
    const pdfFile = destFolder.createFile(pdfBlob).setName(`동의서_${name}_${managementNo}`);
    DriveApp.getFileById(tempCopy.getId()).setTrashed(true);

    const lastCol = sheet.getLastColumn();
    sheet.getRange(rowNum, lastCol - 1).setValue(managementNo);
    sheet.getRange(rowNum, lastCol).setFormula(`=HYPERLINK("${pdfFile.getUrl()}", "PDF 보기")`);
    sheet.getRange(rowNum, 1, 1, lastCol).setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);

  } catch (err) { console.error(err.toString()); }
}
