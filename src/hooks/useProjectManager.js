import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { defaultActivities } from '../utils/defaultData';
import { calculateEndDate, getNextWorkingDay, isWorkingDay } from '../utils/dateCalculations';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_PROJECTS_KEY = 'calendar_app_projects_list';
const getLocalProjectKey = (id) => `calendar_app_project_${id}`;

const getDefaultProjectInfo = (name = 'New Project', divisionId = null, squadId = null) => ({
  name,
  startDate: format(getNextWorkingDay(new Date()), 'yyyy-MM-dd'),
  notes: '',
  divisionId,
  squadId
});

const getDefaultActivities = () => {
  return defaultActivities.map((act, index) => ({
    ...act,
    startMode: index === 0 ? 'project_start' : 'after_prev',
    offset: 0,
    manualStartDate: null,
    actualStartDate: null,
    actualEndDate: null,
    picId: null,
    status: 'To Do'
  }));
};

// Calculation helper for any project info + activity list
const computeProjectCalculatedActivities = (startDateStr, rawActivities) => {
  let currentCalculated = [];
  const projStart = parseISO(startDateStr);
  const validProjStart = isValid(projStart) ? (isWorkingDay(projStart) ? projStart : getNextWorkingDay(projStart)) : getNextWorkingDay(new Date());

  for (let i = 0; i < rawActivities.length; i++) {
    const act = rawActivities[i];
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

export const useProjectManager = () => {
  const [projectsList, setProjectsList] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectInfo, setProjectInfo] = useState(getDefaultProjectInfo());
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error' | 'local'
  const isCloud = isSupabaseConfigured();
  const projectDataLoaded = useRef(false);

  // Helper to save to local storage
  const saveToLocalStorage = useCallback((id, info, acts, list) => {
    try {
      localStorage.setItem(getLocalProjectKey(id), JSON.stringify({ projectInfo: info, activities: acts }));
      const updatedList = list || projectsList.map(p => p.id === id ? { ...p, name: info.name, updated_at: new Date().toISOString() } : p);
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(updatedList));
      setSyncStatus('local');
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }, [projectsList]);

  // Load project list on mount
  useEffect(() => {
    let isMounted = true;
    const fetchList = async () => {
      setIsLoading(true);
      if (isCloud) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('id, name, start_date, updated_at, division_id, squad_id')
            .order('updated_at', { ascending: false });

          if (error) throw error;

          if (isMounted) {
            if (data && data.length > 0) {
              setProjectsList(data);
              setCurrentProjectId(data[0].id);
            } else {
              // Create first project in Supabase
              await createNewProject('Default Project');
            }
          }
        } catch (err) {
          console.error('Error loading projects from Supabase:', err);
          setSyncStatus('error');
        }
      } else {
        // LocalStorage Mode
        const savedList = localStorage.getItem(LOCAL_PROJECTS_KEY);
        let list = savedList ? JSON.parse(savedList) : [];
        if (list.length === 0) {
          const defaultId = 'local-' + Date.now();
          const defaultInfo = getDefaultProjectInfo('My First Project');
          const defaultActs = getDefaultActivities();
          list = [{ id: defaultId, name: defaultInfo.name, updated_at: new Date().toISOString() }];
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(list));
          localStorage.setItem(getLocalProjectKey(defaultId), JSON.stringify({ projectInfo: defaultInfo, activities: defaultActs }));
        }
        if (isMounted) {
          setProjectsList(list);
          setCurrentProjectId(list[0].id);
          setSyncStatus('local');
        }
      }
      if (isMounted) setIsLoading(false);
    };

    fetchList();
    return () => { isMounted = false; };
  }, []);

  // Fetch single project data when currentProjectId changes
  useEffect(() => {
    if (!currentProjectId) return;
    let isMounted = true;
    projectDataLoaded.current = false;

    const loadProjectData = async () => {
      if (isCloud) {
        try {
          // Fetch project
          const { data: proj, error: projErr } = await supabase
            .from('projects')
            .select('*')
            .eq('id', currentProjectId)
            .single();

          if (projErr) throw projErr;

          // Fetch activities
          const { data: acts, error: actErr } = await supabase
            .from('activities')
            .select('*')
            .eq('project_id', currentProjectId)
            .order('position_order', { ascending: true });

          if (actErr) throw actErr;

          if (isMounted) {
            setProjectInfo({
              name: proj.name,
              startDate: proj.start_date,
              notes: proj.notes || '',
              divisionId: proj.division_id || null,
              squadId: proj.squad_id || null
            });

            if (acts && acts.length > 0) {
              setActivities(acts.map(a => ({
                id: a.id,
                name: a.name,
                mandays: a.mandays,
                startMode: a.start_mode,
                offset: a.offset_days || 0,
                manualStartDate: a.manual_start_date || null,
                actualStartDate: a.actual_start_date || null,
                actualEndDate: a.actual_end_date || null,
                picId: a.pic_id || null,
                status: a.status || 'To Do',
                remarks: a.remarks || ''
              })));
            } else {
              setActivities(getDefaultActivities());
            }
            setSyncStatus('saved');
            projectDataLoaded.current = true;
          }
        } catch (err) {
          console.error('Error fetching project data from Supabase:', err);
          setSyncStatus('error');
        }
      } else {
        // LocalStorage Mode
        const raw = localStorage.getItem(getLocalProjectKey(currentProjectId));
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          setProjectInfo(parsed.projectInfo);
          setActivities(parsed.activities);
          setSyncStatus('local');
          projectDataLoaded.current = true;
        }
      }
    };

    loadProjectData();
    return () => { isMounted = false; };
  }, [currentProjectId]);

  // Save changes to Supabase / LocalStorage (debounced)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!currentProjectId || isLoading) return;
    if (!projectDataLoaded.current) return;

    setSyncStatus(isCloud ? 'saving' : 'local');
    const timer = setTimeout(async () => {
      if (isCloud) {
        try {
          // Update project
          const { error: projErr } = await supabase
            .from('projects')
            .update({
              name: projectInfo.name,
              start_date: projectInfo.startDate,
              notes: projectInfo.notes,
              division_id: projectInfo.divisionId || null,
              squad_id: projectInfo.squadId || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentProjectId);

          if (projErr) throw projErr;

          // Upsert activities
          const activitiesPayload = activities.map((act, index) => ({
            id: String(act.id),
            project_id: currentProjectId,
            name: act.name,
            mandays: parseInt(act.mandays) || 1,
            start_mode: act.startMode || 'after_prev',
            offset_days: parseInt(act.offset) || 0,
            manual_start_date: act.manualStartDate || null,
            actual_start_date: act.actualStartDate || null,
            actual_end_date: act.actualEndDate || null,
            pic_id: act.picId || null,
            status: act.status || 'To Do',
            remarks: act.remarks || '',
            position_order: index,
            updated_at: new Date().toISOString()
          }));

          const { error: actErr } = await supabase
            .from('activities')
            .upsert(activitiesPayload, { onConflict: 'id,project_id' });

          if (actErr) throw actErr;

          // Update local list header
          setProjectsList(prev => prev.map(p => p.id === currentProjectId ? { ...p, name: projectInfo.name, division_id: projectInfo.divisionId, squad_id: projectInfo.squadId, updated_at: new Date().toISOString() } : p));
          setSyncStatus('saved');
        } catch (err) {
          console.error('Error saving to Supabase:', err);
          setSyncStatus('error');
        }
      } else {
        saveToLocalStorage(currentProjectId, projectInfo, activities);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [projectInfo, activities, currentProjectId]);

  // Create new project
  const createNewProject = async (name = 'New Project', divisionId = null, squadId = null) => {
    const defaultInfo = getDefaultProjectInfo(name, divisionId, squadId);
    const defaultActs = getDefaultActivities();

    if (isCloud) {
      setSyncStatus('saving');
      try {
        const { data: proj, error: projErr } = await supabase
          .from('projects')
          .insert([{ name: defaultInfo.name, start_date: defaultInfo.startDate, notes: defaultInfo.notes, division_id: divisionId, squad_id: squadId }])
          .select()
          .single();

        if (projErr) throw projErr;

        const actsPayload = defaultActs.map((act, index) => ({
          id: String(act.id),
          project_id: proj.id,
          name: act.name,
          mandays: act.mandays,
          start_mode: act.startMode,
          offset_days: act.offset,
          manual_start_date: act.manualStartDate,
          actual_start_date: act.actualStartDate || null,
          actual_end_date: act.actualEndDate || null,
          pic_id: act.picId || null,
          status: act.status || 'To Do',
          remarks: act.remarks,
          position_order: index
        }));

        const { error: actErr } = await supabase.from('activities').insert(actsPayload);
        if (actErr) throw actErr;

        setProjectsList(prev => [{ id: proj.id, name: proj.name, division_id: proj.division_id, squad_id: proj.squad_id, updated_at: proj.updated_at }, ...prev]);
        setCurrentProjectId(proj.id);
        setProjectInfo(defaultInfo);
        setActivities(defaultActs);
        setSyncStatus('saved');
      } catch (err) {
        console.error('Error creating project in Supabase:', err);
        setSyncStatus('error');
      }
    } else {
      const newId = 'local-' + Date.now();
      const newList = [{ id: newId, name: defaultInfo.name, division_id: divisionId, squad_id: squadId, updated_at: new Date().toISOString() }, ...projectsList];
      setProjectsList(newList);
      setCurrentProjectId(newId);
      setProjectInfo(defaultInfo);
      setActivities(defaultActs);
      saveToLocalStorage(newId, defaultInfo, defaultActs, newList);
    }
  };

  // Duplicate current or selected project
  const duplicateProject = async (idToDuplicate = currentProjectId) => {
    const targetInfo = idToDuplicate === currentProjectId ? projectInfo : null;
    const targetActs = idToDuplicate === currentProjectId ? activities : null;
    const newName = `${targetInfo ? targetInfo.name : 'Project'} (Copy)`;

    if (isCloud) {
      setSyncStatus('saving');
      try {
        const { data: proj, error: projErr } = await supabase
          .from('projects')
          .insert([{ name: newName, start_date: targetInfo ? targetInfo.startDate : format(new Date(), 'yyyy-MM-dd'), notes: targetInfo ? targetInfo.notes : '', division_id: targetInfo ? targetInfo.divisionId : null, squad_id: targetInfo ? targetInfo.squadId : null }])
          .select()
          .single();

        if (projErr) throw projErr;

        const actsPayload = (targetActs || getDefaultActivities()).map((act, index) => ({
          id: String(act.id),
          project_id: proj.id,
          name: act.name,
          mandays: act.mandays,
          start_mode: act.startMode,
          offset_days: act.offset,
          manual_start_date: act.manualStartDate,
          actual_start_date: act.actualStartDate || null,
          actual_end_date: act.actualEndDate || null,
          pic_id: act.picId || null,
          status: act.status || 'To Do',
          remarks: act.remarks,
          position_order: index
        }));

        await supabase.from('activities').insert(actsPayload);

        setProjectsList(prev => [{ id: proj.id, name: proj.name, division_id: proj.division_id, squad_id: proj.squad_id, updated_at: proj.updated_at }, ...prev]);
        setCurrentProjectId(proj.id);
        setSyncStatus('saved');
      } catch (err) {
        console.error('Error duplicating project:', err);
        setSyncStatus('error');
      }
    } else {
      const newId = 'local-' + Date.now();
      const duplicatedInfo = { ...targetInfo, name: newName };
      const newList = [{ id: newId, name: newName, division_id: targetInfo?.divisionId, squad_id: targetInfo?.squadId, updated_at: new Date().toISOString() }, ...projectsList];
      setProjectsList(newList);
      setCurrentProjectId(newId);
      setProjectInfo(duplicatedInfo);
      saveToLocalStorage(newId, duplicatedInfo, targetActs, newList);
    }
  };

  // Delete project
  const deleteProject = async (idToDelete) => {
    if (projectsList.length <= 1) {
      alert("Cannot delete the last remaining project.");
      return;
    }

    const remainingList = projectsList.filter(p => p.id !== idToDelete);

    if (isCloud) {
      setSyncStatus('saving');
      try {
        const { error } = await supabase.from('projects').delete().eq('id', idToDelete);
        if (error) throw error;
        setProjectsList(remainingList);
        if (currentProjectId === idToDelete) {
          setCurrentProjectId(remainingList[0].id);
        }
        setSyncStatus('saved');
      } catch (err) {
        console.error('Error deleting project from Supabase:', err);
        setSyncStatus('error');
      }
    } else {
      localStorage.removeItem(getLocalProjectKey(idToDelete));
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(remainingList));
      setProjectsList(remainingList);
      if (currentProjectId === idToDelete) {
        setCurrentProjectId(remainingList[0].id);
      }
      setSyncStatus('local');
    }
  };

  // Dynamic Date Calculations
  const calculatedActivities = computeProjectCalculatedActivities(projectInfo.startDate, activities);

  const addActivity = (name = 'New Activity') => {
    const newActivity = {
      id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: name.trim() || 'New Activity',
      mandays: 5,
      startMode: activities.length === 0 ? 'project_start' : 'after_prev',
      offset: 0,
      manualStartDate: null,
      actualStartDate: null,
      actualEndDate: null,
      picId: null,
      status: 'To Do',
      remarks: ''
    };
    setActivities(prev => [...prev, newActivity]);
  };

  const deleteActivity = async (idToDelete) => {
    if (activities.length <= 1) {
      alert("A project must have at least one activity.");
      return;
    }

    setActivities(prev => {
      const updated = prev.filter(act => act.id !== idToDelete);
      if (updated.length > 0 && (updated[0].startMode === 'after_prev' || updated[0].startMode === 'parallel_prev' || updated[0].startMode === 'offset_prev')) {
        updated[0] = { ...updated[0], startMode: 'project_start' };
      }
      return updated;
    });

    if (isCloud && currentProjectId) {
      try {
        await supabase.from('activities').delete().eq('id', String(idToDelete)).eq('project_id', currentProjectId);
      } catch (err) {
        console.error('Error deleting activity from Supabase:', err);
      }
    }
  };

  const updateProjectInfo = (field, value) => {
    setProjectInfo(prev => ({ ...prev, [field]: value }));
  };

  const updateActivity = (id, field, value) => {
    setActivities(prev => prev.map(act => {
      if (act.id !== id) return act;

      let updated = { ...act, [field]: value };

      // Smart date auto-fill when status changes
      if (field === 'status') {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (value === 'In Progress' && !act.actualStartDate) {
          updated.actualStartDate = todayStr;
        } else if (value === 'Done') {
          if (!act.actualStartDate) {
            updated.actualStartDate = todayStr;
          }
          if (!act.actualEndDate) {
            updated.actualEndDate = todayStr;
          }
        }
      }

      return updated;
    }));
  };

  const reorderActivities = (startIndex, endIndex) => {
    setActivities(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      if (result[0].startMode === 'after_prev' || result[0].startMode === 'parallel_prev' || result[0].startMode === 'offset_prev') {
        result[0] = { ...result[0], startMode: 'project_start' };
      }
      
      return result;
    });
  };

  const resetData = () => {
    setProjectInfo(prev => ({ ...prev, startDate: format(getNextWorkingDay(new Date()), 'yyyy-MM-dd'), notes: '' }));
    setActivities(getDefaultActivities());
  };

  // Helper to load activities across all projects for Availability Matrix
  const fetchAllProjectsActivities = async () => {
    if (isCloud) {
      try {
        const [projRes, actRes] = await Promise.all([
          supabase.from('projects').select('id, name, start_date'),
          supabase.from('activities').select('*').order('position_order', { ascending: true })
        ]);

        if (projRes.error) throw projRes.error;
        if (actRes.error) throw actRes.error;

        const projects = projRes.data || [];
        const allActs = actRes.data || [];

        return projects.map(p => {
          const rawProjActs = allActs
            .filter(a => a.project_id === p.id)
            .map(a => ({
              id: a.id,
              name: a.name,
              mandays: a.mandays,
              startMode: a.start_mode,
              offset: a.offset_days || 0,
              manualStartDate: a.manual_start_date || null,
              actualStartDate: a.actual_start_date || null,
              actualEndDate: a.actual_end_date || null,
              picId: a.pic_id || null,
              status: a.status || 'To Do',
              remarks: a.remarks || ''
            }));
          const computedActs = computeProjectCalculatedActivities(p.start_date, rawProjActs);
          return { project: p, activities: computedActs };
        });
      } catch (err) {
        console.error('Error fetching all projects activities:', err);
        return [];
      }
    } else {
      // LocalStorage mode
      return projectsList.map(p => {
        let pInfo = { startDate: format(new Date(), 'yyyy-MM-dd'), name: p.name };
        let pActs = [];

        if (p.id === currentProjectId) {
          pInfo = projectInfo;
          pActs = activities;
        } else {
          const raw = localStorage.getItem(getLocalProjectKey(p.id));
          if (raw) {
            const parsed = JSON.parse(raw);
            pInfo = parsed.projectInfo;
            pActs = parsed.activities || [];
          }
        }

        const computedActs = computeProjectCalculatedActivities(pInfo.startDate, pActs);
        return { project: { id: p.id, name: pInfo.name }, activities: computedActs };
      });
    }
  };

  return {
    projectsList,
    currentProjectId,
    selectProject: setCurrentProjectId,
    createNewProject,
    duplicateProject,
    deleteProject,
    projectInfo,
    updateProjectInfo,
    activities: calculatedActivities,
    updateActivity,
    addActivity,
    deleteActivity,
    reorderActivities,
    resetData,
    fetchAllProjectsActivities,
    isLoading,
    syncStatus,
    isCloud
  };
};
