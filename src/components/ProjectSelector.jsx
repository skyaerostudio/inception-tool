import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  Plus, 
  Copy, 
  Trash2, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Loader2,
  ChevronDown,
  Check,
  Settings,
  Building2,
  Users,
  Filter
} from 'lucide-react';

export const ProjectSelector = ({
  projectsList,
  currentProjectId,
  selectProject,
  createNewProject,
  duplicateProject,
  deleteProject,
  syncStatus,
  isCloud,
  divisions,
  squads,
  onOpenOrgManager
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newDivisionId, setNewDivisionId] = useState('');
  const [newSquadId, setNewSquadId] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState('');
  const [filterSquadId, setFilterSquadId] = useState('');
  const dropdownRef = useRef(null);

  const activeProject = projectsList.find(p => p.id === currentProjectId) || projectsList[0];

  const getDivisionName = (divId) => {
    const div = divisions.find(d => d.id === divId);
    return div ? div.name : null;
  };

  const getSquadName = (sqId) => {
    const sq = squads.find(s => s.id === sqId);
    return sq ? sq.name : null;
  };

  // Filter projects
  const filteredProjects = projectsList.filter(p => {
    if (filterDivisionId && p.division_id !== filterDivisionId) return false;
    if (filterSquadId && p.squad_id !== filterSquadId) return false;
    return true;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newProjectName.trim() && newDivisionId && newSquadId) {
      createNewProject(newProjectName.trim(), newDivisionId, newSquadId);
      setNewProjectName('');
      setNewDivisionId('');
      setNewSquadId('');
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    const projName = activeProject ? activeProject.name : 'this project';
    if (window.confirm(`Are you sure you want to delete "${projName}"?`)) {
      deleteProject(currentProjectId);
    }
  };

  const hasActiveFilters = filterDivisionId || filterSquadId;

  const renderSyncBadge = () => {
    if (!isCloud) {
      return (
        <span className="sync-badge local" title="Operating in offline/local storage mode">
          <HardDrive size={14} />
          <span>Local Storage</span>
        </span>
      );
    }

    switch (syncStatus) {
      case 'saving':
        return (
          <span className="sync-badge saving">
            <Loader2 size={14} className="spin-icon" />
            <span>Syncing...</span>
          </span>
        );
      case 'saved':
        return (
          <span className="sync-badge saved">
            <CheckCircle2 size={14} />
            <span>Cloud Synced</span>
          </span>
        );
      case 'error':
        return (
          <span className="sync-badge error">
            <AlertCircle size={14} />
            <span>Sync Failed</span>
          </span>
        );
      default:
        return (
          <span className="sync-badge saved">
            <Cloud size={14} />
            <span>Connected</span>
          </span>
        );
    }
  };

  return (
    <div className="project-selector-container">
      {/* Filter Bar */}
      {(divisions.length > 0 || squads.length > 0) && (
        <div className="filter-bar">
          <Filter size={14} className="filter-bar-icon" />
          
          {divisions.length > 0 && (
            <div className="filter-group">
              <Building2 size={14} />
              <select 
                value={filterDivisionId} 
                onChange={(e) => setFilterDivisionId(e.target.value)}
                className="filter-select"
              >
                <option value="">All Divisions</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {squads.length > 0 && (
            <div className="filter-group">
              <Users size={14} />
              <select 
                value={filterSquadId} 
                onChange={(e) => setFilterSquadId(e.target.value)}
                className="filter-select"
              >
                <option value="">All Squads</option>
                {squads.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button 
              type="button" 
              className="filter-clear-btn"
              onClick={() => { setFilterDivisionId(''); setFilterSquadId(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      <div className="project-selector-main">
        <div className="custom-dropdown-container" ref={dropdownRef}>
          <button
            type="button"
            className="custom-dropdown-trigger"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Folder size={18} className="folder-icon" />
            <div className="selected-project-info">
              <span className="selected-project-name">
                {activeProject ? activeProject.name : 'Select Project...'}
              </span>
              {activeProject && (getDivisionName(activeProject.division_id) || getSquadName(activeProject.squad_id)) && (
                <span className="selected-project-meta">
                  {[getDivisionName(activeProject.division_id), getSquadName(activeProject.squad_id)].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'open' : ''}`} />
          </button>

          {isOpen && (
            <div className="custom-dropdown-menu">
              {filteredProjects.length === 0 && (
                <div className="dropdown-empty">No projects match current filters</div>
              )}
              {filteredProjects.map((p) => {
                const isSelected = p.id === currentProjectId;
                const divName = getDivisionName(p.division_id);
                const sqName = getSquadName(p.squad_id);
                return (
                  <div
                    key={p.id}
                    className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      selectProject(p.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="dropdown-item-content">
                      <span className="project-item-name">{p.name}</span>
                      {(divName || sqName) && (
                        <span className="project-item-meta">
                          {[divName, sqName].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={16} className="check-icon" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="project-actions">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => setIsCreating(true)}
            title="Create New Project"
          >
            <Plus size={16} />
            <span>New</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => duplicateProject(currentProjectId)}
            title="Duplicate Current Project"
          >
            <Copy size={16} />
            <span>Clone</span>
          </button>

          <button
            type="button"
            className="btn btn-danger-subtle btn-icon"
            onClick={handleDelete}
            disabled={projectsList.length <= 1}
            title={projectsList.length <= 1 ? "Cannot delete the only project" : "Delete Current Project"}
          >
            <Trash2 size={16} />
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onOpenOrgManager}
            title="Manage Divisions & Squads"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="sync-status-container">
        {renderSyncBadge()}
      </div>

      {isCreating && (
        <div className="modal-overlay" onClick={() => setIsCreating(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Project</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label htmlFor="newProjectName">Project Name *</label>
                <input
                  id="newProjectName"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q3 Mobile App Launch"
                  autoFocus
                  required
                />
              </div>
              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="newDivision">Division *</label>
                  <select
                    id="newDivision"
                    value={newDivisionId}
                    onChange={(e) => setNewDivisionId(e.target.value)}
                    required
                    className="modal-select"
                  >
                    <option value="">Select Division...</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {divisions.length === 0 && (
                    <small className="hint warning-hint">No divisions yet. Add them in Settings first.</small>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="newSquad">Squad *</label>
                  <select
                    id="newSquad"
                    value={newSquadId}
                    onChange={(e) => setNewSquadId(e.target.value)}
                    required
                    className="modal-select"
                  >
                    <option value="">Select Squad...</option>
                    {squads.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {squads.length === 0 && (
                    <small className="hint warning-hint">No squads yet. Add them in Settings first.</small>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!newProjectName.trim() || !newDivisionId || !newSquadId}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
