import React, { useState, useEffect } from 'react';
import { useProjectManager } from './hooks/useProjectManager';
import { useOrgData } from './hooks/useOrgData';
import { Header } from './components/Header';
import { ProjectInfo } from './components/ProjectInfo';
import { ActivityTable } from './components/ActivityTable';
import { Timeline } from './components/Timeline';
import { HolidayList } from './components/HolidayList';
import { ActionPanel } from './components/ActionPanel';
import { OrgManager } from './components/OrgManager';
import { BatchExportModal } from './components/BatchExportModal';
import './index.css';

function App() {
  const {
    projectsList,
    currentProjectId,
    selectProject,
    createNewProject,
    duplicateProject,
    deleteProject,
    projectInfo,
    updateProjectInfo,
    activities,
    updateActivity,
    addActivity,
    deleteActivity,
    reorderActivities,
    resetData,
    isLoading,
    syncStatus,
    isCloud
  } = useProjectManager();

  const {
    divisions,
    squads,
    isOrgLoading,
    addDivision,
    renameDivision,
    deleteDivision,
    addSquad,
    renameSquad,
    deleteSquad
  } = useOrgData();

  const [isOrgManagerOpen, setIsOrgManagerOpen] = useState(false);
  const [isBatchExportOpen, setIsBatchExportOpen] = useState(false);

  useEffect(() => {
    if (projectInfo && projectInfo.name) {
      document.title = `${projectInfo.name} - Project Schedule Planner`;
    } else {
      document.title = 'Project Schedule Planner';
    }
  }, [projectInfo?.name]);

  if (isLoading || isOrgLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading project schedule data...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header 
        projectsList={projectsList}
        currentProjectId={currentProjectId}
        selectProject={selectProject}
        createNewProject={createNewProject}
        duplicateProject={duplicateProject}
        deleteProject={deleteProject}
        syncStatus={syncStatus}
        isCloud={isCloud}
        divisions={divisions}
        squads={squads}
        onOpenOrgManager={() => setIsOrgManagerOpen(true)}
        onOpenBatchExport={() => setIsBatchExportOpen(true)}
      />
      
      <main className="main-content">
        <ProjectInfo 
          projectInfo={projectInfo} 
          updateProjectInfo={updateProjectInfo}
          divisions={divisions}
          squads={squads}
        />
        
        <ActivityTable 
          activities={activities} 
          updateActivity={updateActivity} 
          addActivity={addActivity}
          deleteActivity={deleteActivity}
          reorderActivities={reorderActivities} 
        />
        
        <ActionPanel 
          projectInfo={projectInfo} 
          activities={activities} 
          resetData={resetData} 
          divisions={divisions}
          squads={squads}
          onOpenBatchExport={() => setIsBatchExportOpen(true)}
        />

        <Timeline 
          activities={activities} 
        />
        
        <HolidayList />
      </main>

      {isOrgManagerOpen && (
        <OrgManager
          divisions={divisions}
          squads={squads}
          addDivision={addDivision}
          renameDivision={renameDivision}
          deleteDivision={deleteDivision}
          addSquad={addSquad}
          renameSquad={renameSquad}
          deleteSquad={deleteSquad}
          onClose={() => setIsOrgManagerOpen(false)}
        />
      )}

      {isBatchExportOpen && (
        <BatchExportModal
          projectsList={projectsList}
          divisions={divisions}
          squads={squads}
          isCloud={isCloud}
          onClose={() => setIsBatchExportOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
