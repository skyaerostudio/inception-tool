import React from 'react';
import { useProjectManager } from './hooks/useProjectManager';
import { Header } from './components/Header';
import { ProjectInfo } from './components/ProjectInfo';
import { ActivityTable } from './components/ActivityTable';
import { Timeline } from './components/Timeline';
import { HolidayList } from './components/HolidayList';
import { ActionPanel } from './components/ActionPanel';
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
    reorderActivities,
    resetData,
    isLoading,
    syncStatus,
    isCloud
  } = useProjectManager();

  if (isLoading) {
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
      />
      
      <main className="main-content">
        <ProjectInfo 
          projectInfo={projectInfo} 
          updateProjectInfo={updateProjectInfo} 
        />
        
        <ActivityTable 
          activities={activities} 
          updateActivity={updateActivity} 
          reorderActivities={reorderActivities} 
        />
        
        <ActionPanel 
          projectInfo={projectInfo} 
          activities={activities} 
          resetData={resetData} 
        />

        <Timeline 
          activities={activities} 
        />
        
        <HolidayList />
      </main>
    </div>
  );
}

export default App;

