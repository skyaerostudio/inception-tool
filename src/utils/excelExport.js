import ExcelJS from 'exceljs';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { isWorkingDay } from './dateCalculations';

// -------------------------------------------------------------
// DESIGN SYSTEM & STYLING CONSTANTS
// -------------------------------------------------------------
const DESIGN = {
  fontFamily: 'Outfit',
  colors: {
    primaryIndigo: '4F46E5',
    darkSlate: '1E293B',
    mediumSlate: '334155',
    lightBorder: 'E2E8F0',
    headerBorder: '475569',
    totalsBg: 'EEF2FF',
    zebraBg: 'F8FAFC',
    whiteBg: 'FFFFFF',
    weekendBg: 'E2E8F0',
    ganttBarIndigo: '818CF8',
    ganttBarActualGreen: '10B981',
    statusGreenBg: 'DCFCE7',
    statusGreenTxt: '15803D',
    statusAmberBg: 'FEF3C7',
    statusAmberTxt: 'B45309',
    statusRedBg: 'FEE2E2',
    statusRedTxt: 'B91C1C'
  }
};

// Helper for dependency text
const getDependencyText = (act, index) => {
  if (index === 0 || act.startMode === 'project_start') return 'Project Start Date';
  if (act.startMode === 'after_prev') return 'After Previous Ends';
  if (act.startMode === 'parallel_prev') return 'Same Time as Previous';
  if (act.startMode === 'offset_prev') return `${act.offset || 0} days after previous`;
  if (act.startMode === 'manual') return 'Manual Specific Date';
  return '';
};

// Calculate schedule variance string
const calculateVarianceText = (plannedEndStr, actualEndStr) => {
  if (!plannedEndStr || !actualEndStr) return { text: 'On Track', status: 'ON_TRACK' };
  try {
    const planned = parseISO(plannedEndStr);
    const actual = parseISO(actualEndStr);
    const diff = differenceInDays(actual, planned);
    if (diff <= 0) return { text: 'On Track', status: 'ON_TRACK' };
    if (diff <= 3) return { text: `+${diff}d Minor Delay`, status: 'MINOR_DELAY' };
    return { text: `+${diff}d Major Delay`, status: 'MAJOR_DELAY' };
  } catch (e) {
    return { text: 'On Track', status: 'ON_TRACK' };
  }
};

