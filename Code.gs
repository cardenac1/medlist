function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('MedList')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Patients');
  if (!sh) {
    sh = ss.insertSheet('Patients');
    sh.getRange(1, 1, 1, 10).setValues([[
      'ID','Name','Room','MRN','Problems','ICS','ToDo','Priority','ActiveMeds','HomeMeds'
    ]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function getPatients() {
  try {
    var d = getSheet().getDataRange().getValues();
    if (d.length < 2) return [];
    var h = d[0];
    return d.slice(1).map(function(r) {
      var obj = {};
      h.forEach(function(k, i) {
        obj[k] = (r[i] !== null && r[i] !== undefined) ? String(r[i]) : '';
      });
      return obj;
    });
  } catch(e) {
    return [];
  }
}

function savePatient(p) {
  var sh = getSheet();
  if (p.ID) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (String(d[i][0]) === String(p.ID)) {
        sh.getRange(i + 1, 1, 1, 10).setValues([[
          p.ID, p.Name||'', p.Room||'', p.MRN||'',
          p.Problems||'', p.ICS||'', p.ToDo||'',
          p.Priority||'Stable', p.ActiveMeds||'', p.HomeMeds||''
        ]]);
        return p.ID;
      }
    }
  }
  var id = String(Date.now());
  sh.appendRow([
    id, p.Name||'', p.Room||'', p.MRN||'',
    p.Problems||'', p.ICS||'', p.ToDo||'',
    p.Priority||'Stable', p.ActiveMeds||'', p.HomeMeds||''
  ]);
  return id;
}

function deletePatient(id) {
  var sh = getSheet();
  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
