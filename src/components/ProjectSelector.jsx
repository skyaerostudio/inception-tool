import React, { useState } from 'react';
import { 
  Folder, 
  Plus, 
  Copy, 
  Trash2, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Loader2 
} from 'lucide-react';

export const ProjectSelector = ({
  projectsList,
  currentProjectId,
  selectProject,
  createNewProject,
  duplicateProject,
  deleteProject,
  syncStatus,
  isCloud
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createNewProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    const activeProject = projectsList.find(p => p.id === currentProjectId);
    const projName = activeProject ? activeProject.name : 'this project';
    if (window.confirm(`Are you sure you want to delete "${projName}"?`)) {
      deleteProject(currentProjectId);
    }
  };

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
      <div className="project-selector-main">
        <div className="project-dropdown-wrapper">
          <Folder size={18} className="folder-icon" />
          <select
            value={currentProjectId || ''}
            onChange={(e) => selectProject(e.target.value)}
            className="project-select"
          >
            {projectsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
                <label htmlFor="newProjectName">Project Name</label>
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
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
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
