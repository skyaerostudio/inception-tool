import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { defaultActivities } from '../utils/defaultData';
import { calculateEndDate, getNextWorkingDay, isWorkingDay } from '../utils/dateCalculations';

export const useProjectData = () => {
  const [projectInfo, setProjectInfo] = useState({
    name: 'New Project',
    startDate: format(getNextWorkingDay(new Date()), 'yyyy-MM-dd'),
    notes: ''
  });

  const [activities, setActivities] = useState([]);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedProject = localStorage.getItem('projectInfo');
    const savedActivities = localStorage.getItem('activities');
    
    if (savedProject) setProjectInfo(JSON.parse(savedProject));
    
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    } else {
      // Initialize with default activities
      const initial = defaultActivities.map((act, index) => ({
        ...act,
        startMode: index === 0 ? 'project_start' : 'after_prev',
        offset: 0,
        manualStartDate: null
      }));
      setActivities(initial);
    }
  }, []);

  // Save to LocalStorage when changed
  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem('projectInfo', JSON.stringify(projectInfo));
      localStorage.setItem('activities', JSON.stringify(activities));
    }
  }, [projectInfo, activities]);

  // Calculate dates dynamically based on order and dependencies
  const getCalculatedActivities = useCallback(() => {
    let currentCalculated = [];
    
    const projStart = parseISO(projectInfo.startDate);
    const validProjStart = isValid(projStart) ? (isWorkingDay(projStart) ? projStart : getNextWorkingDay(projStart)) : getNextWorkingDay(new Date());

    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      let calcStart;

      if (i === 0 || act.startMode === 'project_start') {
        calcStart = validProjStart;
      } else if (act.startMode === 'manual' && act.manualStartDate) {
        const parsedManual = parseISO(act.manualStartDate);
        calcStart = isValid(parsedManual) ? (isWorkingDay(parsedManual) ? parsedManual : getNextWorkingDay(parsedManual)) : validProjStart;
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
            // Offset from previous activity's start date (e.g. 10 means 10th working day, which is start date + 9 working days)
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
  }, [projectInfo.startDate, activities]);

  const calculatedActivities = getCalculatedActivities();

  const updateProjectInfo = (field, value) => {
    setProjectInfo(prev => ({ ...prev, [field]: value }));
  };

  const updateActivity = (id, field, value) => {
    setActivities(prev => prev.map(act => act.id === id ? { ...act, [field]: value } : act));
  };

  const reorderActivities = (startIndex, endIndex) => {
    setActivities(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Ensure the first item is not set to depend on previous since there is no previous
      if (result[0].startMode === 'after_prev' || result[0].startMode === 'parallel_prev' || result[0].startMode === 'offset_prev') {
        result[0] = { ...result[0], startMode: 'project_start' };
      }
      
      return result;
    });
  };

  const resetData = () => {
    setProjectInfo({
      name: 'New Project',
      startDate: format(getNextWorkingDay(new Date()), 'yyyy-MM-dd'),
      notes: ''
    });
    const initial = defaultActivities.map((act, index) => ({
      ...act,
      startMode: index === 0 ? 'project_start' : 'after_prev',
      offset: 0,
      manualStartDate: null
    }));
    setActivities(initial);
  };

  return {
    projectInfo,
    updateProjectInfo,
    activities: calculatedActivities,
    updateActivity,
    reorderActivities,
    resetData
  };
};
