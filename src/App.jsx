import React from 'react';
import { useProjectData } from './hooks/useProjectData';
import { Header } from './components/Header';
import { ProjectInfo } from './components/ProjectInfo';
import { ActivityTable } from './components/ActivityTable';
import { Timeline } from './components/Timeline';
import { HolidayList } from './components/HolidayList';
import { ActionPanel } from './components/ActionPanel';
import './index.css';

function App() {
  const {
    projectInfo,
    updateProjectInfo,
    activities,
    updateActivity,
    reorderActivities,
    resetData
  } = useProjectData();

  return (
    <div className="app-container">
      <Header />
      
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
