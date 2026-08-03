import React from 'react';
import { Calendar, ShieldCheck, Award } from 'lucide-react';
import { ProjectSelector } from './ProjectSelector';

export const Header = (props) => (
  <header className="app-header pegadaian-header">
    <div className="header-content">
      <div className="header-title-section">
        <div className="pegadaian-brand-badge">
          <Award size={18} className="pegadaian-badge-icon" />
          <span>PT PEGADAIAN (PERSERO)</span>
        </div>
        <div className="logo">
          <Calendar size={32} className="logo-icon text-gold" />
          <h1>Inception & Project Schedule Planner</h1>
        </div>
        <p className="subtitle">
          Official Project Timeline & Resource Allocation System for PT Pegadaian (Mengatasi Masalah Tanpa Masalah)
        </p>
      </div>
      
      {props.projectsList && (
        <ProjectSelector {...props} />
      )}
    </div>
  </header>
);
