import React from 'react';

export const ProjectInfo = ({ projectInfo, updateProjectInfo }) => {
  return (
    <section className="card project-info">
      <h2>Project Information</h2>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="projectName">Project Name</label>
          <input
            id="projectName"
            type="text"
            value={projectInfo.name}
            onChange={(e) => updateProjectInfo('name', e.target.value)}
            placeholder="Enter project name..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="projectStartDate">Project Start Date</label>
          <input
            id="projectStartDate"
            type="date"
            value={projectInfo.startDate}
            onChange={(e) => updateProjectInfo('startDate', e.target.value)}
          />
          <small className="hint">This is the default start date for the first activity.</small>
        </div>
        <div className="form-group full-width">
          <label htmlFor="projectNotes">Notes</label>
          <textarea
            id="projectNotes"
            value={projectInfo.notes}
            onChange={(e) => updateProjectInfo('notes', e.target.value)}
            placeholder="Optional project planning notes..."
            rows={2}
          />
        </div>
      </div>
    </section>
  );
};