// -------------------------------------------------------------
// SINGLE PROJECT EXPORT
// -------------------------------------------------------------
// Helper for resolving PIC names from users array or fallback string
const resolvePicNames = (act, users = []) => {
  const picIds = Array.isArray(act.picIds) && act.picIds.length > 0
    ? act.picIds
    : (act.picId ? [act.picId] : []);

  if (picIds.length > 0 && users.length > 0) {
    const names = picIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  return act.pic || '-';
};

// -------------------------------------------------------------
// SINGLE PROJECT EXPORT
// -------------------------------------------------------------
export const exportProjectToExcel = async (projectInfo, activities = [], divisions = [], squads = [], users = [], roles = []) => {
  const workbook = new ExcelJS.Workbook();
  
  const divisionName = divisions?.find(d => d.id === projectInfo.divisionId)?.name || 'Unassigned';
  const squadName = squads?.find(s => s.id === projectInfo.squadId)?.name || 'Unassigned';

  // Planned start and end dates calculation
  const validPlannedStarts = activities.map(a => a.startDate).filter(Boolean).sort();
  const validPlannedEnds = activities.map(a => a.endDate).filter(Boolean).sort().reverse();
  const minPlannedStart = validPlannedStarts.length > 0 ? validPlannedStarts[0] : (projectInfo.startDate || null);
  const maxPlannedEnd = validPlannedEnds.length > 0 ? validPlannedEnds[0] : null;

  // Actual start and end dates calculation (Actual Dates Log)
  const validActualStarts = activities.map(a => a.actualStartDate).filter(Boolean).sort();
  const validActualEnds = activities.map(a => a.actualEndDate).filter(Boolean).sort().reverse();
  const actualProjStart = validActualStarts.length > 0 ? validActualStarts[0] : null;
  const actualProjEnd = validActualEnds.length > 0 ? validActualEnds[0] : null;

  // Totals & Schedule Variance Status
  const totalMandays = activities.reduce((sum, a) => sum + (parseInt(a.mandays) || 0), 0);
  const activityCount = activities.length;
  const varInfo = calculateVarianceText(maxPlannedEnd, actualProjEnd);

  // Collect assigned PICs across all activities
  const allPicNames = Array.from(new Set(
    activities.map(a => resolvePicNames(a, users)).filter(name => name && name !== '-')
  )).join(', ') || 'Unassigned';

  // -------------------------------------------------------------
  // SHEET 1: PROJECT SUMMARY
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Project Summary', {
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
  });
  
  summarySheet.columns = [
    { key: 'colA', width: 4 },
    { key: 'colB', width: 6 },   // #
    { key: 'colC', width: 28 },  // Activity Name
    { key: 'colD', width: 14 },  // Status
    { key: 'colE', width: 10 },  // Mandays
    { key: 'colF', width: 22 },  // Start Dependency
    { key: 'colG', width: 14 },  // Planned Start
    { key: 'colH', width: 14 },  // Planned End
    { key: 'colI', width: 14 },  // Actual Start
    { key: 'colJ', width: 14 },  // Actual End
    { key: 'colK', width: 20 },  // PIC / Lead
    { key: 'colL', width: 30 }   // Remarks
  ];

  // Title Row
  summarySheet.mergeCells('B2:L2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'PROJECT SCHEDULE SUMMARY REPORT';
  titleCell.font = { name: DESIGN.fontFamily, size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.primaryIndigo } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 42;

  // Executive Metadata Card Layout
  // Row 4: Basic Info
  summarySheet.getCell('B4').value = 'Project Name:';
  summarySheet.getCell('B4').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('C4').value = projectInfo.name || 'Untitled Project';
  summarySheet.mergeCells('C4:E4');

  summarySheet.getCell('G4').value = 'Division:';
  summarySheet.getCell('G4').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('H4').value = divisionName;

  summarySheet.getCell('J4').value = 'Squad:';
  summarySheet.getCell('J4').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('K4').value = squadName;

  // Row 5: Planned Schedule & Metrics
  summarySheet.getCell('B5').value = 'Planned Start:';
  summarySheet.getCell('B5').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('C5').value = minPlannedStart ? format(parseISO(minPlannedStart), 'dd MMM yyyy') : 'TBD';

  summarySheet.getCell('E5').value = 'Target Finish:';
  summarySheet.getCell('E5').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('F5').value = maxPlannedEnd ? format(parseISO(maxPlannedEnd), 'dd MMM yyyy') : 'TBD';

  summarySheet.getCell('H5').value = 'Total Mandays:';
  summarySheet.getCell('H5').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('I5').value = totalMandays;

  summarySheet.getCell('J5').value = 'Activities:';
  summarySheet.getCell('J5').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('K5').value = activityCount;

  // Row 6: Actual Dates Log & Schedule Variance Status
  summarySheet.getCell('B6').value = 'Actual Start:';
  summarySheet.getCell('B6').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('C6').value = actualProjStart ? format(parseISO(actualProjStart), 'dd MMM yyyy') : '-';

  summarySheet.getCell('E6').value = 'Actual Finish:';
  summarySheet.getCell('E6').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('F6').value = actualProjEnd ? format(parseISO(actualProjEnd), 'dd MMM yyyy') : '-';

  summarySheet.getCell('H6').value = 'Schedule Status:';
  summarySheet.getCell('H6').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.mergeCells('I6:J6');
  const statusCell = summarySheet.getCell('I6');
  statusCell.value = varInfo.text;
  statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
  
  if (varInfo.status === 'ON_TRACK') {
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.statusGreenBg } };
    statusCell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: DESIGN.colors.statusGreenTxt } };
  } else if (varInfo.status === 'MINOR_DELAY') {
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.statusAmberBg } };
    statusCell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: DESIGN.colors.statusAmberTxt } };
  } else {
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.statusRedBg } };
    statusCell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: DESIGN.colors.statusRedTxt } };
  }

  // Row 7: PIC & Notes
  summarySheet.getCell('B7').value = 'Assigned PICs:';
  summarySheet.getCell('B7').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('C7').value = allPicNames;
  summarySheet.mergeCells('C7:E7');

  summarySheet.getCell('G7').value = 'Notes:';
  summarySheet.getCell('G7').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  summarySheet.getCell('H7').value = projectInfo.notes || 'None';
  summarySheet.mergeCells('H7:L7');

  for (let r = 4; r <= 7; r++) {
    const row = summarySheet.getRow(r);
    row.height = 20;
    row.eachCell((cell) => {
      if (!cell.font) cell.font = { name: DESIGN.fontFamily, size: 10 };
    });
  }

  // Table Header Row 9
  const tableHeaderRow = 9;
  const headers = [
    '#', 'Activity Name', 'Status', 'Mandays', 'Start Dependency', 
    'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'PIC / Lead', 'Remarks'
  ];

  headers.forEach((h, idx) => {
    const colLetter = String.fromCharCode(66 + idx); // B to L
    const cell = summarySheet.getCell(`${colLetter}${tableHeaderRow}`);
    cell.value = h;
    cell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.mediumSlate } };
    cell.alignment = { vertical: 'middle', horizontal: (idx === 0 || idx === 2 || idx === 3 || (idx >= 5 && idx <= 8)) ? 'center' : 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
      bottom: { style: 'medium', color: { argb: DESIGN.colors.headerBorder } },
      left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
      right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
    };
  });
  summarySheet.getRow(tableHeaderRow).height = 28;

  // Table Data Rows
  let currentRow = 10;
  activities.forEach((act, idx) => {
    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? DESIGN.colors.whiteBg : DESIGN.colors.zebraBg;

    const rowData = [
      idx + 1,
      act.name,
      act.status || 'To Do',
      parseInt(act.mandays) || 0,
      getDependencyText(act, idx),
      act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-',
      act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-',
      act.actualStartDate ? format(parseISO(act.actualStartDate), 'dd MMM yyyy') : '-',
      act.actualEndDate ? format(parseISO(act.actualEndDate), 'dd MMM yyyy') : '-',
      resolvePicNames(act, users),
      act.remarks || '-'
    ];

    rowData.forEach((val, colIdx) => {
      const colLetter = String.fromCharCode(66 + colIdx); // B to L
      const cell = summarySheet.getCell(`${colLetter}${currentRow}`);
      cell.value = val;
      cell.font = { name: DESIGN.fontFamily, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
        bottom: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
        left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
        right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
      };
      cell.alignment = { vertical: 'middle', horizontal: (colIdx === 0 || colIdx === 2 || colIdx === 3 || (colIdx >= 5 && colIdx <= 8)) ? 'center' : 'left' };
    });

    summarySheet.getRow(currentRow).height = 22;
    currentRow++;
  });

  // Totals Row
  const totalRowIndex = currentRow;
  summarySheet.getCell(`B${totalRowIndex}`).value = 'Total';
  summarySheet.getCell(`B${totalRowIndex}`).font = { name: DESIGN.fontFamily, size: 10, bold: true };

  const totMandaysCell = summarySheet.getCell(`E${totalRowIndex}`);
  totMandaysCell.value = { formula: `SUM(E10:E${totalRowIndex - 1})` };
  totMandaysCell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: DESIGN.colors.primaryIndigo } };
  totMandaysCell.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 66; c <= 76; c++) {
    const colLetter = String.fromCharCode(c);
    const cell = summarySheet.getCell(`${colLetter}${totalRowIndex}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.totalsBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: DESIGN.colors.primaryIndigo } },
      bottom: { style: 'double', color: { argb: DESIGN.colors.primaryIndigo } },
      left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
      right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
    };
  }
  summarySheet.getRow(totalRowIndex).height = 26;

  // -------------------------------------------------------------
  // SHEET 2: GANTT TIMELINE CHART (WITH ACTUAL DATES LOG)
  // -------------------------------------------------------------
  const ganttSheet = workbook.addWorksheet('Gantt Timeline Chart', {
    views: [{ state: 'frozen', xSplit: 8, ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
  });

  let minDate = new Date();
  let maxDate = addDays(new Date(), 60);

  const allStarts = [...activities.map(a => a.startDate), ...activities.map(a => a.actualStartDate)].filter(Boolean).sort();
  const allEnds = [...activities.map(a => a.endDate), ...activities.map(a => a.actualEndDate)].filter(Boolean).sort().reverse();
  if (allStarts.length > 0) minDate = parseISO(allStarts[0]);
  if (allEnds.length > 0) maxDate = parseISO(allEnds[0]);

  const calendarStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const calendarEnd = addDays(maxDate, 14);

  const daysRange = [];
  let curr = calendarStart;
  while (curr <= calendarEnd && daysRange.length < 200) {
    daysRange.push(curr);
    curr = addDays(curr, 1);
  }

  // Column widths: Cols 1-8 frozen left columns, 9+ daily timeline
  ganttSheet.getColumn(1).width = 28; // Activity Name
  ganttSheet.getColumn(2).width = 14; // Status
  ganttSheet.getColumn(3).width = 14; // Planned Start
  ganttSheet.getColumn(4).width = 14; // Planned End
  ganttSheet.getColumn(5).width = 14; // Actual Start
  ganttSheet.getColumn(6).width = 14; // Actual End
  ganttSheet.getColumn(7).width = 18; // PIC / Lead
  ganttSheet.getColumn(8).width = 10; // Mandays
  for (let i = 0; i < daysRange.length; i++) {
    ganttSheet.getColumn(9 + i).width = 3.2;
  }

  // Legend at Row 1 (A1:H1)
  ganttSheet.getCell('A1').value = 'GANTT TIMELINE LEGEND:';
  ganttSheet.getCell('A1').font = { name: DESIGN.fontFamily, size: 9, bold: true };
  
  ganttSheet.getCell('C1').value = 'Planned Schedule';
  ganttSheet.getCell('C1').font = { name: DESIGN.fontFamily, size: 8, bold: true, color: { argb: 'FFFFFF' } };
  ganttSheet.getCell('C1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.ganttBarIndigo } };
  ganttSheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };

  ganttSheet.getCell('E1').value = 'Actual Log (Logged)';
  ganttSheet.getCell('E1').font = { name: DESIGN.fontFamily, size: 8, bold: true, color: { argb: 'FFFFFF' } };
  ganttSheet.getCell('E1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.ganttBarActualGreen } };
  ganttSheet.getCell('E1').alignment = { horizontal: 'center', vertical: 'middle' };

  ganttSheet.getCell('G1').value = 'Weekend';
  ganttSheet.getCell('G1').font = { name: DESIGN.fontFamily, size: 8, color: { argb: '64748B' } };
  ganttSheet.getCell('G1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.weekendBg } };
  ganttSheet.getCell('G1').alignment = { horizontal: 'center', vertical: 'middle' };

  ganttSheet.getRow(1).height = 20;

  // Header Rows 2-4 for Table Columns
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(letter => {
    ganttSheet.mergeCells(`${letter}2:${letter}4`);
  });

  const ganttHeaders = [
    'Activity', 'Status', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'PIC / Lead', 'Mandays'
  ];

  ganttHeaders.forEach((label, idx) => {
    const letter = String.fromCharCode(65 + idx); // A to H
    const cell = ganttSheet.getCell(`${letter}2`);
    cell.value = label;
    cell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.mediumSlate } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Month Headers (Row 2 for Timeline)
  let currentMonthStr = '';
  let monthStartCol = 9;

  daysRange.forEach((d, dIdx) => {
    const mStr = format(d, 'MMMM yyyy');
    const colIdx = 9 + dIdx;

    if (mStr !== currentMonthStr) {
      if (currentMonthStr !== '' && colIdx - 1 >= monthStartCol) {
        ganttSheet.mergeCells(2, monthStartCol, 2, colIdx - 1);
        const mCell = ganttSheet.getCell(2, monthStartCol);
        mCell.value = currentMonthStr;
        mCell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: 'FFFFFF' } };
        mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.darkSlate } };
        mCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      currentMonthStr = mStr;
      monthStartCol = colIdx;
    }
  });
  if (monthStartCol <= 8 + daysRange.length) {
    ganttSheet.mergeCells(2, monthStartCol, 2, 8 + daysRange.length);
    const mCell = ganttSheet.getCell(2, monthStartCol);
    mCell.value = currentMonthStr;
    mCell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: 'FFFFFF' } };
    mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.darkSlate } };
    mCell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  // Day Names (Row 3) & Day Numbers (Row 4)
  daysRange.forEach((d, dIdx) => {
    const colIdx = 9 + dIdx;
    const isWknd = !isWorkingDay(d);
    const bg = isWknd ? DESIGN.colors.weekendBg : DESIGN.colors.zebraBg;
    const txtColor = isWknd ? '64748B' : '334155';

    const dayNameCell = ganttSheet.getCell(3, colIdx);
    dayNameCell.value = format(d, 'EEEEEE');
    dayNameCell.font = { name: DESIGN.fontFamily, size: 8, color: { argb: txtColor } };
    dayNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    dayNameCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const dayNumCell = ganttSheet.getCell(4, colIdx);
    dayNumCell.value = parseInt(format(d, 'd'));
    dayNumCell.font = { name: DESIGN.fontFamily, size: 8, bold: true, color: { argb: txtColor } };
    dayNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    dayNumCell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  ganttSheet.getRow(2).height = 20;
  ganttSheet.getRow(3).height = 18;
  ganttSheet.getRow(4).height = 18;

  // Render Gantt Bar Rows
  let gRow = 5;
  activities.forEach((act) => {
    ganttSheet.getCell(gRow, 1).value = act.name;
    ganttSheet.getCell(gRow, 1).font = { name: DESIGN.fontFamily, size: 10 };

    ganttSheet.getCell(gRow, 2).value = act.status || 'To Do';
    ganttSheet.getCell(gRow, 2).font = { name: DESIGN.fontFamily, size: 9 };
    ganttSheet.getCell(gRow, 2).alignment = { horizontal: 'center' };

    ganttSheet.getCell(gRow, 3).value = act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-';
    ganttSheet.getCell(gRow, 3).font = { name: DESIGN.fontFamily, size: 9 };
    ganttSheet.getCell(gRow, 3).alignment = { horizontal: 'center' };

    ganttSheet.getCell(gRow, 4).value = act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-';
    ganttSheet.getCell(gRow, 4).font = { name: DESIGN.fontFamily, size: 9 };
    ganttSheet.getCell(gRow, 4).alignment = { horizontal: 'center' };

    ganttSheet.getCell(gRow, 5).value = act.actualStartDate ? format(parseISO(act.actualStartDate), 'dd MMM yyyy') : '-';
    ganttSheet.getCell(gRow, 5).font = { name: DESIGN.fontFamily, size: 9 };
    ganttSheet.getCell(gRow, 5).alignment = { horizontal: 'center' };

    ganttSheet.getCell(gRow, 6).value = act.actualEndDate ? format(parseISO(act.actualEndDate), 'dd MMM yyyy') : '-';
    ganttSheet.getCell(gRow, 6).font = { name: DESIGN.fontFamily, size: 9 };
    ganttSheet.getCell(gRow, 6).alignment = { horizontal: 'center' };

    ganttSheet.getCell(gRow, 7).value = resolvePicNames(act, users);
    ganttSheet.getCell(gRow, 7).font = { name: DESIGN.fontFamily, size: 9 };

    ganttSheet.getCell(gRow, 8).value = parseInt(act.mandays) || 0;
    ganttSheet.getCell(gRow, 8).font = { name: DESIGN.fontFamily, size: 9, bold: true };
    ganttSheet.getCell(gRow, 8).alignment = { horizontal: 'center' };

    const actStart = act.startDate ? parseISO(act.startDate) : null;
    const actEnd = act.endDate ? parseISO(act.endDate) : null;
    const actActualStart = act.actualStartDate ? parseISO(act.actualStartDate) : null;
    const actActualEnd = act.actualEndDate ? parseISO(act.actualEndDate) : (actActualStart ? actActualStart : null);

    daysRange.forEach((d, dIdx) => {
      const colIdx = 9 + dIdx;
      const cell = ganttSheet.getCell(gRow, colIdx);
      const isWknd = !isWorkingDay(d);

      if (isWknd) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.weekendBg } };
      }

      // Check if day is within Planned range
      const inPlanned = actStart && actEnd && d >= actStart && d <= actEnd;
      // Check if day is within Actual log range
      const inActual = actActualStart && actActualEnd && d >= actActualStart && d <= actActualEnd;

      if (isWorkingDay(d)) {
        if (inActual) {
          // Highlight Actual log in Emerald Green
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.ganttBarActualGreen } };
          
          const midPoint = Math.floor(differenceInDays(actActualEnd, actActualStart) / 2);
          const currentOffset = differenceInDays(d, actActualStart);
          if (currentOffset === midPoint) {
            cell.value = `Act`;
            cell.font = { name: DESIGN.fontFamily, size: 8, bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        } else if (inPlanned) {
          // Highlight Planned in Indigo
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.ganttBarIndigo } };
          
          const midPoint = Math.floor(differenceInDays(actEnd, actStart) / 2);
          const currentOffset = differenceInDays(d, actStart);
          if (currentOffset === midPoint) {
            cell.value = `${act.mandays}d`;
            cell.font = { name: DESIGN.fontFamily, size: 8, bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }
      }
    });

    ganttSheet.getRow(gRow).height = 20;
    gRow++;
  });

  // Write workbook & trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${projectInfo.name || 'Project'}_Schedule.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// -------------------------------------------------------------
// BATCH EXPORT (COMPILED DIVISION RKA & MASTER OVERVIEW)
// -------------------------------------------------------------
export const exportBatchSummaryToExcel = async ({
  projectsData,
  filterDivisionName = 'All Divisions',
  filterSquadName = 'All Squads',
  includeMilestones = true,
  exportMode = 'COMPILED_RKA'
}) => {
  const workbook = new ExcelJS.Workbook();

  // -------------------------------------------------------------
  // TAB 1: MASTER DIVISION EXECUTIVE OVERVIEW (FIRST SHEET)
  // -------------------------------------------------------------
  const masterSheet = workbook.addWorksheet('Master Division Overview', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }],
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
  });

  masterSheet.columns = [
    { key: 'colA', width: 4 },
    { key: 'colB', width: 6 },   // #
    { key: 'colC', width: 30 },  // Project Name
    { key: 'colD', width: 18 },  // Division
    { key: 'colE', width: 18 },  // Squad
    { key: 'colF', width: 14 },  // Planned Start
    { key: 'colG', width: 14 },  // Target Finish
    { key: 'colH', width: 14 },  // Actual Start
    { key: 'colI', width: 14 },  // Actual Finish
    { key: 'colJ', width: 18 },  // Schedule Status / Variance
    { key: 'colK', width: 12 },  // Mandays
    { key: 'colL', width: 12 },  // Activities
    { key: 'colM', width: 28 },  // Assigned PICs
    { key: 'colN', width: 30 }   // Notes
  ];

  // Executive Banner Header
  masterSheet.mergeCells('B2:N2');
  const masterTitle = masterSheet.getCell('B2');
  masterTitle.value = 'DIVISION INCEPTION MASTER EXECUTIVE OVERVIEW';
  masterTitle.font = { name: DESIGN.fontFamily, size: 16, bold: true, color: { argb: 'FFFFFF' } };
  masterTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.primaryIndigo } };
  masterTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  masterSheet.getRow(2).height = 42;

  // Metadata Card Block
  masterSheet.getCell('B4').value = 'Division Filter:';
  masterSheet.getCell('B4').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  masterSheet.getCell('C4').value = filterDivisionName;

  masterSheet.getCell('E4').value = 'Squad Filter:';
  masterSheet.getCell('E4').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  masterSheet.getCell('F4').value = filterSquadName;

  masterSheet.getCell('I4').value = 'Export Date:';
  masterSheet.getCell('I4').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  masterSheet.getCell('J4').value = format(new Date(), 'dd MMM yyyy HH:mm');

  masterSheet.getCell('B5').value = 'Total Inceptions:';
  masterSheet.getCell('B5').font = { name: DESIGN.fontFamily, bold: true, size: 10 };
  masterSheet.getCell('C5').value = projectsData.length;

  for (let r = 4; r <= 5; r++) {
    const row = masterSheet.getRow(r);
    row.height = 20;
    row.eachCell(cell => {
      if (!cell.font) cell.font = { name: DESIGN.fontFamily, size: 10 };
    });
  }

  // Table Headers (Row 7)
  const masterHeaders = [
    '#', 'Project Name', 'Division', 'Squad', 
    'Planned Start', 'Target End', 'Actual Start', 'Actual End', 'Schedule Status',
    'Total Mandays', 'Activities', 'Assigned PICs', 'Notes'
  ];

  masterHeaders.forEach((h, idx) => {
    const colLetter = String.fromCharCode(66 + idx); // B to N
    const cell = masterSheet.getCell(`${colLetter}7`);
    cell.value = h;
    cell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.darkSlate } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 || (idx >= 8 && idx <= 10) ? 'center' : 'left' };
    cell.border = {
      top: { style: 'medium', color: { argb: DESIGN.colors.headerBorder } },
      bottom: { style: 'medium', color: { argb: DESIGN.colors.headerBorder } },
      left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
      right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
    };
  });
  masterSheet.getRow(7).height = 28;

  // Master Data Rows
  let masterRow = 8;
  projectsData.forEach((proj, idx) => {
    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? DESIGN.colors.whiteBg : DESIGN.colors.zebraBg;

    // Collect distinct PICs across activities
    const pics = Array.from(new Set(
      (proj.activities || []).map(a => a.pic).filter(Boolean)
    )).join(', ');

    const varInfo = calculateVarianceText(proj.plannedEndDate, proj.actualEndDate);

    const rowValues = [
      idx + 1,
      proj.name,
      proj.divisionName,
      proj.squadName,
      proj.plannedStartDate ? format(parseISO(proj.plannedStartDate), 'dd MMM yyyy') : '-',
      proj.plannedEndDate ? format(parseISO(proj.plannedEndDate), 'dd MMM yyyy') : '-',
      proj.actualStartDate ? format(parseISO(proj.actualStartDate), 'dd MMM yyyy') : '-',
      proj.actualEndDate ? format(parseISO(proj.actualEndDate), 'dd MMM yyyy') : '-',
      varInfo.text,
      proj.totalMandays,
      proj.activityCount,
      pics || 'Unassigned',
      proj.notes || ''
    ];

    rowValues.forEach((val, colIdx) => {
      const colLetter = String.fromCharCode(66 + colIdx); // B to N
      const cell = masterSheet.getCell(`${colLetter}${masterRow}`);
      cell.value = val;
      cell.font = { name: DESIGN.fontFamily, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
        bottom: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
        left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
        right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
      };

      // Alignment
      if (colIdx === 0 || (colIdx >= 8 && colIdx <= 10)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Schedule Variance Cell Styling
      if (colIdx === 8) {
        if (varInfo.status === 'ON_TRACK') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.statusGreenBg } };
          cell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: DESIGN.colors.statusGreenTxt } };
        } else if (varInfo.status === 'MINOR_DELAY') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.statusAmberBg } };
          cell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: DESIGN.colors.statusAmberTxt } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.statusRedBg } };
          cell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: DESIGN.colors.statusRedTxt } };
        }
      }
    });

    masterSheet.getRow(masterRow).height = 24;
    masterRow++;
  });

  // Master Totals Row
  const masterTotRow = masterRow;
  masterSheet.getCell(`C${masterTotRow}`).value = 'TOTAL';
  masterSheet.getCell(`C${masterTotRow}`).font = { name: DESIGN.fontFamily, size: 10, bold: true };
  masterSheet.getCell(`C${masterTotRow}`).alignment = { vertical: 'middle', horizontal: 'right' };

  const totMandaysCell = masterSheet.getCell(`K${masterTotRow}`);
  totMandaysCell.value = { formula: `SUM(K8:K${masterTotRow - 1})` };
  totMandaysCell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: DESIGN.colors.primaryIndigo } };
  totMandaysCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const totActsCell = masterSheet.getCell(`L${masterTotRow}`);
  totActsCell.value = { formula: `SUM(L8:L${masterTotRow - 1})` };
  totActsCell.font = { name: DESIGN.fontFamily, size: 10, bold: true };
  totActsCell.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 66; c <= 78; c++) {
    const colLetter = String.fromCharCode(c);
    const cell = masterSheet.getCell(`${colLetter}${masterTotRow}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.totalsBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: DESIGN.colors.primaryIndigo } },
      bottom: { style: 'double', color: { argb: DESIGN.colors.primaryIndigo } },
      left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
      right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
    };
  }
  masterSheet.getRow(masterTotRow).height = 26;

  // -------------------------------------------------------------
  // SQUAD PAIRED TABS ({Squad Name} Summary & Gantt {Squad Name})
  // -------------------------------------------------------------
  const squadGroups = new Map();
  projectsData.forEach(proj => {
    const sqKey = proj.squadName || 'Unassigned Squad';
    if (!squadGroups.has(sqKey)) squadGroups.set(sqKey, []);
    squadGroups.get(sqKey).push(proj);
  });

  squadGroups.forEach((squadProjects, squadName) => {
    const cleanSquadName = squadName.replace(/[\\/*?:[\]]/g, '').substring(0, 24);
    
    // TAB: {Squad Name} Summary
    const summarySheetName = `${cleanSquadName} Summary`.substring(0, 30);
    const summarySheet = workbook.addWorksheet(summarySheetName, {
      pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
    });

    summarySheet.columns = [
      { key: 'colA', width: 4 },
      { key: 'colB', width: 6 },   // #
      { key: 'colC', width: 30 },  // Activity Name
      { key: 'colD', width: 10 },  // Mandays
      { key: 'colE', width: 22 },  // Start Dependency
      { key: 'colF', width: 14 },  // Planned Start
      { key: 'colG', width: 14 },  // Planned End
      { key: 'colH', width: 14 },  // Actual Start
      { key: 'colI', width: 14 },  // Actual End
      { key: 'colJ', width: 18 },  // PIC / Lead
      { key: 'colK', width: 32 }   // Remarks
    ];

    let baseRow = 2;
    squadProjects.forEach((proj) => {
      // Banner Header
      summarySheet.mergeCells(`B${baseRow}:K${baseRow}`);
      const titleCell = summarySheet.getCell(`B${baseRow}`);
      titleCell.value = 'PROJECT SCHEDULE SUMMARY REPORT';
      titleCell.font = { name: DESIGN.fontFamily, size: 14, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.primaryIndigo } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      summarySheet.getRow(baseRow).height = 36;

      // Metadata Card
      const rName = baseRow + 2;
      summarySheet.getCell(`B${rName}`).value = 'Project Name:';
      summarySheet.getCell(`B${rName}`).font = { name: DESIGN.fontFamily, bold: true, size: 10 };
      summarySheet.getCell(`C${rName}`).value = proj.name;
      summarySheet.mergeCells(`C${rName}:E${rName}`);

      summarySheet.getCell(`G${rName}`).value = 'Start Date:';
      summarySheet.getCell(`G${rName}`).font = { name: DESIGN.fontFamily, bold: true, size: 10 };
      summarySheet.getCell(`H${rName}`).value = proj.plannedStartDate ? format(parseISO(proj.plannedStartDate), 'dd MMM yyyy') : 'TBD';

      const rDiv = baseRow + 3;
      summarySheet.getCell(`B${rDiv}`).value = 'Division:';
      summarySheet.getCell(`B${rDiv}`).font = { name: DESIGN.fontFamily, bold: true, size: 10 };
      summarySheet.getCell(`C${rDiv}`).value = proj.divisionName;

      summarySheet.getCell(`G${rDiv}`).value = 'Squad:';
      summarySheet.getCell(`G${rDiv}`).font = { name: DESIGN.fontFamily, bold: true, size: 10 };
      summarySheet.getCell(`H${rDiv}`).value = proj.squadName;

      const rNotes = baseRow + 4;
      summarySheet.getCell(`B${rNotes}`).value = 'Notes:';
      summarySheet.getCell(`B${rNotes}`).font = { name: DESIGN.fontFamily, bold: true, size: 10 };
      summarySheet.getCell(`C${rNotes}`).value = proj.notes || 'None';
      summarySheet.mergeCells(`C${rNotes}:K${rNotes}`);

      for (let r = rName; r <= rNotes; r++) {
        const row = summarySheet.getRow(r);
        row.height = 20;
        row.eachCell(cell => {
          if (!cell.font) cell.font = { name: DESIGN.fontFamily, size: 10 };
        });
      }

      // Activity Table Header
      const tableHeaderRow = baseRow + 6;
      const headers = [
        '#', 'Activity Name', 'Mandays', 'Start Dependency', 
        'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'PIC / Lead', 'Remarks'
      ];

      headers.forEach((h, idx) => {
        const colLetter = String.fromCharCode(66 + idx); // B to K
        const cell = summarySheet.getCell(`${colLetter}${tableHeaderRow}`);
        cell.value = h;
        cell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.mediumSlate } };
        cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 2 ? 'center' : 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
          bottom: { style: 'medium', color: { argb: DESIGN.colors.headerBorder } },
          left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
          right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
        };
      });
      summarySheet.getRow(tableHeaderRow).height = 25;

      // Data Rows
      let actStartRow = tableHeaderRow + 1;
      let actCurrentRow = actStartRow;

      (proj.activities || []).forEach((act, idx) => {
        const isEven = idx % 2 === 0;
        const bgArgb = isEven ? DESIGN.colors.whiteBg : DESIGN.colors.zebraBg;

        const rowVals = [
          idx + 1,
          act.name,
          parseInt(act.mandays) || 0,
          getDependencyText(act, idx),
          act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-',
          act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-',
          act.actualStartDate ? format(parseISO(act.actualStartDate), 'dd MMM yyyy') : '-',
          act.actualEndDate ? format(parseISO(act.actualEndDate), 'dd MMM yyyy') : '-',
          act.pic || '-',
          act.remarks || '-'
        ];

        rowVals.forEach((val, colIdx) => {
          const colLetter = String.fromCharCode(66 + colIdx);
          const cell = summarySheet.getCell(`${colLetter}${actCurrentRow}`);
          cell.value = val;
          cell.font = { name: DESIGN.fontFamily, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
          cell.border = {
            top: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
            bottom: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
            left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
            right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
          };
          cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 || colIdx === 2 ? 'center' : 'left' };
        });
        summarySheet.getRow(actCurrentRow).height = 20;
        actCurrentRow++;
      });

      // Totals Row
      const totRow = actCurrentRow;
      summarySheet.getCell(`B${totRow}`).value = 'Total';
      summarySheet.getCell(`B${totRow}`).font = { name: DESIGN.fontFamily, size: 10, bold: true };

      const totMandaysCell = summarySheet.getCell(`D${totRow}`);
      totMandaysCell.value = { formula: `SUM(D${actStartRow}:D${totRow - 1})` };
      totMandaysCell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: DESIGN.colors.primaryIndigo } };
      totMandaysCell.alignment = { vertical: 'middle', horizontal: 'center' };

      for (let c = 66; c <= 75; c++) {
        const colLetter = String.fromCharCode(c);
        const cell = summarySheet.getCell(`${colLetter}${totRow}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.totalsBg } };
        cell.border = {
          top: { style: 'medium', color: { argb: DESIGN.colors.primaryIndigo } },
          bottom: { style: 'double', color: { argb: DESIGN.colors.primaryIndigo } },
          left: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } },
          right: { style: 'thin', color: { argb: DESIGN.colors.lightBorder } }
        };
      }

      baseRow = totRow + 3;
    });

    // TAB: Gantt {Squad Name}
    const ganttSheetName = `Gantt ${cleanSquadName}`.substring(0, 30);
    const ganttSheet = workbook.addWorksheet(ganttSheetName, {
      views: [{ state: 'frozen', xSplit: 5, ySplit: 4 }],
      pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
    });

    let allActivities = [];
    squadProjects.forEach(p => {
      allActivities = allActivities.concat(p.activities || []);
    });

    let minDate = new Date();
    let maxDate = addDays(new Date(), 90);

    const validStartDates = allActivities.map(a => a.startDate).filter(Boolean).sort();
    const validEndDates = allActivities.map(a => a.endDate).filter(Boolean).sort().reverse();

    if (validStartDates.length > 0) minDate = parseISO(validStartDates[0]);
    if (validEndDates.length > 0) maxDate = parseISO(validEndDates[0]);

    const calendarStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const calendarEnd = addDays(maxDate, 14);

    const daysRange = [];
    let curr = calendarStart;
    while (curr <= calendarEnd && daysRange.length < 200) {
      daysRange.push(curr);
      curr = addDays(curr, 1);
    }

    ganttSheet.getColumn(1).width = 28;
    ganttSheet.getColumn(2).width = 14;
    ganttSheet.getColumn(3).width = 14;
    ganttSheet.getColumn(4).width = 16;
    ganttSheet.getColumn(5).width = 10;
    for (let i = 0; i < daysRange.length; i++) {
      ganttSheet.getColumn(6 + i).width = 3.2;
    }

    ganttSheet.mergeCells('A2:A4');
    ganttSheet.mergeCells('B2:B4');
    ganttSheet.mergeCells('C2:C4');
    ganttSheet.mergeCells('D2:D4');
    ganttSheet.mergeCells('E2:E4');

    ['Activity', 'Start Date', 'End Date', 'PIC / Lead', 'Mandays'].forEach((label, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const cell = ganttSheet.getCell(`${letter}2`);
      cell.value = label;
      cell.font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.mediumSlate } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Month Headers (Row 2)
    let currentMonthStr = '';
    let monthStartCol = 6;

    daysRange.forEach((d, dIdx) => {
      const mStr = format(d, 'MMMM yyyy');
      const colIdx = 6 + dIdx;

      if (mStr !== currentMonthStr) {
        if (currentMonthStr !== '' && colIdx - 1 >= monthStartCol) {
          ganttSheet.mergeCells(2, monthStartCol, 2, colIdx - 1);
          const mCell = ganttSheet.getCell(2, monthStartCol);
          mCell.value = currentMonthStr;
          mCell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: 'FFFFFF' } };
          mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.darkSlate } };
          mCell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        currentMonthStr = mStr;
        monthStartCol = colIdx;
      }
    });
    if (monthStartCol <= 5 + daysRange.length) {
      ganttSheet.mergeCells(2, monthStartCol, 2, 5 + daysRange.length);
      const mCell = ganttSheet.getCell(2, monthStartCol);
      mCell.value = currentMonthStr;
      mCell.font = { name: DESIGN.fontFamily, size: 9, bold: true, color: { argb: 'FFFFFF' } };
      mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.darkSlate } };
      mCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Day Names (Row 3) & Numbers (Row 4)
    daysRange.forEach((d, dIdx) => {
      const colIdx = 6 + dIdx;
      const isWknd = !isWorkingDay(d);
      const bg = isWknd ? DESIGN.colors.weekendBg : DESIGN.colors.zebraBg;
      const txtColor = isWknd ? '64748B' : '334155';

      const dayNameCell = ganttSheet.getCell(3, colIdx);
      dayNameCell.value = format(d, 'EEEEEE');
      dayNameCell.font = { name: DESIGN.fontFamily, size: 8, color: { argb: txtColor } };
      dayNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      dayNameCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const dayNumCell = ganttSheet.getCell(4, colIdx);
      dayNumCell.value = parseInt(format(d, 'd'));
      dayNumCell.font = { name: DESIGN.fontFamily, size: 8, bold: true, color: { argb: txtColor } };
      dayNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      dayNumCell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    ganttSheet.getRow(2).height = 20;
    ganttSheet.getRow(3).height = 18;
    ganttSheet.getRow(4).height = 18;

    let ganttCurrentRow = 5;

    squadProjects.forEach((proj) => {
      ganttSheet.getCell(ganttCurrentRow, 1).value = `PROJECT: ${proj.name.toUpperCase()}`;
      ganttSheet.getCell(ganttCurrentRow, 1).font = { name: DESIGN.fontFamily, size: 10, bold: true, color: { argb: DESIGN.colors.primaryIndigo } };
      ganttSheet.getRow(ganttCurrentRow).height = 22;
      ganttCurrentRow++;

      (proj.activities || []).forEach((act) => {
        const actRow = ganttCurrentRow;
        ganttSheet.getCell(actRow, 1).value = act.name;
        ganttSheet.getCell(actRow, 1).font = { name: DESIGN.fontFamily, size: 10 };

        ganttSheet.getCell(actRow, 2).value = act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-';
        ganttSheet.getCell(actRow, 2).font = { name: DESIGN.fontFamily, size: 9 };
        ganttSheet.getCell(actRow, 2).alignment = { horizontal: 'center' };

        ganttSheet.getCell(actRow, 3).value = act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-';
        ganttSheet.getCell(actRow, 3).font = { name: DESIGN.fontFamily, size: 9 };
        ganttSheet.getCell(actRow, 3).alignment = { horizontal: 'center' };

        ganttSheet.getCell(actRow, 4).value = act.pic || '-';
        ganttSheet.getCell(actRow, 4).font = { name: DESIGN.fontFamily, size: 9 };

        ganttSheet.getCell(actRow, 5).value = parseInt(act.mandays) || 0;
        ganttSheet.getCell(actRow, 5).font = { name: DESIGN.fontFamily, size: 9, bold: true };
        ganttSheet.getCell(actRow, 5).alignment = { horizontal: 'center' };

        const actStart = act.startDate ? parseISO(act.startDate) : null;
        const actEnd = act.endDate ? parseISO(act.endDate) : null;

        daysRange.forEach((d, dIdx) => {
          const colIdx = 6 + dIdx;
          const cell = ganttSheet.getCell(actRow, colIdx);
          const isWknd = !isWorkingDay(d);

          if (isWknd) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.weekendBg } };
          }

          if (actStart && actEnd && d >= actStart && d <= actEnd) {
            if (isWorkingDay(d)) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.ganttBarIndigo } };
              
              const midPoint = Math.floor(differenceInDays(actEnd, actStart) / 2);
              const currentOffset = differenceInDays(d, actStart);
              if (currentOffset === midPoint) {
                cell.value = `${act.mandays}d`;
                cell.font = { name: DESIGN.fontFamily, size: 8, bold: true, color: { argb: 'FFFFFF' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              }
            }
          }
        });

        ganttSheet.getRow(actRow).height = 20;
        ganttCurrentRow++;
      });

      ganttCurrentRow++; // Blank row spacing
    });
  });

  // -------------------------------------------------------------
  // WRITE AND DOWNLOAD WORKBOOK
  // -------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Compiled_Divisi_RKA_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
