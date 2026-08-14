/**
 * ----------------------------------------------------------------------------------
 * GOOGLE APPS SCRIPT: 1:1 LIVE SPREADSHEET WEBHOOK SYNC
 * Format matching Compiled_Divisi_RKA_20260804_0849.xlsx
 * ----------------------------------------------------------------------------------
 * Deploy Instructions:
 * 1. Open your target Google Spreadsheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Replace all existing code with this file.
 * 4. Click Save (Ctrl + S).
 * 5. Click Deploy -> New deployment.
 * 6. Set "Execute as": Me
 * 7. Set "Who has access": Anyone (Siapa saja)
 * 8. Copy the Web App URL and paste it into the Webhook URL field in the app.
 * ----------------------------------------------------------------------------------
 */

function doPost(e) {
  try {
    var rawData = "";
    if (e && e.parameter && e.parameter.data) {
      rawData = e.parameter.data;
    } else if (e && e.postData && e.postData.contents) {
      rawData = e.postData.contents;
    }
    
    if (!rawData) {
      throw new Error("No data payload received.");
    }
    
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("No active spreadsheet found. Open script via Extensions -> Apps Script inside your Google Sheet.");
    }

    var projects = payload.projects || [];
    var filterDiv = payload.filterDivisionName || 'All Divisions';
    var filterSq = payload.filterSquadName || 'All Squads';
    var exportDateStr = payload.exportDate ? formatDateStr(new Date(payload.exportDate)) : formatDateStr(new Date());

    // ------------------------------------------------------------------------------
    // TAB 1: MASTER DIVISION OVERVIEW
    // ------------------------------------------------------------------------------
    var masterSheet = getOrCreateSheet(ss, "Master Division Overview");
    masterSheet.clear();
    masterSheet.clearFormats();

    // Banner Header
    masterSheet.getRange("B2:N2").merge()
      .setValue("DIVISION INCEPTION MASTER EXECUTIVE OVERVIEW")
      .setFontFamily("Outfit")
      .setFontSize(16)
      .setFontWeight("bold")
      .setFontColor("#FFFFFF")
      .setBackground("#4F46E5")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    masterSheet.setRowHeight(2, 42);

    // Metadata Card
    masterSheet.getRange("B4").setValue("Division Filter:").setFontWeight("bold");
    masterSheet.getRange("C4").setValue(filterDiv);
    masterSheet.getRange("E4").setValue("Squad Filter:").setFontWeight("bold");
    masterSheet.getRange("F4").setValue(filterSq);
    masterSheet.getRange("I4").setValue("Export Date:").setFontWeight("bold");
    masterSheet.getRange("J4").setValue(exportDateStr);

    masterSheet.getRange("B5").setValue("Total Inceptions:").setFontWeight("bold");
    masterSheet.getRange("C5").setValue(projects.length);

    // Master Table Headers (Row 7)
    var masterHeaders = [
      "#", "Project Name", "Division", "Squad", 
      "Planned Start", "Target End", "Actual Start", "Actual End", "Schedule Status",
      "Total Mandays", "Activities", "Assigned PICs", "Notes"
    ];
    
    for (var h = 0; h < masterHeaders.length; h++) {
      var colCell = masterSheet.getRange(7, 2 + h);
      colCell.setValue(masterHeaders[h])
        .setFontFamily("Outfit")
        .setFontSize(10)
        .setFontWeight("bold")
        .setFontColor("#FFFFFF")
        .setBackground("#1E293B")
        .setVerticalAlignment("middle")
        .setHorizontalAlignment(h === 0 || (h >= 8 && h <= 10) ? "center" : "left");
    }
    masterSheet.setRowHeight(7, 28);

    // Master Data Rows
    var masterRow = 8;
    projects.forEach(function(p, idx) {
      var bg = (idx % 2 === 0) ? "#FFFFFF" : "#F8FAFC";
      var pics = (p.activities || []).map(function(a) { return a.pic; }).filter(Boolean);
      var picsStr = Array.from(new Set(pics)).join(", ") || "Unassigned";

      var statusText = getStatusText(p.plannedEndDate, p.actualEndDate);

      var rowValues = [
        idx + 1,
        p.name || '',
        p.divisionName || '',
        p.squadName || '',
        formatDateVal(p.plannedStartDate),
        formatDateVal(p.plannedEndDate),
        formatDateVal(p.actualStartDate),
        formatDateVal(p.actualEndDate),
        statusText,
        p.totalMandays || 0,
        p.activityCount || (p.activities ? p.activities.length : 0),
        picsStr,
        p.notes || ''
      ];

      for (var c = 0; c < rowValues.length; c++) {
        var cell = masterSheet.getRange(masterRow, 2 + c);
        cell.setValue(rowValues[c])
          .setFontFamily("Outfit")
          .setFontSize(10)
          .setBackground(bg)
          .setVerticalAlignment("middle");

        if (c === 0 || (c >= 8 && c <= 10)) {
          cell.setHorizontalAlignment("center");
        } else {
          cell.setHorizontalAlignment("left");
        }

        // Schedule Status Cell Highlight
        if (c === 8) {
          if (statusText === "On Track") {
            cell.setBackground("#DCFCE7").setFontColor("#15803D").setFontWeight("bold");
          } else if (statusText.indexOf("Minor Delay") !== -1) {
            cell.setBackground("#FEF3C7").setFontColor("#B45309").setFontWeight("bold");
          } else if (statusText.indexOf("Major Delay") !== -1) {
            cell.setBackground("#FEE2E2").setFontColor("#B91C1C").setFontWeight("bold");
          }
        }
      }

      masterSheet.setRowHeight(masterRow, 24);
      masterRow++;
    });

    // Master Totals Row
    masterSheet.getRange(masterRow, 3).setValue("TOTAL").setFontWeight("bold").setHorizontalAlignment("right");
    masterSheet.getRange(masterRow, 11).setFormula("=SUM(K8:K" + (masterRow - 1) + ")").setFontWeight("bold").setFontColor("#4F46E5").setHorizontalAlignment("center");
    masterSheet.getRange(masterRow, 12).setFormula("=SUM(L8:L" + (masterRow - 1) + ")").setFontWeight("bold").setHorizontalAlignment("center");

    var totRange = masterSheet.getRange(masterRow, 2, 1, 13);
    totRange.setBackground("#EEF2FF").setFontFamily("Outfit").setVerticalAlignment("middle");
    masterSheet.setRowHeight(masterRow, 26);

    // Set Column Widths
    setMasterColumnWidths(masterSheet);

    // ------------------------------------------------------------------------------
    // PAIRED SQUAD TABS ({Squad Name} Summary & Gantt {Squad Name})
    // ------------------------------------------------------------------------------
    var squadGroups = {};
    projects.forEach(function(p) {
      var sqKey = p.squadName || 'Unassigned Squad';
      if (!squadGroups[sqKey]) squadGroups[sqKey] = [];
      squadGroups[sqKey].push(p);
    });

    Object.keys(squadGroups).forEach(function(squadName) {
      var squadProjects = squadGroups[squadName];
      var cleanSqName = sanitizeName(squadName);

      // TAB: {Squad Name} Summary
      var summarySheetName = (cleanSqName + " Summary").substring(0, 30);
      var summarySheet = getOrCreateSheet(ss, summarySheetName);
      summarySheet.clear();
      summarySheet.clearFormats();

      buildSquadSummarySheet(summarySheet, squadProjects);

      // TAB: Gantt {Squad Name}
      var ganttSheetName = ("Gantt " + cleanSqName).substring(0, 30);
      var ganttSheet = getOrCreateSheet(ss, ganttSheetName);
      ganttSheet.clear();
      ganttSheet.clearFormats();

      buildSquadGanttSheet(ganttSheet, squadProjects);
    });

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Synced 1:1 format to " + projects.length + " projects across " + Object.keys(squadGroups).length + " squads." 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ------------------------------------------------------------------------------
// HELPER: BUILD SQUAD SUMMARY SHEET
// ------------------------------------------------------------------------------
function buildSquadSummarySheet(sheet, projects) {
  setSummaryColumnWidths(sheet);
  var baseRow = 2;

  projects.forEach(function(proj) {
    // Banner Title
    sheet.getRange("B" + baseRow + ":K" + baseRow).merge()
      .setValue("PROJECT SCHEDULE SUMMARY REPORT")
      .setFontFamily("Outfit")
      .setFontSize(14)
      .setFontWeight("bold")
      .setFontColor("#FFFFFF")
      .setBackground("#4F46E5")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(baseRow, 36);

    // Metadata Card
    var rName = baseRow + 2;
    sheet.getRange("B" + rName).setValue("Project Name:").setFontWeight("bold");
    sheet.getRange("C" + rName).setValue(proj.name);
    sheet.getRange("C" + rName + ":E" + rName).merge();

    sheet.getRange("G" + rName).setValue("Start Date:").setFontWeight("bold");
    sheet.getRange("H" + rName).setValue(formatDateVal(proj.plannedStartDate));

    var rDiv = baseRow + 3;
    sheet.getRange("B" + rDiv).setValue("Division:").setFontWeight("bold");
    sheet.getRange("C" + rDiv).setValue(proj.divisionName);

    sheet.getRange("G" + rDiv).setValue("Squad:").setFontWeight("bold");
    sheet.getRange("H" + rDiv).setValue(proj.squadName);

    var rNotes = baseRow + 4;
    sheet.getRange("B" + rNotes).setValue("Notes:").setFontWeight("bold");
    sheet.getRange("C" + rNotes).setValue(proj.notes || 'None');
    sheet.getRange("C" + rNotes + ":K" + rNotes).merge();

    // Activity Table Headers
    var tableHeaderRow = baseRow + 6;
    var headers = [
      "#", "Activity Name", "Mandays", "Start Dependency", 
      "Planned Start", "Planned End", "Actual Start", "Actual End", "PIC / Lead", "Remarks"
    ];

    for (var h = 0; h < headers.length; h++) {
      var cell = sheet.getRange(tableHeaderRow, 2 + h);
      cell.setValue(headers[h])
        .setFontFamily("Outfit")
        .setFontSize(10)
        .setFontWeight("bold")
        .setFontColor("#FFFFFF")
        .setBackground("#334155")
        .setVerticalAlignment("middle")
        .setHorizontalAlignment(h === 0 || h === 2 ? "center" : "left");
    }
    sheet.setRowHeight(tableHeaderRow, 25);

    // Activity Table Data Rows
    var actStartRow = tableHeaderRow + 1;
    var actCurrentRow = actStartRow;
    var activities = proj.activities || [];

    activities.forEach(function(act, idx) {
      var bg = (idx % 2 === 0) ? "#FFFFFF" : "#F8FAFC";
      var rowVals = [
        idx + 1,
        act.name || '',
        parseInt(act.mandays) || 0,
        getDependencyText(act, idx),
        formatDateVal(act.startDate),
        formatDateVal(act.endDate),
        formatDateVal(act.actualStartDate),
        formatDateVal(act.actualEndDate),
        act.pic || '-',
        act.remarks || '-'
      ];

      for (var c = 0; c < rowVals.length; c++) {
        var cell = sheet.getRange(actCurrentRow, 2 + c);
        cell.setValue(rowVals[c])
          .setFontFamily("Outfit")
          .setFontSize(10)
          .setBackground(bg)
          .setVerticalAlignment("middle")
          .setHorizontalAlignment(c === 0 || c === 2 ? "center" : "left");
      }
      sheet.setRowHeight(actCurrentRow, 20);
      actCurrentRow++;
    });

    // Totals Row
    var totRow = actCurrentRow;
    sheet.getRange(totRow, 2).setValue("Total").setFontWeight("bold");
    sheet.getRange(totRow, 4).setFormula("=SUM(D" + actStartRow + ":D" + (totRow - 1) + ")")
      .setFontWeight("bold").setFontColor("#4F46E5").setHorizontalAlignment("center");

    var totRange = sheet.getRange(totRow, 2, 1, 10);
    totRange.setBackground("#EEF2FF").setFontFamily("Outfit").setVerticalAlignment("middle");
    sheet.setRowHeight(totRow, 24);

    baseRow = totRow + 3;
  });
}

// ------------------------------------------------------------------------------
// HELPER: BUILD SQUAD GANTT SHEET
// ------------------------------------------------------------------------------
function buildSquadGanttSheet(sheet, projects) {
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 80);

  // Headers
  sheet.getRange("A2:A4").merge().setValue("Activity");
  sheet.getRange("B2:B4").merge().setValue("Start Date");
  sheet.getRange("C2:C4").merge().setValue("End Date");
  sheet.getRange("D2:D4").merge().setValue("PIC / Lead");
  sheet.getRange("E2:E4").merge().setValue("Mandays");

  ["A", "B", "C", "D", "E"].forEach(function(col) {
    sheet.getRange(col + "2")
      .setFontFamily("Outfit")
      .setFontSize(10)
      .setFontWeight("bold")
      .setFontColor("#FFFFFF")
      .setBackground("#334155")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
  });

  // Calculate Date Range (60 days timeline window)
  var startDate = new Date();
  var minDates = [];
  projects.forEach(function(p) {
    if (p.plannedStartDate) minDates.push(new Date(p.plannedStartDate));
  });
  if (minDates.length > 0) {
    minDates.sort(function(a, b) { return a - b; });
    startDate = minDates[0];
  }
  var calStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  var daysCount = 60;
  for (var i = 0; i < daysCount; i++) {
    var d = new Date(calStart.getTime() + (i * 86400000));
    var colIdx = 6 + i;
    sheet.setColumnWidth(colIdx, 26);

    var dayNameCell = sheet.getRange(3, colIdx);
    var dayNumCell = sheet.getRange(4, colIdx);

    var dayOfWeek = d.getDay();
    var isWknd = (dayOfWeek === 0 || dayOfWeek === 6);
    var bg = isWknd ? "#E2E8F0" : "#F8FAFC";

    dayNameCell.setValue(getDayName(dayOfWeek))
      .setFontSize(8).setBackground(bg).setHorizontalAlignment("center").setVerticalAlignment("middle");
    dayNumCell.setValue(d.getDate())
      .setFontSize(8).setFontWeight("bold").setBackground(bg).setHorizontalAlignment("center").setVerticalAlignment("middle");
  }

  sheet.setRowHeight(2, 20);
  sheet.setRowHeight(3, 18);
  sheet.setRowHeight(4, 18);

  var gRow = 5;
  projects.forEach(function(proj) {
    sheet.getRange(gRow, 1).setValue("PROJECT: " + proj.name.toUpperCase())
      .setFontFamily("Outfit").setFontSize(10).setFontWeight("bold").setFontColor("#4F46E5");
    sheet.setRowHeight(gRow, 22);
    gRow++;

    (proj.activities || []).forEach(function(act) {
      sheet.getRange(gRow, 1).setValue(act.name).setFontFamily("Outfit").setFontSize(10);
      sheet.getRange(gRow, 2).setValue(formatDateVal(act.startDate)).setFontSize(9).setHorizontalAlignment("center");
      sheet.getRange(gRow, 3).setValue(formatDateVal(act.endDate)).setFontSize(9).setHorizontalAlignment("center");
      sheet.getRange(gRow, 4).setValue(act.pic || '-').setFontSize(9);
      sheet.getRange(gRow, 5).setValue(parseInt(act.mandays) || 0).setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center");

      var actStart = act.startDate ? new Date(act.startDate) : null;
      var actEnd = act.endDate ? new Date(act.endDate) : null;

      for (var i = 0; i < daysCount; i++) {
        var d = new Date(calStart.getTime() + (i * 86400000));
        var colIdx = 6 + i;
        var dayOfWeek = d.getDay();
        var isWknd = (dayOfWeek === 0 || dayOfWeek === 6);

        if (isWknd) {
          sheet.getRange(gRow, colIdx).setBackground("#E2E8F0");
        }

        if (actStart && actEnd && d >= actStart && d <= actEnd) {
          if (!isWknd) {
            sheet.getRange(gRow, colIdx).setBackground("#818CF8");
          }
        }
      }

      sheet.setRowHeight(gRow, 20);
      gRow++;
    });

    gRow++; // Blank spacing
  });
}

