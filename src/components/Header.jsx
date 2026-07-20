import React from 'react';
import { Calendar } from 'lucide-react';
import { ProjectSelector } from './ProjectSelector';

export const Header = (props) => (
  <header className="app-header">
    <div className="header-content">
      <div className="header-title-section">
        <div className="logo">
          <Calendar size={28} className="logo-icon" />
          <h1>Project Schedule Calendar Planner</h1>
        </div>
        <p className="subtitle">Plan your project timeline based on mandays, automatically skipping weekends and holidays.</p>
      </div>
      
      {props.projectsList && (
        <ProjectSelector {...props} />
      )}
    </div>
  </header>
);

