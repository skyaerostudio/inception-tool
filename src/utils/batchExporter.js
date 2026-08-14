import { format, parseISO, isValid, addDays } from 'date-fns';
import { calculateEndDate, getNextWorkingDay, isWorkingDay } from './dateCalculations';
import { supabase } from '../lib/supabase';

const getLocalProjectKey = (id) => `calendar_app_project_${id}`;

/**
 * Calculate dates for a set of raw activities given a project start date.
 */
export const calculateProjectActivities = (projectStartDate, activities) => {
  if (!activities || activities.length === 0) return [];
  
  let currentCalculated = [];
  const projStart = parseISO(projectStartDate || new Date().toISOString());
  const validProjStart = isValid(projStart) 
    ? (isWorkingDay(projStart) ? projStart : getNextWorkingDay(projStart)) 
    : getNextWorkingDay(new Date());

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    let calcStart;

    if (i === 0 || act.startMode === 'project_start') {
      calcStart = validProjStart;
    } else if (act.startMode === 'manual' && act.manualStartDate) {
      const parsedManual = parseISO(act.manualStartDate);
      calcStart = isValid(parsedManual) 
        ? (isWorkingDay(parsedManual) ? parsedManual : getNextWorkingDay(parsedManual)) 
        : validProjStart;
    } else {
      const prevAct = currentCalculated[i - 1];
      if (!prevAct) {
        calcStart = validProjStart;
      } else {
        if (act.startMode === 'after_prev') {
          calcStart = prevAct.endDate 
            ? getNextWorkingDay(addDays(parseISO(prevAct.endDate), 1))
            : parseISO(prevAct.startDate);
        } else if (act.startMode === 'parallel_prev') {
          calcStart = parseISO(prevAct.startDate);
        } else if (act.startMode === 'offset_prev') {
          let counted = 1;
          let tempStart = parseISO(prevAct.startDate);
          const targetOffset = parseInt(act.offset) || 1;
          
          while (counted < targetOffset) {
            tempStart = addDays(tempStart, 1);
            if (isWorkingDay(tempStart)) {
              counted++;
            }
          }
          calcStart = tempStart;
        } else {
          calcStart = validProjStart;
        }
      }
    }

    const calcEnd = calculateEndDate(calcStart, act.mandays);
    
    currentCalculated.push({
      ...act,
      startDate: format(calcStart, 'yyyy-MM-dd'),
      endDate: calcEnd ? format(calcEnd, 'yyyy-MM-dd') : null
    });
  }

  return currentCalculated;
};

/**
 * Fetch and calculate full details for a batch list of projects.
 */
