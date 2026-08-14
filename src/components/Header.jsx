import React from 'react';
import { Calendar, ShieldCheck, Award, LogOut, UserCheck } from 'lucide-react';
import { ProjectSelector } from './ProjectSelector';
import { useAuth } from '../context/AuthContext';

export const Header = (props) => {
  const { user, signOut } = useAuth();
  
  const displayName = user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <header className="app-header pegadaian-header">
      <div className="header-content">
        <div className="header-title-section">
          <div className="header-top-row">
            <div className="pegadaian-brand-badge">
              <Award size={18} className="pegadaian-badge-icon" />
              <span>PT PEGADAIAN (PERSERO)</span>
            </div>

            {user && (
              <div className="header-user-section">
                <div className="user-profile-chip" title={user.email}>
                  <UserCheck size={15} className="user-icon" />
                  <span className="user-name">{displayName}</span>
                </div>
                <button 
                  type="button" 
                  className="logout-btn"
                  onClick={signOut}
                  title="Sign out of your account"
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
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
};

