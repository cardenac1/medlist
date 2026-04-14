// ═══════════════════════════════════════════════════════════
// MedList — Google Sheets Database  |  Code.gs
// ═══════════════════════════════════════════════════════════
// SETUP: Extensions > Apps Script → paste this file + Sidebar.html
// Then reload the spreadsheet and use the MedList menu.
// ═══════════════════════════════════════════════════════════

// Database column positions (1-indexed)
const C = {
  NAME:1, RM:2, MRN:3, PROB:4, ICS:5, TODO:6, PRI:7, STAT:8,
  AMEDS:9, HMEDS:10, ORDERS:11, VITALS:12, LABS:13, IO:14
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('MedList')
    .addItem('⚙  Setup Sheets',    'setup')
    .addItem('📥 Import Patient',   'showSidebar')
    .addSeparator()
    .addItem('🔄 Refresh Views',    'refreshActive')
    .addToUi();
}

// ── Setup ─────────────────────────────────────────────────
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ['Database','Details','Vitals & Labs','Orders'].forEach(n => {
    if (!ss.getSheetByName(n)) ss.insertSheet(n);
  });
  const db = ss.getSheetByName('Database');
  const h  = ['Name','RM','MRN','Problems','ICS','To Do','Priority','Status',
              'Active Meds','Home Meds','Orders','Vitals','Labs','I/O'];
  db.getRange(1,1,1,h.length).setValues([h])
    .setBackground('#263238').setFontColor('#fff').setFontWeight('bold');
  db.setFrozenRows(1);
  [C.PROB,C.ICS,C.TODO,C.AMEDS,C.HMEDS,C.ORDERS].forEach(c => db.setColumnWidth(c, 280));
  [C.NAME,C.RM,C.MRN,C.PRI,C.STAT].forEach(c => db.setColumnWidth(c, 120));
  SpreadsheetApp.getUi().alert('MedList ready!\n\nUse  MedList › Import Patient  to add patients.');
}

// ── Sidebar ───────────────────────────────────────────────
function showSidebar() {
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('MedList')
  );
}

// ── Patient list (called from sidebar) ───────────────────
function getPatients() {
  const db = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Database');
  if (!db || db.getLastRow() < 2) return [];
  return db.getRange(2, 1, db.getLastRow()-1, 3).getValues()
    .map((r,i) => ({ row: i+2, name: r[0], rm: r[1], mrn: r[2] }))
    .filter(p => p.name);
}

// ── Save / update patient ─────────────────────────────────
function savePatient(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const db = ss.getSheetByName('Database') || ss.insertSheet('Database');
  let row = null;
  if (p.mrn) {
    const data = db.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][C.MRN-1]) === String(p.mrn)) { row = i+1; break; }
    }
  }
  if (!row) row = db.getLastRow() + 1;

  db.getRange(row, 1, 1, 14).setValues([[
    p.name||'', p.rm||'', p.mrn||'', p.problems||'', p.ics||'',
    p.todo||'', p.priority||'', p.status||'',
    p.activeMeds||'', p.homeMeds||'', p.orders||'',
    JSON.stringify(p.vitals||[]),
    JSON.stringify(p.labs||{}),
    JSON.stringify(p.io||{})
  ]]);
  return '✓ Saved: ' + (p.name || p.mrn || 'patient');
}

// ── View patient — populates all 3 view sheets ────────────
function viewPatient(row) {
  const db = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Database');
  const d  = db.getRange(row, 1, 1, 14).getValues()[0];
  const p  = {
    name: d[0], rm: d[1], mrn: d[2], problems: d[3], ics: d[4],
    todo: d[5], priority: d[6], status: d[7],
    activeMeds: d[8], homeMeds: d[9], orders: d[10],
    vitals: tryJ(d[11], []),
    labs:   tryJ(d[12], {}),
    io:     tryJ(d[13], {})
  };
  buildDetails(p);
  buildVitalsLabs(p);
  buildOrders(p);
  return '✓ ' + p.name + ' loaded into view sheets.';
}

// Refresh using whatever patient is highlighted in Database
function refreshActive() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const row = ss.getActiveCell().getRow();
  if (ss.getActiveSheet().getName() !== 'Database' || row < 2)
    return SpreadsheetApp.getUi().alert('Select a patient row in the Database sheet first.');
  viewPatient(row);
}

// ── Details sheet ─────────────────────────────────────────
function buildDetails(p) {
  const sh = getOrCreate('Details');
  sh.clearContents(); sh.clearFormats();
  const rows = [
    ['Field','Value'],
    ['Name',p.name], ['Room',p.rm], ['MRN',p.mrn],
    ['Problems',p.problems], ['ICS',p.ics],
    ['To Do',p.todo], ['Priority',p.priority], ['Status',p.status]
  ];
  sh.getRange(1,1,rows.length,2).setValues(rows);
  sh.getRange(1,1,1,2).setBackground('#263238').setFontColor('#fff').setFontWeight('bold');
  sh.getRange(2,1,rows.length-1,1).setBackground('#37474f').setFontColor('#ccc').setFontWeight('bold');
  sh.getRange(2,2,rows.length-1,1).setWrap(true);
  sh.setColumnWidth(1,120); sh.setColumnWidth(2,480);
  for (let i=2; i<=rows.length; i++) sh.setRowHeight(i,60);
  sh.activate();
}

