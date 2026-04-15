function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('MedList')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Patients');
  if (!sh) {
    sh = ss.insertSheet('Patients');
    sh.getRange(1,1,1,10).setValues([['ID','Name','Room','MRN','Problems','ICS','ToDo','Priority','ActiveMeds','HomeMeds']]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function getPatients() {
  const d = getSheet().getDataRange().getValues();
  if (d.length < 2) return [];
  const h = d[0];
  return d.slice(1).map(r => Object.fromEntries(h.map((k,i) => [k, r[i]])));
}

function savePatient(p) {
  const sh = getSheet();
  const row = [p.ID||'', p.Name||'', p.Room||'', p.MRN||'',
               p.Problems||'', p.ICS||'', p.ToDo||'',
               p.Priority||'Stable', p.ActiveMeds||'', p.HomeMeds||''];
  if (p.ID) {
    const d = sh.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
      if (String(d[i][0]) === String(p.ID)) {
        sh.getRange(i+1,1,1,10).setValues([row]);
        return p.ID;
      }
    }
  }
  const id = Date.now().toString();
  row[0] = id;
  sh.appendRow(row);
  return id;
}

function deletePatient(id) {
  const sh = getSheet();
  const d = sh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) { sh.deleteRow(i+1); return true; }
  }
  return false;
}
