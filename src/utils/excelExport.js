import ExcelJS from 'exceljs';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { isHoliday, isWorkingDay } from './dateCalculations';

export const exportProjectToExcel = async (projectInfo, activities, divisions, squads) => {
  const workbook = new ExcelJS.Workbook();
  
  const divisionName = divisions?.find(d => d.id === projectInfo.divisionId)?.name || 'Unassigned';
  const squadName = squads?.find(s => s.id === projectInfo.squadId)?.name || 'Unassigned';

  // -------------------------------------------------------------
  // SHEET 1: PROJECT SUMMARY
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Project Summary');
  
  // Set column widths
  summarySheet.columns = [
    { key: 'colA', width: 5 },
    { key: 'colB', width: 25 },
    { key: 'colC', width: 15 },
    { key: 'colD', width: 25 },
    { key: 'colE', width: 15 },
    { key: 'colF', width: 15 },
    { key: 'colG', width: 35 }
  ];

  // Title Row
  summarySheet.mergeCells('B2:G2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'PROJECT SCHEDULE SUMMARY REPORT';
  titleCell.font = { name: 'Outfit', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F46E5' } // Indigo primary
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 40;

  // Metadata Card Layout
  summarySheet.getCell('B4').value = 'Project Name:';
  summarySheet.getCell('B4').font = { name: 'Outfit', bold: true };
  summarySheet.getCell('C4').value = projectInfo.name || 'Untitled Project';

  summarySheet.getCell('E4').value = 'Start Date:';
  summarySheet.getCell('E4').font = { name: 'Outfit', bold: true };
  summarySheet.getCell('F4').value = projectInfo.startDate ? format(parseISO(projectInfo.startDate), 'dd MMM yyyy') : 'TBD';

  summarySheet.getCell('B5').value = 'Division:';
  summarySheet.getCell('B5').font = { name: 'Outfit', bold: true };
  summarySheet.getCell('C5').value = divisionName;

  summarySheet.getCell('E5').value = 'Squad:';
  summarySheet.getCell('E5').font = { name: 'Outfit', bold: true };
  summarySheet.getCell('F5').value = squadName;

  summarySheet.getCell('B6').value = 'Notes:';
  summarySheet.getCell('B6').font = { name: 'Outfit', bold: true };
  summarySheet.getCell('C6').value = projectInfo.notes || 'None';
  summarySheet.mergeCells('C6:G6');

  // Borders and backgrounds for metadata rows
  for (let r = 4; r <= 6; r++) {
    const row = summarySheet.getRow(r);
    row.height = 20;
    row.eachCell((cell) => {
      cell.font = cell.font || { name: 'Outfit', size: 10 };
    });
  }

  // Activity Table Header
  const tableHeaderRow = 8;
  const headers = ['#', 'Activity Name', 'Mandays', 'Start Dependency', 'Start Date', 'End Date', 'Remarks'];
  headers.forEach((h, idx) => {
    const colLetter = String.fromCharCode(66 + idx); // B to H
    const cell = summarySheet.getCell(`${colLetter}${tableHeaderRow}`);
    cell.value = h;
    cell.font = { name: 'Outfit', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '334155' } // slate secondary
    };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 2 ? 'center' : 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { argb: '94A3B8' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    };
  });
  summarySheet.getRow(tableHeaderRow).height = 25;

  // Activity Table Data
  let currentRow = 9;
  activities.forEach((act, idx) => {
    const rowData = [
      idx + 1,
      act.name,
      act.mandays,
      getDependencyText(act, idx),
      act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-',
      act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-',
      act.remarks || '-'
    ];

    rowData.forEach((val, colIdx) => {
      const colLetter = String.fromCharCode(66 + colIdx); // B to H
      const cell = summarySheet.getCell(`${colLetter}${currentRow}`);
      cell.value = val;
      cell.font = { name: 'Outfit', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 || colIdx === 2 ? 'center' : 'left' };
      
      // Highlight end date in soft blue
      if (colIdx === 5) {
        cell.font = { name: 'Outfit', size: 10, bold: true, color: { argb: '4F46E5' } };
      }
    });

    // Zebra striping
    if (idx % 2 === 1) {
      for (let colIdx = 0; colIdx < 7; colIdx++) {
        const colLetter = String.fromCharCode(66 + colIdx);
        summarySheet.getCell(`${colLetter}${currentRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8FAFC' }
        };
      }
    }
    summarySheet.getRow(currentRow).height = 22;
    currentRow++;
  });

  // Total Summary Row
  summarySheet.getCell(`B${currentRow}`).value = 'Total';
  summarySheet.getCell(`B${currentRow}`).font = { name: 'Outfit', size: 10, bold: true };
  summarySheet.getCell(`D${currentRow}`).value = `=SUM(D9:D${currentRow - 1})`;
  summarySheet.getCell(`D${currentRow}`).font = { name: 'Outfit', size: 10, bold: true };
  summarySheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center' };
  
  // Apply borders for total row
  for (let colIdx = 0; colIdx < 7; colIdx++) {
    const colLetter = String.fromCharCode(66 + colIdx);
    const cell = summarySheet.getCell(`${colLetter}${currentRow}`);
    cell.border = {
      top: { style: 'thin', color: { argb: '94A3B8' } },
      bottom: { style: 'double', color: { argb: '64748B' } }
    };
  }
  summarySheet.getRow(currentRow).height = 24;

  // -------------------------------------------------------------
  // SHEET 2: TIMELINE VISUALIZATION (GANTT CHART)
  // -------------------------------------------------------------
  const ganttSheet = workbook.addWorksheet('Timeline Gantt');
  
  const validActs = activities.filter(a => a.startDate && a.endDate);
  if (validActs.length > 0) {
    let minDate = parseISO(validActs[0].startDate);
    let maxDate = parseISO(validActs[0].endDate);

    validActs.forEach(act => {
      const start = parseISO(act.startDate);
      const end = parseISO(act.endDate);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    // Add padding
    minDate = addDays(minDate, -2);
    maxDate = addDays(maxDate, 4);

    const totalDays = differenceInDays(maxDate, minDate) + 1;
    
    // Column widths: Activity details (A-D) + Dates (E onwards)
    ganttSheet.getColumn(1).width = 25; // Activity Name
    ganttSheet.getColumn(2).width = 15; // Start Date
    ganttSheet.getColumn(3).width = 15; // End Date
    ganttSheet.getColumn(4).width = 10; // Mandays
    
    for (let d = 0; d < totalDays; d++) {
      ganttSheet.getColumn(5 + d).width = 4.5; // Narrow daily grid columns
    }

    // Render Headers (Row 2, 3, & 4)
    ganttSheet.getRow(2).height = 24; // Month row
    ganttSheet.getRow(3).height = 18; // Weekday row
    ganttSheet.getRow(4).height = 18; // Day number row

    ganttSheet.getCell('A2').value = 'Activity';
    ganttSheet.getCell('B2').value = 'Start Date';
    ganttSheet.getCell('C2').value = 'End Date';
    ganttSheet.getCell('D2').value = 'Mandays';
    
    // Merge cell headers for A2:D4 (across 3 rows)
    ganttSheet.mergeCells('A2:A4');
    ganttSheet.mergeCells('B2:B4');
    ganttSheet.mergeCells('C2:C4');
    ganttSheet.mergeCells('D2:D4');

    // Style left headers
    ['A2', 'B2', 'C2', 'D2'].forEach(cellRef => {
      const cell = ganttSheet.getCell(cellRef);
      cell.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Since it's merged down to row 4, apply borders to the whole merged range
      const colLetter = cellRef[0];
      for (let r = 2; r <= 4; r++) {
        ganttSheet.getCell(`${colLetter}${r}`).border = {
          top: r === 2 ? { style: 'thin', color: { argb: '94A3B8' } } : undefined,
          bottom: r === 4 ? { style: 'medium', color: { argb: '94A3B8' } } : undefined,
          left: { style: 'thin', color: { argb: '94A3B8' } },
          right: { style: 'thin', color: { argb: '94A3B8' } }
        };
      }
    });

    // Track month spans for merging in Row 2
    const monthSpans = [];
    let currentMonthStr = '';
    let currentStartCol = 5;

    for (let d = 0; d < totalDays; d++) {
      const colIdx = 5 + d;
      const current = addDays(minDate, d);
      const monthYear = format(current, 'MMMM yyyy'); // e.g. "July 2026"
      
      if (d === 0) {
        currentMonthStr = monthYear;
      } else if (monthYear !== currentMonthStr) {
        monthSpans.push({
          label: currentMonthStr,
          startCol: currentStartCol,
          endCol: colIdx - 1
        });
        currentMonthStr = monthYear;
        currentStartCol = colIdx;
      }

      if (d === totalDays - 1) {
        monthSpans.push({
          label: currentMonthStr,
          startCol: currentStartCol,
          endCol: colIdx
        });
      }
    }

    // Merge and style Month Cells in Row 2
    monthSpans.forEach(span => {
      if (span.startCol === span.endCol) {
        const cell = ganttSheet.getCell(2, span.startCol);
        cell.value = span.label;
        cell.font = { name: 'Outfit', size: 9, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } }; // Darker slate
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: '94A3B8' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: '94A3B8' } },
          right: { style: 'thin', color: { argb: '94A3B8' } }
        };
      } else {
        const startCellRef = ganttSheet.getCell(2, span.startCol).address;
        const endCellRef = ganttSheet.getCell(2, span.endCol).address;
        ganttSheet.mergeCells(`${startCellRef}:${endCellRef}`);
        
        const cell = ganttSheet.getCell(2, span.startCol);
        cell.value = span.label;
        cell.font = { name: 'Outfit', size: 9, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        
        for (let c = span.startCol; c <= span.endCol; c++) {
          const borderCell = ganttSheet.getCell(2, c);
          borderCell.border = {
            top: { style: 'thin', color: { argb: '94A3B8' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: c === span.startCol ? { style: 'thin', color: { argb: '94A3B8' } } : undefined,
            right: c === span.endCol ? { style: 'thin', color: { argb: '94A3B8' } } : undefined
          };
        }
      }
    });

    // Populate header dates (Row 3 for Weekday, Row 4 for Day number)
    for (let d = 0; d < totalDays; d++) {
      const colIdx = 5 + d;
      const current = addDays(minDate, d);
      
      const dayLetterCell = ganttSheet.getCell(3, colIdx);
      dayLetterCell.value = format(current, 'EE').substring(0, 2); // SU, MO, TU...
      dayLetterCell.font = { name: 'Outfit', size: 8, color: { argb: '475569' } };
      dayLetterCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const dayNumberCell = ganttSheet.getCell(4, colIdx);
      dayNumberCell.value = parseInt(format(current, 'd'));
      dayNumberCell.font = { name: 'Outfit', size: 9, bold: true };
      dayNumberCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Shade weekends and holidays in headers
      const isWeekend = !isWorkingDay(current) && !isHoliday(current);
      const isHol = isHoliday(current);
      let headerBg = 'F8FAFC';
      let headerFontColor = '000000';
      
      if (isWeekend) {
        headerBg = 'E2E8F0';
        headerFontColor = '64748B';
      } else if (isHol) {
        headerBg = 'FEE2E2';
        headerFontColor = 'EF4444';
      }

      dayLetterCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      dayNumberCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      if (isWeekend || isHol) {
        dayLetterCell.font = { name: 'Outfit', size: 8, color: { argb: headerFontColor } };
        dayNumberCell.font = { name: 'Outfit', size: 9, bold: true, color: { argb: headerFontColor } };
      }

      dayLetterCell.border = { 
        top: { style: 'thin', color: { argb: 'E2E8F0' } }, 
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } }, 
        right: { style: 'thin', color: { argb: 'E2E8F0' } } 
      };
      dayNumberCell.border = { 
        bottom: { style: 'medium', color: { argb: '94A3B8' } }, 
        left: { style: 'thin', color: { argb: 'E2E8F0' } }, 
        right: { style: 'thin', color: { argb: 'E2E8F0' } } 
      };
    }

    // Populate Activity rows with Gantt bars
    let gRow = 5; // Row 5 is the first data row
    validActs.forEach((act) => {
      ganttSheet.getRow(gRow).height = 24;
      
      ganttSheet.getCell(`A${gRow}`).value = act.name;
      ganttSheet.getCell(`B${gRow}`).value = format(parseISO(act.startDate), 'dd MMM yyyy');
      ganttSheet.getCell(`C${gRow}`).value = format(parseISO(act.endDate), 'dd MMM yyyy');
      ganttSheet.getCell(`D${gRow}`).value = act.mandays;

      // Formatting details cells
      ['A', 'B', 'C', 'D'].forEach(col => {
        const cell = ganttSheet.getCell(`${col}${gRow}`);
        cell.font = { name: 'Outfit', size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: col === 'D' ? 'center' : 'left' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      const actStart = parseISO(act.startDate);
      const actEnd = parseISO(act.endDate);

      // Color the daily columns
      for (let d = 0; d < totalDays; d++) {
        const colIdx = 5 + d;
        const current = addDays(minDate, d);
        const cell = ganttSheet.getCell(gRow, colIdx);
        
        const isWeekend = !isWorkingDay(current) && !isHoliday(current);
        const isHol = isHoliday(current);
        
        let cellBg = 'FFFFFF';
        if (isWeekend) cellBg = 'F8FAFC';
        else if (isHol) cellBg = 'FFF5F5';
        
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellBg } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'F1F5F9' } },
          right: { style: 'thin', color: { argb: 'F1F5F9' } }
        };

        // If inside the activity duration, shade it as the Gantt bar (indigo)
        if (current >= actStart && current <= actEnd) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '818CF8' } // Soft indigo
          };
          
          cell.border = {
            top: { style: 'thin', color: { argb: '6366F1' } },
            bottom: { style: 'thin', color: { argb: '6366F1' } },
            left: { style: 'thin', color: { argb: '6366F1' } },
            right: { style: 'thin', color: { argb: '6366F1' } }
          };
          
          // Draw duration label inside the bar cell at midpoint
          const midPoint = Math.floor(differenceInDays(actEnd, actStart) / 2);
          const currentOffset = differenceInDays(current, actStart);
          if (currentOffset === midPoint) {
            cell.value = `${act.mandays}d`;
            cell.font = { name: 'Outfit', size: 8, bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }
      }

      gRow++;
    });
  }

  // -------------------------------------------------------------
  // EXPORT AND DOWNLOAD WORKBOOK
  // -------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${projectInfo.name || 'Project'}_Schedule.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// Helper function to match dependency texts in excel
const getDependencyText = (act, index) => {
  if (index === 0 || act.startMode === 'project_start') return 'Project Start Date';
  if (act.startMode === 'after_prev') return 'After Previous Ends';
  if (act.startMode === 'parallel_prev') return 'Same Time as Previous';
  if (act.startMode === 'offset_prev') return `${act.offset || 0} days after previous`;
  if (act.startMode === 'manual') return 'Manual Specific Date';
  return '';
};

export const exportBatchSummaryToExcel = async ({
  projectsData,
  filterDivisionName = 'All Divisions',
  filterSquadName = 'All Squads',
  includeMilestones = true,
  exportMode = 'COMPILED_RKA' // 'COMPILED_RKA' | 'SINGLE_SUMMARY'
}) => {
  const workbook = new ExcelJS.Workbook();

  // Helper for dependency text
  const getDepText = (act, index) => {
    if (index === 0 || act.startMode === 'project_start') return 'Project Start Date';
    if (act.startMode === 'after_prev') return 'After Previous Ends';
    if (act.startMode === 'parallel_prev') return 'Same Time as Previous';
    if (act.startMode === 'offset_prev') return `${act.offset || 0} days after previous`;
    if (act.startMode === 'manual') return 'Manual Specific Date';
    return '';
  };

  if (exportMode === 'SINGLE_SUMMARY') {
    // -------------------------------------------------------------
    // FLAT SINGLE SUMMARY SHEET
    // -------------------------------------------------------------
    const summarySheet = workbook.addWorksheet('Inception Summaries');
    summarySheet.columns = [
      { key: 'colA', width: 4 },
      { key: 'colB', width: 6 },
      { key: 'colC', width: 28 },
      { key: 'colD', width: 18 },
      { key: 'colE', width: 18 },
      { key: 'colF', width: 15 },
      { key: 'colG', width: 15 },
      { key: 'colH', width: 15 },
      { key: 'colI', width: 15 },
      { key: 'colJ', width: 15 },
      { key: 'colK', width: 14 },
      { key: 'colL', width: 42 },
      { key: 'colM', width: 30 }
    ];

    // Banner
    summarySheet.mergeCells('B2:M2');
    const titleCell = summarySheet.getCell('B2');
    titleCell.value = 'INCEPTION RESULTS BATCH SUMMARY REPORT';
    titleCell.font = { name: 'Outfit', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(2).height = 42;

    // Metadata
    summarySheet.getCell('B4').value = 'Division Filter:';
    summarySheet.getCell('B4').font = { name: 'Outfit', bold: true, size: 10 };
    summarySheet.getCell('C4').value = filterDivisionName;

    summarySheet.getCell('E4').value = 'Squad Filter:';
    summarySheet.getCell('E4').font = { name: 'Outfit', bold: true, size: 10 };
    summarySheet.getCell('F4').value = filterSquadName;

    summarySheet.getCell('H4').value = 'Export Date:';
    summarySheet.getCell('H4').font = { name: 'Outfit', bold: true, size: 10 };
    summarySheet.getCell('I4').value = format(new Date(), 'dd MMM yyyy HH:mm');

    summarySheet.getCell('B5').value = 'Total Inceptions:';
    summarySheet.getCell('B5').font = { name: 'Outfit', bold: true, size: 10 };
    summarySheet.getCell('C5').value = projectsData.length;

    const headers = [
      '#', 'Project Name', 'Division', 'Squad', 
      'Planned Start', 'Target End', 'Actual Start', 'Actual End', 
      'Total Mandays', 'Activities', 'Milestones Breakdown (Plan vs Act)', 'Notes'
    ];

    headers.forEach((h, idx) => {
      const colLetter = String.fromCharCode(66 + idx);
      const cell = summarySheet.getCell(`${colLetter}7`);
      cell.value = h;
      cell.font = { name: 'Outfit', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: (idx === 0 || idx >= 8) ? 'center' : 'left' };
      cell.border = {
        top: { style: 'medium', color: { argb: '475569' } },
        bottom: { style: 'medium', color: { argb: '475569' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };
    });
    summarySheet.getRow(7).height = 28;

    let currentRow = 8;
    projectsData.forEach((proj, idx) => {
      const isEven = idx % 2 === 0;
      const bgArgb = isEven ? 'FFFFFF' : 'F8FAFC';

      const milestoneText = (proj.activities || []).map(a => {
        const plan = `${a.startDate ? format(parseISO(a.startDate), 'dd MMM') : '?'} - ${a.endDate ? format(parseISO(a.endDate), 'dd MMM') : '?'}`;
        const act = (a.actualStartDate || a.actualEndDate)
          ? ` [Act: ${a.actualStartDate ? format(parseISO(a.actualStartDate), 'dd MMM') : '-'} to ${a.actualEndDate ? format(parseISO(a.actualEndDate), 'dd MMM') : '-'}]`
          : '';
        return `• ${a.name}: ${plan}${act}`;
      }).join('\n');

      const rowValues = [
        idx + 1,
        proj.name,
        proj.divisionName,
        proj.squadName,
        proj.plannedStartDate ? format(parseISO(proj.plannedStartDate), 'dd MMM yyyy') : '-',
        proj.plannedEndDate ? format(parseISO(proj.plannedEndDate), 'dd MMM yyyy') : '-',
        proj.actualStartDate ? format(parseISO(proj.actualStartDate), 'dd MMM yyyy') : '-',
        proj.actualEndDate ? format(parseISO(proj.actualEndDate), 'dd MMM yyyy') : '-',
        proj.totalMandays,
        proj.activityCount,
        milestoneText,
        proj.notes || ''
      ];

      rowValues.forEach((val, colIdx) => {
        const colLetter = String.fromCharCode(66 + colIdx);
        const cell = summarySheet.getCell(`${colLetter}${currentRow}`);
        cell.value = val;
        cell.font = { name: 'Outfit', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };
        if (colIdx === 0 || colIdx === 8 || colIdx === 9) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colIdx === 10 || colIdx === 11) {
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
      currentRow++;
    });
  } else {
    // -------------------------------------------------------------
    // COMPILED DIVISION RKA FORMAT (MATCHING Compiled Divisi RKA.xlsx)
    // Paired Tabs per Squad: "{Squad Name} Summary" & "Gantt {Squad Name}"
    // -------------------------------------------------------------
    
    // Group projects by squad
    const squadGroups = new Map();
    projectsData.forEach(proj => {
      const sqKey = proj.squadName || 'Unassigned Squad';
      if (!squadGroups.has(sqKey)) squadGroups.set(sqKey, []);
      squadGroups.get(sqKey).push(proj);
    });

    squadGroups.forEach((squadProjects, squadName) => {
      // Clean sheet name (max 28 chars)
      const cleanSquadName = squadName.replace(/[\\/*?:[\]]/g, '').substring(0, 24);
      
      // ---------------------------------------------------------
      // TAB 1: {Squad Name} Summary
      // ---------------------------------------------------------
      const summarySheetName = `${cleanSquadName} Summary`.substring(0, 30);
      const summarySheet = workbook.addWorksheet(summarySheetName);

      summarySheet.columns = [
        { key: 'colA', width: 4 },
        { key: 'colB', width: 6 },   // #
        { key: 'colC', width: 34 },  // Activity Name
        { key: 'colD', width: 12 },  // Mandays
        { key: 'colE', width: 24 },  // Start Dependency
        { key: 'colF', width: 16 },  // Start Date
        { key: 'colG', width: 16 },  // End Date
        { key: 'colH', width: 38 }   // Remarks
      ];

      let baseRow = 2;
      squadProjects.forEach((proj) => {
        // Project Header Banner
        summarySheet.mergeCells(`B${baseRow}:H${baseRow}`);
        const titleCell = summarySheet.getCell(`B${baseRow}`);
        titleCell.value = 'PROJECT SCHEDULE SUMMARY REPORT';
        titleCell.font = { name: 'Outfit', size: 14, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        summarySheet.getRow(baseRow).height = 36;

        // Metadata Card
        const rName = baseRow + 2;
        summarySheet.getCell(`B${rName}`).value = 'Project Name:';
        summarySheet.getCell(`B${rName}`).font = { name: 'Outfit', bold: true, size: 10 };
        summarySheet.getCell(`C${rName}`).value = proj.name;
        summarySheet.mergeCells(`C${rName}:D${rName}`);

        summarySheet.getCell(`G${rName}`).value = 'Start Date:';
        summarySheet.getCell(`G${rName}`).font = { name: 'Outfit', bold: true, size: 10 };
        summarySheet.getCell(`H${rName}`).value = proj.plannedStartDate ? format(parseISO(proj.plannedStartDate), 'dd MMM yyyy') : 'TBD';

        const rDiv = baseRow + 3;
        summarySheet.getCell(`B${rDiv}`).value = 'Division:';
        summarySheet.getCell(`B${rDiv}`).font = { name: 'Outfit', bold: true, size: 10 };
        summarySheet.getCell(`C${rDiv}`).value = proj.divisionName;

        summarySheet.getCell(`G${rDiv}`).value = 'Squad:';
        summarySheet.getCell(`G${rDiv}`).font = { name: 'Outfit', bold: true, size: 10 };
        summarySheet.getCell(`H${rDiv}`).value = proj.squadName;

        const rNotes = baseRow + 4;
        summarySheet.getCell(`B${rNotes}`).value = 'Notes:';
        summarySheet.getCell(`B${rNotes}`).font = { name: 'Outfit', bold: true, size: 10 };
        summarySheet.getCell(`C${rNotes}`).value = proj.notes || 'None';
        summarySheet.mergeCells(`C${rNotes}:H${rNotes}`);

        for (let r = rName; r <= rNotes; r++) {
          const row = summarySheet.getRow(r);
          row.height = 20;
          row.eachCell(cell => {
            if (!cell.font) cell.font = { name: 'Outfit', size: 10 };
          });
        }

        // Activity Table Header
        const tableHeaderRow = baseRow + 6;
        const headers = ['#', 'Activity Name', 'Mandays', 'Start Dependency', 'Start Date', 'End Date', 'Remarks'];
        headers.forEach((h, idx) => {
          const colLetter = String.fromCharCode(66 + idx); // B to H
          const cell = summarySheet.getCell(`${colLetter}${tableHeaderRow}`);
          cell.value = h;
          cell.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
          cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 2 ? 'center' : 'left' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'CBD5E1' } },
            bottom: { style: 'medium', color: { argb: '94A3B8' } },
            left: { style: 'thin', color: { argb: 'CBD5E1' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } }
          };
        });
        summarySheet.getRow(tableHeaderRow).height = 25;

        // Activity Data Rows
        let actStartRow = tableHeaderRow + 1;
        let actCurrentRow = actStartRow;

        (proj.activities || []).forEach((act, idx) => {
          const rowVals = [
            idx + 1,
            act.name,
            parseInt(act.mandays) || 0,
            getDepText(act, idx),
            act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-',
            act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-',
            act.remarks || '-'
          ];

          rowVals.forEach((val, colIdx) => {
            const colLetter = String.fromCharCode(66 + colIdx);
            const cell = summarySheet.getCell(`${colLetter}${actCurrentRow}`);
            cell.value = val;
            cell.font = { name: 'Outfit', size: 10 };
            cell.border = {
              top: { style: 'thin', color: { argb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
              left: { style: 'thin', color: { argb: 'E2E8F0' } },
              right: { style: 'thin', color: { argb: 'E2E8F0' } }
            };
            cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 || colIdx === 2 ? 'center' : 'left' };
          });
          summarySheet.getRow(actCurrentRow).height = 20;
          actCurrentRow++;
        });

        // Totals Row
        const totRow = actCurrentRow;
        summarySheet.getCell(`B${totRow}`).value = 'Total';
        summarySheet.getCell(`B${totRow}`).font = { name: 'Outfit', size: 10, bold: true };
        summarySheet.getCell(`B${totRow}`).alignment = { vertical: 'middle', horizontal: 'left' };

        const totMandaysCell = summarySheet.getCell(`D${totRow}`);
        totMandaysCell.value = { formula: `SUM(D${actStartRow}:D${totRow - 1})` };
        totMandaysCell.font = { name: 'Outfit', size: 10, bold: true, color: { argb: '4F46E5' } };
        totMandaysCell.alignment = { vertical: 'middle', horizontal: 'center' };

        for (let c = 66; c <= 72; c++) {
          const colLetter = String.fromCharCode(c);
          const cell = summarySheet.getCell(`${colLetter}${totRow}`);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF2FF' } };
          cell.border = {
            top: { style: 'medium', color: { argb: '4F46E5' } },
            bottom: { style: 'double', color: { argb: '4F46E5' } },
            left: { style: 'thin', color: { argb: 'CBD5E1' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } }
          };
        }

        // Leave spacing for next project
        baseRow = totRow + 3;
      });

      // ---------------------------------------------------------
      // TAB 2: Gantt {Squad Name}
      // ---------------------------------------------------------
      const ganttSheetName = `Gantt ${cleanSquadName}`.substring(0, 30);
      const ganttSheet = workbook.addWorksheet(ganttSheetName);

      // Collect all activity dates across all projects in squad
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

      // Range from 1st of minDate month to maxDate + 14 days
      const calendarStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const calendarEnd = addDays(maxDate, 14);

      const daysRange = [];
      let curr = calendarStart;
      while (curr <= calendarEnd && daysRange.length < 200) {
        daysRange.push(curr);
        curr = addDays(curr, 1);
      }

      // Column widths
      ganttSheet.getColumn(1).width = 28; // Activity
      ganttSheet.getColumn(2).width = 14; // Start Date
      ganttSheet.getColumn(3).width = 14; // End Date
      ganttSheet.getColumn(4).width = 10; // Mandays
      for (let i = 0; i < daysRange.length; i++) {
        ganttSheet.getColumn(5 + i).width = 3.2;
      }

      // Headers Row 2, 3, 4
      ganttSheet.mergeCells('A2:A4');
      ganttSheet.mergeCells('B2:B4');
      ganttSheet.mergeCells('C2:C4');
      ganttSheet.mergeCells('D2:D4');

      ['Activity', 'Start Date', 'End Date', 'Mandays'].forEach((label, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const cell = ganttSheet.getCell(`${letter}2`);
        cell.value = label;
        cell.font = { name: 'Outfit', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Month Headers (Row 2)
      let currentMonthStr = '';
      let monthStartCol = 5;

      daysRange.forEach((d, dIdx) => {
        const mStr = format(d, 'MMMM yyyy');
        const colIdx = 5 + dIdx;

        if (mStr !== currentMonthStr) {
          if (currentMonthStr !== '' && colIdx - 1 >= monthStartCol) {
            // Merge previous month
            ganttSheet.mergeCells(2, monthStartCol, 2, colIdx - 1);
            const mCell = ganttSheet.getCell(2, monthStartCol);
            mCell.value = currentMonthStr;
            mCell.font = { name: 'Outfit', size: 9, bold: true, color: { argb: 'FFFFFF' } };
            mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
            mCell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
          currentMonthStr = mStr;
          monthStartCol = colIdx;
        }
      });
      // Merge last month
      if (monthStartCol <= 4 + daysRange.length) {
        ganttSheet.mergeCells(2, monthStartCol, 2, 4 + daysRange.length);
        const mCell = ganttSheet.getCell(2, monthStartCol);
        mCell.value = currentMonthStr;
        mCell.font = { name: 'Outfit', size: 9, bold: true, color: { argb: 'FFFFFF' } };
        mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        mCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Day Names (Row 3) & Day Numbers (Row 4)
      daysRange.forEach((d, dIdx) => {
        const colIdx = 5 + dIdx;
        const isWknd = !isWorkingDay(d);
        const bg = isWknd ? 'E2E8F0' : 'F8FAFC';
        const txtColor = isWknd ? '64748B' : '334155';

        const dayNameCell = ganttSheet.getCell(3, colIdx);
        dayNameCell.value = format(d, 'EEEEEE'); // 2-letter day (Mo, Tu)
        dayNameCell.font = { name: 'Outfit', size: 8, color: { argb: txtColor } };
        dayNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        dayNameCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const dayNumCell = ganttSheet.getCell(4, colIdx);
        dayNumCell.value = parseInt(format(d, 'd'));
        dayNumCell.font = { name: 'Outfit', size: 8, bold: true, color: { argb: txtColor } };
        dayNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        dayNumCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ganttSheet.getRow(2).height = 20;
      ganttSheet.getRow(3).height = 18;
      ganttSheet.getRow(4).height = 18;

      // Render Gantt Rows for each project
      let ganttCurrentRow = 5;

      squadProjects.forEach((proj) => {
        // Project Section Banner in Gantt
        ganttSheet.getCell(ganttCurrentRow, 1).value = `PROJECT: ${proj.name.toUpperCase()}`;
        ganttSheet.getCell(ganttCurrentRow, 1).font = { name: 'Outfit', size: 10, bold: true, color: { argb: '4F46E5' } };
        ganttSheet.getRow(ganttCurrentRow).height = 22;
        ganttCurrentRow++;

        (proj.activities || []).forEach((act) => {
          const actRow = ganttCurrentRow;
          ganttSheet.getCell(actRow, 1).value = act.name;
          ganttSheet.getCell(actRow, 1).font = { name: 'Outfit', size: 10 };

          ganttSheet.getCell(actRow, 2).value = act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-';
          ganttSheet.getCell(actRow, 2).font = { name: 'Outfit', size: 9 };
          ganttSheet.getCell(actRow, 2).alignment = { horizontal: 'center' };

          ganttSheet.getCell(actRow, 3).value = act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-';
          ganttSheet.getCell(actRow, 3).font = { name: 'Outfit', size: 9 };
          ganttSheet.getCell(actRow, 3).alignment = { horizontal: 'center' };

          ganttSheet.getCell(actRow, 4).value = parseInt(act.mandays) || 0;
          ganttSheet.getCell(actRow, 4).font = { name: 'Outfit', size: 9, bold: true };
          ganttSheet.getCell(actRow, 4).alignment = { horizontal: 'center' };

          const actStart = act.startDate ? parseISO(act.startDate) : null;
          const actEnd = act.endDate ? parseISO(act.endDate) : null;

          daysRange.forEach((d, dIdx) => {
            const colIdx = 5 + dIdx;
            const cell = ganttSheet.getCell(actRow, colIdx);
            const isWknd = !isWorkingDay(d);

            if (isWknd) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
            }

            if (actStart && actEnd && d >= actStart && d <= actEnd) {
              if (isWorkingDay(d)) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '818CF8' } };
                
                // Duration label at midpoint
                const midPoint = Math.floor(differenceInDays(actEnd, actStart) / 2);
                const currentOffset = differenceInDays(d, actStart);
                if (currentOffset === midPoint) {
                  cell.value = `${act.mandays}d`;
                  cell.font = { name: 'Outfit', size: 8, bold: true, color: { argb: 'FFFFFF' } };
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
  }

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

