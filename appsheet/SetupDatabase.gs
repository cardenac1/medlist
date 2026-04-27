// ============================================================
//  MedList — AppSheet Database Setup Script
//
//  HOW TO USE:
//  1. Go to script.google.com → New project
//  2. Paste this entire file into Code.gs
//  3. Click Run → setupMedListDatabase
//  4. Authorize when prompted
//  5. Check your Google Drive — "MedList AppSheet Database" will appear
//  6. Open it and go to appsheet.com to connect it
// ============================================================

function setupMedListDatabase() {
  // Create (or open existing) spreadsheet
  let ss;
  const files = DriveApp.getFilesByName('MedList AppSheet Database');
  if (files.hasNext()) {
    ss = SpreadsheetApp.openById(files.next().getId());
    Logger.log('Opened existing spreadsheet.');
  } else {
    ss = SpreadsheetApp.create('MedList AppSheet Database');
    Logger.log('Created new spreadsheet.');
  }

  setupPatientsSheet(ss);
  setupTasksSheet(ss);

  // Remove any extra blank sheets
  ss.getSheets().forEach(sh => {
    if (sh.getName() === 'Sheet1' && sh.getLastRow() === 0) {
      try { ss.deleteSheet(sh); } catch(e) {}
    }
  });

  const url = ss.getUrl();
  Logger.log('✅ Done! Open your spreadsheet: ' + url);
  SpreadsheetApp.getUi().alert(
    '✅ MedList Database Created!\n\n' +
    'Your spreadsheet "MedList AppSheet Database" is ready in Google Drive.\n\n' +
    'Next step: Go to appsheet.com → New App → Start with your own data → select this spreadsheet.'
  );
}

// ── PATIENTS SHEET ────────────────────────────────────────
function setupPatientsSheet(ss) {
  let sh = ss.getSheetByName('Patients');
  if (!sh) sh = ss.insertSheet('Patients');
  else sh.clearContents();

  const headers = [
    'PatientID',   // A  — AppSheet key column (auto-filled by formula)
    'Name',        // B  — LAST, First
    'RM',          // C  — Room number
    'MRN',         // D  — Medical record number
    'Attending',   // E
    'AG',          // F  — Age/Gender e.g. 65M
    'Priority',    // G  — 1-10 or C
    'Type',        // H  — Patient or Consult
    'Problems',    // I  — Diagnosis / PMH
    'ICS',         // J  — Imaging · Consults · Studies
    'VIOLIN',      // K  — Vitals · I&O · Labs summary (fishbone text)
    'ORDERS',      // L  — Medications / orders
    'Notes',       // M  — Free-form notes
    'CreatedAt'    // N  — Timestamp (auto-filled)
  ];

  // Write headers
  sh.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#1a1a2e')
    .setFontColor('#e8eaed')
    .setFontSize(10);

  // PatientID formula: auto-generate a unique ID from row number
  // AppSheet will use this as the key
  sh.getRange('A2').setFormula('=IF(B2="","",TEXT(ROW()-1,"000"))');

  // CreatedAt formula: auto-stamp when row is filled
  sh.getRange('N2').setFormula('=IF(B2="","",(NOW()))');

  // Sample data
  const samplePatients = [
    ['001', 'GARCIA, Maria',   '5NE 531B',  '433607', 'Smith, J',  '65F', '1', 'Patient', 'Post-op day 2 colectomy\nHTN, DM2', 'CT abd pending\nID consult placed', 'T 38.2, HR 92, SBP 138/82, O2 96% RA\nI: 1200 / O: 850\nWBC *14.2*(11.1), Hgb 9.8, Na 138, Cr 0.9', 'Pip-tazo 3.375g IV q6h\nMetoprolol 25mg PO BID\nInsulin SS', '', now()],
    ['002', 'JOHNSON, Robert', '4W 412A',   '287441', 'Lee, A',    '72M', '2', 'Patient', 'Acute on chronic CHF exacerbation\nCOPD, AFib on Xarelto', 'Echo pending\nCardiology following', 'T 37.1, HR *108*, SBP 152/90, O2 *91%*-2L NC\nI: 2400 / O: *1100*\n*BNP 4200*, Cr 1.8, K 3.3', 'Furosemide 80mg IV BID\nCarvedilol 6.25mg PO BID\nXarelto 20mg PO daily', '', now()],
    ['003', 'PATEL, Priya',    '3S 308',    '519823', 'Brown, K',  '45F', '4', 'Patient', 'Cholecystitis s/p lap chole (POD1)\nOtherwise healthy', 'Labs in AM', 'T 37.4, HR 78, SBP 118/72, O2 98% RA\nI: 800 / O: 650\nWBC 9.2, Hgb 11.8, Cr 0.7', 'Ketorolac 15mg IV q6h\nOndansetron 4mg IV PRN\nClear liquids', '', now()],
    ['004', 'WILLIAMS, James', 'ICU 6',     '334512', 'Chen, R',   '58M', '1', 'Patient', 'Septic shock — pneumonia\nDM2, CKD stage 3', 'Blood cx ×2 pending\nPulm consult', '*Vent: AC/VC RR20/TV500/PEEP8/FiO2 0.45*\nT *38.9*, HR *118*, SBP 88/54 on pressors\nI: 3200 / O: *400* (Foley)\n*Lac 4.2*, *WBC 22.1*, *Cr 2.4*', 'Vancomycin 1.25g IV q12h\nPip-tazo 4.5g IV q6h\nNorepinephrine 0.08mcg/kg/min\nInsulin gtt', '', now()],
    ['005', 'MARTINEZ, Ana',   '2N 201B',   '621099', 'Wilson, P', '31F', '5', 'Patient', 'Appendectomy (POD2)\nNo significant PMH', 'Discharge planning', 'T 37.0, HR 68, SBP 112/70, O2 99% RA\nI: 600 / O: 550\nWBC 8.1, Hgb 12.4 — trending well', 'Oxycodone 5mg PO q4h PRN\nIbuprofen 600mg PO q6h\nAdvance diet as tolerated', '', now()],
  ];

  sh.getRange(2, 1, samplePatients.length, headers.length).setValues(samplePatients);

  // Formatting
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 80);   // PatientID
  sh.setColumnWidth(2, 160);  // Name
  sh.setColumnWidth(3, 100);  // RM
  sh.setColumnWidth(4, 110);  // MRN
  sh.setColumnWidth(5, 130);  // Attending
  sh.setColumnWidth(6, 70);   // AG
  sh.setColumnWidth(7, 80);   // Priority
  sh.setColumnWidth(8, 80);   // Type
  sh.setColumnWidth(9, 280);  // Problems
  sh.setColumnWidth(10, 220); // ICS
  sh.setColumnWidth(11, 380); // VIOLIN
  sh.setColumnWidth(12, 280); // ORDERS
  sh.setColumnWidth(13, 200); // Notes
  sh.setColumnWidth(14, 160); // CreatedAt

  // Wrap text for long columns
  sh.getRange('I:M').setWrap(true);
  sh.setRowHeightsForced(2, 20, 60);

  // Priority color-coding via conditional formatting
  applyPriorityColors(sh);

  Logger.log('Patients sheet created with ' + samplePatients.length + ' sample patients.');
}

