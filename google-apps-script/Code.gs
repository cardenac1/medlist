// ============================================================
// MedList — Google Apps Script Backend
// Serves a web app and provides CRUD operations on Google Sheets
// ============================================================

const SS_NAME = 'MedList Database';
const SHEET_NAME = 'Patients';

// Column schema — order matters, must match HEADERS array
const HEADERS = [
  'ID', 'Type', 'Name', 'RM', 'MRN', 'Att', 'Priority',
  'Problems', 'ICS', 'VIOLIN', 'ORDERS', 'Todo',
  'ImportedData', 'LabData', 'AG',
  'CreatedAt', 'UpdatedAt', 'SortOrder'
];

// ============================================================
// WEB APP ENTRY POINT
// ============================================================

function doGet(e) {
  const tmpl = HtmlService.createTemplateFromFile('Index');
  return tmpl.evaluate()
    .setTitle('MedList — Patient Census')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Include HTML file content (for templating)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// SPREADSHEET HELPERS
// ============================================================

function getSpreadsheet() {
  // 1. Try script-bound spreadsheet first
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) { /* standalone script */ }

  // 2. Look for existing MedList Database in Drive
  const files = DriveApp.getFilesByName(SS_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  }

  // 3. Create new spreadsheet
  return SpreadsheetApp.create(SS_NAME);
}

function getSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Use the first sheet and rename it
    sheet = ss.getSheets()[0];
    sheet.setName(SHEET_NAME);
    initSheet(sheet);
  } else if (sheet.getLastRow() === 0 || sheet.getRange(1,1).getValue() !== 'ID') {
    initSheet(sheet);
  }
  return sheet;
}

function initSheet(sheet) {
  // Write header row
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#1a1a2e')
    .setFontColor('#e8eaed')
    .setFontFamily('Arial');
  sheet.setFrozenRows(1);

  // Auto-resize columns
  const widths = [130, 80, 160, 100, 120, 140, 80, 300, 250, 400, 300, 300, 50, 50, 80, 180, 180, 80];
  widths.forEach((w, i) => {
    if (i < HEADERS.length) sheet.setColumnWidth(i + 1, w);
  });

  // Hide large internal columns (ImportedData, LabData)
  sheet.hideColumns(13, 2); // cols M, N
}

// ============================================================
// PATIENT CRUD OPERATIONS
// ============================================================

/**
 * Returns all patients as an array of plain objects.
 */
function getPatients() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = sheet.getRange(1, 1, lastRow, HEADERS.length).getValues();
    const headers = data[0];
    const patients = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // skip blank rows
      const p = {};
      headers.forEach((h, j) => {
        p[h] = row[j] !== null && row[j] !== undefined ? String(row[j]) : '';
      });
      patients.push(p);
    }

    return patients;
  } catch (err) {
    console.error('getPatients error:', err);
    return { error: err.toString() };
  }
}

/**
 * Add a new patient row. Returns { success: true, id: '...' } or { error: '...' }.
 */
function addPatient(patientData) {
  try {
    const sheet = getSheet();
    const id = Utilities.getUuid();
    const now = new Date().toISOString();
    const sortOrder = sheet.getLastRow(); // append order

    const row = HEADERS.map(h => {
      if (h === 'ID') return id;
      if (h === 'CreatedAt') return now;
      if (h === 'UpdatedAt') return now;
      if (h === 'SortOrder') return sortOrder;
      if (h === 'Type') return patientData[h] || 'Patient';
      return patientData[h] !== undefined ? patientData[h] : '';
    });

    sheet.appendRow(row);
    return { success: true, id };
  } catch (err) {
    console.error('addPatient error:', err);
    return { error: err.toString() };
  }
}

/**
 * Update an existing patient by ID. Returns { success: true } or { error: '...' }.
 */
function updatePatient(id, patientData) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { error: 'No patients found' };

    const data = sheet.getRange(1, 1, lastRow, HEADERS.length).getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) !== String(id)) continue;

      const now = new Date().toISOString();
      const updatedRow = headers.map((h, j) => {
        if (h === 'ID') return data[i][j];          // never change ID
        if (h === 'CreatedAt') return data[i][j];    // never change creation time
        if (h === 'UpdatedAt') return now;
        if (patientData[h] !== undefined) return patientData[h];
        return data[i][j];                           // preserve existing
      });

      sheet.getRange(i + 1, 1, 1, HEADERS.length).setValues([updatedRow]);
      return { success: true };
    }

    return { error: 'Patient not found: ' + id };
  } catch (err) {
    console.error('updatePatient error:', err);
    return { error: err.toString() };
  }
}

/**
 * Delete a patient by ID. Returns { success: true } or { error: '...' }.
 */
function deletePatient(id) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { error: 'No patients found' };

    const idCol = sheet.getRange(1, 1, lastRow, 1).getValues();

    for (let i = 1; i < idCol.length; i++) {
      if (String(idCol[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { error: 'Patient not found' };
  } catch (err) {
    console.error('deletePatient error:', err);
    return { error: err.toString() };
  }
}

/**
 * Replace ALL patient rows at once (used for bulk reorder / update list).
 * Patients must be full objects with all HEADERS fields.
 */
function saveAllPatients(patients) {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();

    // Clear data rows (keep header)
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    if (!patients || patients.length === 0) return { success: true };

    const now = new Date().toISOString();
    const rows = patients.map((p, idx) => {
      return HEADERS.map(h => {
        if (h === 'SortOrder') return idx;
        if (h === 'UpdatedAt') return now;
        return p[h] !== undefined ? p[h] : '';
      });
    });

    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    return { success: true };
  } catch (err) {
    console.error('saveAllPatients error:', err);
    return { error: err.toString() };
  }
}

/**
 * Returns the URL of the backing spreadsheet so users can open it directly.
 */
function getSpreadsheetUrl() {
  try {
    return getSpreadsheet().getUrl();
  } catch (err) {
    return null;
  }
}