// ------------------------------------------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------------------------------------------
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function formatDateVal(dateStr) {
  if (!dateStr) return "-";
  try {
    var d = new Date(dateStr);
    return formatDateStr(d);
  } catch (e) {
    return "-";
  }
}

function formatDateStr(d) {
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var day = ("0" + d.getDate()).slice(-2);
  var mon = months[d.getMonth()];
  var yr = d.getFullYear();
  return day + " " + mon + " " + yr;
}

function getStatusText(plannedEnd, actualEnd) {
  if (!plannedEnd || !actualEnd) return "On Track";
  try {
    var p = new Date(plannedEnd);
    var a = new Date(actualEnd);
    var diff = Math.round((a - p) / 86400000);
    if (diff <= 0) return "On Track";
    if (diff <= 3) return "+" + diff + "d Minor Delay";
    return "+" + diff + "d Major Delay";
  } catch (e) {
    return "On Track";
  }
}

function getDependencyText(act, idx) {
  if (idx === 0 || act.startMode === 'project_start') return 'Project Start Date';
  if (act.startMode === 'after_prev') return 'After Previous Ends';
  if (act.startMode === 'parallel_prev') return 'Same Time as Previous';
  if (act.startMode === 'offset_prev') return (act.offset || 0) + ' days after previous';
  if (act.startMode === 'manual') return 'Manual Specific Date';
  return '';
}

function getDayName(dayIdx) {
  var names = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return names[dayIdx];
}

function setMasterColumnWidths(sheet) {
  sheet.setColumnWidth(1, 30);
  sheet.setColumnWidth(2, 40);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 110);
  sheet.setColumnWidth(10, 140);
  sheet.setColumnWidth(11, 100);
  sheet.setColumnWidth(12, 90);
  sheet.setColumnWidth(13, 220);
  sheet.setColumnWidth(14, 220);
}

function setSummaryColumnWidths(sheet) {
  sheet.setColumnWidth(1, 30);
  sheet.setColumnWidth(2, 40);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 110);
  sheet.setColumnWidth(10, 160);
  sheet.setColumnWidth(11, 240);
}

function sanitizeName(name) {
  if (!name) return "Squad";
  var invalidChars = ['\\', '/', '?', '*', ':', '[', ']'];
  var clean = String(name);
  for (var i = 0; i < invalidChars.length; i++) {
    clean = clean.split(invalidChars[i]).join('');
  }
  return clean.substring(0, 24);
}