// ── TASKS SHEET ───────────────────────────────────────────
// Each patient has multiple tasks. AppSheet links them via PatientID.
function setupTasksSheet(ss) {
  let sh = ss.getSheetByName('Tasks');
  if (!sh) sh = ss.insertSheet('Tasks');
  else sh.clearContents();

  const headers = [
    'TaskID',      // A — Key
    'PatientID',   // B — Ref to Patients.PatientID
    'Task',        // C — Task description
    'Done',        // D — TRUE/FALSE (AppSheet renders as checkbox)
    'CreatedAt'    // E — Timestamp
  ];

  sh.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#1a1a2e')
    .setFontColor('#e8eaed')
    .setFontSize(10);

  // Sample tasks linked to sample patients
  const now = new Date();
  const sampleTasks = [
    ['T001', '001', 'Check morning CBC/BMP',         false, now],
    ['T002', '001', 'Post-op note',                  true,  now],
    ['T003', '001', 'NPO after midnight',             true,  now],
    ['T004', '001', 'Call family re: discharge plan', false, now],
    ['T005', '002', 'Strict I&O every 4h',            false, now],
    ['T006', '002', 'Daily weights',                  true,  now],
    ['T007', '002', 'Echo results — follow up',       false, now],
    ['T008', '003', 'Advance diet if tolerating',     false, now],
    ['T009', '003', 'Discharge criteria met?',        false, now],
    ['T010', '004', 'AM ABG',                         false, now],
    ['T011', '004', 'Weaning trial 0800',             false, now],
    ['T012', '004', 'Family meeting re: prognosis',   false, now],
    ['T013', '004', 'Culture results — follow up',    false, now],
    ['T014', '005', 'Discharge paperwork',            false, now],
    ['T015', '005', 'Pain controlled on PO meds?',    true,  now],
  ];

  sh.getRange(2, 1, sampleTasks.length, headers.length).setValues(sampleTasks);

  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 80);
  sh.setColumnWidth(2, 90);
  sh.setColumnWidth(3, 300);
  sh.setColumnWidth(4, 70);
  sh.setColumnWidth(5, 160);

  // Checkboxes for Done column
  sh.getRange('D2:D200').insertCheckboxes();

  Logger.log('Tasks sheet created with ' + sampleTasks.length + ' sample tasks.');
}

// ── PRIORITY COLOR FORMATTING ─────────────────────────────
function applyPriorityColors(sh) {
  const priorityColors = [
    { value: '1',  bg: '#3d0000', text: '#ff6666' },  // Urgent — dark red
    { value: '2',  bg: '#3d1000', text: '#ff8844' },  // High — dark orange-red
    { value: '3',  bg: '#3d1f00', text: '#ffaa55' },  // Med-High — dark orange
    { value: '4',  bg: '#2d2000', text: '#ffcc44' },  // Medium — dark yellow
    { value: '5',  bg: '#1a2000', text: '#ddcc00' },  // Med-Low
    { value: '6',  bg: '#001a20', text: '#44bbcc' },  // Low-Med — teal
    { value: '7',  bg: '#00001a', text: '#6688ff' },  // Low — blue
    { value: '8',  bg: '#00000d', text: '#4444cc' },  // Very Low
    { value: '9',  bg: '#200020', text: '#cc44cc' },  // Minimal
    { value: '10', bg: '#100010', text: '#884488' },  // Lowest
    { value: 'C',  bg: '#001a0d', text: '#23CC72' },  // Complete — green
    { value: 'c',  bg: '#001a0d', text: '#23CC72' },
  ];

  const rules = [];
  const range = sh.getRange('A2:N200');

  priorityColors.forEach(pc => {
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$G2="' + pc.value + '"')
      .setBackground(pc.bg)
      .setFontColor(pc.text)
      .setRanges([range])
      .build();
    rules.push(rule);
  });

  sh.setConditionalFormatRules(rules);
  Logger.log('Priority color formatting applied.');
}

function now() { return new Date(); }