export const fetchBatchProjectsData = async (projectsList, isCloud, divisions = [], squads = []) => {
  const divMap = new Map((divisions || []).map(d => [d.id, d.name]));
  const sqMap = new Map((squads || []).map(s => [s.id, s.name]));

  const results = [];

  for (const item of projectsList) {
    let projectInfo = {
      id: item.id,
      name: item.name,
      startDate: item.start_date || format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      divisionId: item.division_id || null,
      squadId: item.squad_id || null
    };

    let rawActivities = [];

    if (isCloud) {
      try {
        const { data: proj } = await supabase.from('projects').select('*').eq('id', item.id).single();
        if (proj) {
          projectInfo = {
            id: proj.id,
            name: proj.name,
            startDate: proj.start_date,
            notes: proj.notes || '',
            divisionId: proj.division_id || null,
            squadId: proj.squad_id || null
          };
        }

        const { data: acts } = await supabase
          .from('activities')
          .select('*')
          .eq('project_id', item.id)
          .order('position_order', { ascending: true });

        if (acts && acts.length > 0) {
          rawActivities = acts.map(a => ({
            id: a.id,
            name: a.name,
            mandays: a.mandays,
            startMode: a.start_mode,
            offset: a.offset_days || 0,
            manualStartDate: a.manual_start_date || null,
            actualStartDate: a.actual_start_date || null,
            actualEndDate: a.actual_end_date || null,
            pic: a.pic || '',
            remarks: a.remarks || ''
          }));
        }
      } catch (err) {
        console.error(`Error loading batch project ${item.id} from cloud:`, err);
      }
    } else {
      const raw = localStorage.getItem(getLocalProjectKey(item.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        projectInfo = {
          id: item.id,
          name: parsed.projectInfo?.name || item.name,
          startDate: parsed.projectInfo?.startDate || item.start_date || format(new Date(), 'yyyy-MM-dd'),
          notes: parsed.projectInfo?.notes || '',
          divisionId: parsed.projectInfo?.divisionId || item.division_id || null,
          squadId: parsed.projectInfo?.squadId || item.squad_id || null
        };
        rawActivities = parsed.activities || [];
      }
    }

    const calculatedActs = calculateProjectActivities(projectInfo.startDate, rawActivities);
    const totalMandays = calculatedActs.reduce((sum, a) => sum + (parseInt(a.mandays) || 0), 0);

    const minPlannedStart = calculatedActs.length > 0 ? calculatedActs[0].startDate : projectInfo.startDate;
    const maxPlannedEnd = calculatedActs.length > 0 ? calculatedActs[calculatedActs.length - 1].endDate : null;

    // Actual project start/end calculation
    const validActualStarts = calculatedActs.map(a => a.actualStartDate).filter(Boolean);
    const validActualEnds = calculatedActs.map(a => a.actualEndDate).filter(Boolean);
    const actualProjStart = validActualStarts.length > 0 ? validActualStarts.sort()[0] : null;
    const actualProjEnd = validActualEnds.length > 0 ? validActualEnds.sort().reverse()[0] : null;

    results.push({
      ...projectInfo,
      divisionName: projectInfo.divisionId ? (divMap.get(projectInfo.divisionId) || 'Unassigned') : 'Unassigned',
      squadName: projectInfo.squadId ? (sqMap.get(projectInfo.squadId) || 'Unassigned') : 'Unassigned',
      activities: calculatedActs,
      totalMandays,
      activityCount: calculatedActs.length,
      plannedStartDate: minPlannedStart,
      plannedEndDate: maxPlannedEnd,
      actualStartDate: actualProjStart,
      actualEndDate: actualProjEnd
    });
  }

  return results;
};

/**
 * Generate TSV (Tab Separated Values) clipboard text formatted for 1-click Google Sheets paste.
 */
export const generateGoogleSheetsClipboardText = (projectsData, includeMilestones = true) => {
  const rows = [];
  
  // Header
  rows.push(['INCEPTION RESULTS BATCH SUMMARY REPORT'].join('\t'));
  rows.push([`Export Date: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, `Total Projects: ${projectsData.length}`].join('\t'));
  rows.push('');

  // Table Columns
  if (includeMilestones) {
    rows.push([
      '#', 'Project Name', 'Division', 'Squad', 
      'Planned Start', 'Planned Finish', 'Actual Start', 'Actual Finish', 
      'Total Mandays', 'Activities Count', 'Milestones Breakdown (Plan vs Actual)', 'Notes'
    ].join('\t'));

    projectsData.forEach((proj, idx) => {
      const milestoneText = proj.activities.map(a => {
        const plan = `${a.startDate ? format(parseISO(a.startDate), 'dd MMM') : '?'} - ${a.endDate ? format(parseISO(a.endDate), 'dd MMM') : '?'}`;
        const act = (a.actualStartDate || a.actualEndDate)
          ? ` (Act: ${a.actualStartDate ? format(parseISO(a.actualStartDate), 'dd MMM') : '-'} to ${a.actualEndDate ? format(parseISO(a.actualEndDate), 'dd MMM') : '-'})`
          : '';
        return `• ${a.name}: ${plan}${act}`;
      }).join('\n');

      rows.push([
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
        `"${milestoneText.replace(/"/g, '""')}"`,
        `"${(proj.notes || '').replace(/"/g, '""')}"`
      ].join('\t'));
    });
  } else {
    rows.push([
      '#', 'Project Name', 'Division', 'Squad', 
      'Planned Start Date', 'Target End Date', 'Total Mandays', 'Activities Count', 'Notes'
    ].join('\t'));

    projectsData.forEach((proj, idx) => {
      rows.push([
        idx + 1,
        proj.name,
        proj.divisionName,
        proj.squadName,
        proj.plannedStartDate ? format(parseISO(proj.plannedStartDate), 'dd MMM yyyy') : '-',
        proj.plannedEndDate ? format(parseISO(proj.plannedEndDate), 'dd MMM yyyy') : '-',
        proj.totalMandays,
        proj.activityCount,
        `"${(proj.notes || '').replace(/"/g, '""')}"`
      ].join('\t'));
    });
  }

  return rows.join('\n');
};
