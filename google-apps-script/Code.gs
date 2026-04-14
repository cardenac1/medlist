// ============================================================
//  MedList — Google Apps Script Backend
//  Serves the web app and provides CRUD on Google Sheets.
//
//  DEPLOYMENT NOTE:
//  1. Go to script.google.com → New project
//  2. Create files: Code.gs, Index.html, Stylesheet.html, JavaScript.html
//  3. In Project Settings, check "Show appsscript.json manifest file in editor"
//     then paste the appsscript.json content there.
//  4. Deploy → New Deployment → Web App
//     Execute as: Me  |  Access: Anyone with a Google account
// ============================================================

const SS_NAME   = 'MedList Database';
const SH_NAME   = 'Patients';
const HEADERS   = [
  'ID','Type','Name','RM','MRN','Att','Priority',
  'Problems','ICS','VIOLIN','ORDERS','Todo',
  'ImportedData','LabData','AG',
  'CreatedAt','UpdatedAt','SortOrder'
];

// ── Web app entry ──────────────────────────────────────────
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('MedList')
    .addMetaTag('viewport','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no')
    .addMetaTag('apple-mobile-web-app-capable','yes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(f) {
  return HtmlService.createHtmlOutputFromFile(f).getContent();
}

// ── Spreadsheet helpers ────────────────────────────────────
function getSS() {
  try { const s = SpreadsheetApp.getActiveSpreadsheet(); if (s) return s; } catch(e){}
  const files = DriveApp.getFilesByName(SS_NAME);
  if (files.hasNext()) return SpreadsheetApp.openById(files.next().getId());
  return SpreadsheetApp.create(SS_NAME);
}

function getSheet() {
  const ss = getSS();
  let sh = ss.getSheetByName(SH_NAME);
  if (!sh) { sh = ss.getSheets()[0]; sh.setName(SH_NAME); }
  if (sh.getLastRow() === 0 || sh.getRange(1,1).getValue() !== 'ID') initSheet(sh);
  return sh;
}

function initSheet(sh) {
  sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#e8eaed');
  sh.setFrozenRows(1);
  const w=[130,80,160,100,120,140,80,300,250,400,300,300,40,40,80,180,180,80];
  w.forEach((v,i)=>{ if(i<HEADERS.length) sh.setColumnWidth(i+1,v); });
  sh.hideColumns(13,2); // hide ImportedData, LabData from sheet view
}

// ── CRUD ───────────────────────────────────────────────────
function getPatients() {
  try {
    const sh = getSheet(), lr = sh.getLastRow();
    if (lr <= 1) return [];
    const data = sh.getRange(1,1,lr,HEADERS.length).getValues();
    const hdrs = data[0];
    return data.slice(1).filter(r=>r[0]).map(r => {
      const p = {}; hdrs.forEach((h,i)=>{ p[h]=r[i]!=null?String(r[i]):''; }); return p;
    });
  } catch(e) { return {error:e.toString()}; }
}

function addPatient(d) {
  try {
    const sh=getSheet(), id=Utilities.getUuid(), now=new Date().toISOString();
    const row=HEADERS.map(h=>{
      if(h==='ID') return id;
      if(h==='CreatedAt'||h==='UpdatedAt') return now;
      if(h==='SortOrder') return sh.getLastRow();
      if(h==='Type') return d[h]||'Patient';
      return d[h]!==undefined?d[h]:'';
    });
    sh.appendRow(row);
    return {success:true,id};
  } catch(e) { return {error:e.toString()}; }
}

function updatePatient(id, d) {
  try {
    const sh=getSheet(), lr=sh.getLastRow();
    if(lr<=1) return {error:'No patients'};
    const data=sh.getRange(1,1,lr,HEADERS.length).getValues();
    const hdrs=data[0], ic=hdrs.indexOf('ID');
    for(let i=1;i<data.length;i++){
      if(String(data[i][ic])!==String(id)) continue;
      const now=new Date().toISOString();
      const row=hdrs.map((h,j)=>{
        if(h==='ID'||h==='CreatedAt') return data[i][j];
        if(h==='UpdatedAt') return now;
        return d[h]!==undefined?d[h]:data[i][j];
      });
      sh.getRange(i+1,1,1,HEADERS.length).setValues([row]);
      return {success:true};
    }
    return {error:'Not found'};
  } catch(e) { return {error:e.toString()}; }
}

function deletePatient(id) {
  try {
    const sh=getSheet(), lr=sh.getLastRow();
    const col=sh.getRange(1,1,lr,1).getValues();
    for(let i=1;i<col.length;i++){
      if(String(col[i][0])===String(id)){ sh.deleteRow(i+1); return {success:true}; }
    }
    return {error:'Not found'};
  } catch(e) { return {error:e.toString()}; }
}

// Save the raw EHR text + generated VIOLIN for a patient
function saveImportedData(id, importedData, violin) {
  return updatePatient(id, {ImportedData: importedData, VIOLIN: violin});
}

// Replace entire patient list (used for Cerner sync / reorder)
function saveAllPatients(patients) {
  try {
    const sh=getSheet(), lr=sh.getLastRow();
    if(lr>1) sh.deleteRows(2,lr-1);
    if(!patients||!patients.length) return {success:true};
    const now=new Date().toISOString();
    const rows=patients.map((p,i)=>HEADERS.map(h=>{
      if(h==='SortOrder') return i;
      if(h==='UpdatedAt') return now;
      return p[h]!==undefined?p[h]:'';
    }));
    sh.getRange(2,1,rows.length,HEADERS.length).setValues(rows);
    return {success:true};
  } catch(e) { return {error:e.toString()}; }
}

function getSpreadsheetUrl() {
  try { return getSS().getUrl(); } catch(e) { return null; }
}