// ── Vitals & Labs sheet ───────────────────────────────────
function buildVitalsLabs(p) {
  const sh = getOrCreate('Vitals & Labs');
  sh.clearContents(); sh.clearFormats();
  let r = 1;

  // — Vitals —
  hdr(sh, r++, 8, 'VITALS — Last 24h since 7am');
  sh.getRange(r,1,1,8).setValues([['Time','Temp','HR','BP','O2%','O2 Method','Intake mL','Output mL']])
    .setBackground('#37474f').setFontColor('#fff').setFontWeight('bold');
  r++;
  const vitals = Array.isArray(p.vitals) ? p.vitals : [];
  if (vitals.length) {
    const vRows = vitals.map(v => [
      v.time||'', v.temp||'', v.hr||'',
      v.bp || (v.sbp&&v.dbp ? v.sbp+'/'+v.dbp : ''),
      v.o2||'', v.o2method||'', v.intake||'', v.output||''
    ]);
    sh.getRange(r,1,vRows.length,8).setValues(vRows);
    r += vRows.length;
  }
  if (p.io && (p.io.totalIn||p.io.totalOut)) {
    r++;
    sh.getRange(r,1,1,8).setValues([['TOTAL (since 7am)','','','','','',p.io.totalIn||0,p.io.totalOut||0]])
      .setFontWeight('bold').setBackground('#1b3a22').setFontColor('#7fff7f');
    r++;
    const bal = (p.io.totalIn||0)-(p.io.totalOut||0);
    sh.getRange(r,1,1,8).setValues([['Net Balance','','','','','',bal,'']])
      .setBackground('#1b3a22').setFontColor(bal<0?'#ff7f7f':'#aaffaa');
    r++;
  }
  r++;

  // — Labs —
  hdr(sh, r++, 7, 'LABS — Last 3 Values (most recent first)');
  sh.getRange(r,1,1,7).setValues([['Lab','Value 1','Date 1','Value 2','Date 2','Value 3','Date 3']])
    .setBackground('#37474f').setFontColor('#fff').setFontWeight('bold');
  r++;

  const LABS = [
    null,'CBC',
    ['wbc','WBC'],['hgb','HGB'],['plt','Platelet Count'],
    null,'Coagulation',
    ['pt','PT'],['inr','INR'],['aptt','APTT'],['fib','Fibrinogen'],
    null,'BMP',
    ['glu','Glucose'],['gluPOC','Glucose POC'],
    ['na','Sodium'],['k','Potassium'],['cl','Chloride'],
    ['co2','CO2'],['bun','BUN'],['cr','Creatinine'],
    [null,'Anion Gap*'],
    null,'LFTs',
    ['ast','AST'],['alk','Alk Phos'],['tbil','Total Bili'],
    ['albumin','Albumin'],['tprot','Total Protein'],['dbil','Direct Bili'],
    null,'Other',
    ['phos','Inorg. Phos'],['ica','Ionized Ca'],
    ['mg','Magnesium'],['lactate','Lactic Acid'],
    ['ca','Calcium'],['tacro','Tacrolimus']
  ];

  LABS.forEach(def => {
    if (!def) return;
    if (typeof def === 'string') {
      sh.getRange(r,1,1,7).merge().setValue(def)
        .setBackground('#2a2a4e').setFontColor('#aaaaff').setFontWeight('bold');
      r++; return;
    }
    const [key, label] = def;
    let vals = [];
    if (key === null) {          // Anion Gap — calculated
      const na=p.labs.na, cl=p.labs.cl, co2=p.labs.co2;
      if (na&&cl&&co2&&na[0]&&cl[0]&&co2[0])
        vals = [{ val: Math.round(na[0].val - cl[0].val - co2[0].val), date: na[0].date, time:'' }];
    } else {
      vals = p.labs[key] || [];
    }
    const row = [label];
    vals.slice(0,3).forEach(v => {
      row.push(typeof v==='object' ? v.val : v);
      row.push(typeof v==='object' ? (v.date||'')+(v.time?' '+v.time:'') : '');
    });
    while (row.length < 7) row.push('');
    sh.getRange(r,1,1,7).setValues([row]);
    r++;
  });

  sh.setColumnWidth(1,150);
  [2,4,6].forEach(c => sh.setColumnWidth(c,75));
  [3,5,7].forEach(c => sh.setColumnWidth(c,105));
  sh.activate();
}

// ── Orders sheet ──────────────────────────────────────────
function buildOrders(p) {
  const sh = getOrCreate('Orders');
  sh.clearContents(); sh.clearFormats();
  sh.setColumnWidth(1,700);

  sh.getRange(1,1).setValue('ORDERS — '+(p.name||'')+' ('+p.rm+')')
    .setFontWeight('bold').setFontSize(13).setBackground('#263238').setFontColor('#7ab4ff');

  let r = 3;
  function section(title, content, height) {
    sh.getRange(r,1).setValue(title).setFontWeight('bold').setBackground('#37474f').setFontColor('#fff');
    r++;
    sh.getRange(r,1).setValue(content||'None').setWrap(true);
    sh.setRowHeight(r, height);
    r += 2;
  }
  section('ACTIVE MEDICATIONS',   p.activeMeds, 200);
  section('HOME MEDICATIONS',     p.homeMeds,   150);
  section('ORDERS / CHECKLIST',   p.orders,     200);
  sh.activate();
}

// ── Helpers ───────────────────────────────────────────────
function hdr(sh, r, cols, label) {
  sh.getRange(r,1,1,cols).merge().setValue(label)
    .setBackground('#263238').setFontColor('#7ab4ff').setFontWeight('bold').setFontSize(12);
}
function getOrCreate(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function tryJ(s, def) {
  try { return JSON.parse(s||'null') || def; } catch(e) { return def; }
}
