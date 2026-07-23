import React from 'react';
import { Building2, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const ProjectInfo = ({ projectInfo, updateProjectInfo, divisions, squads }) => {
  const divisionName = divisions?.find(d => d.id === projectInfo.divisionId)?.name;
  const squadName = squads?.find(s => s.id === projectInfo.squadId)?.name;

  return (
    <section className="card project-info">
      <h2>Project Information</h2>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="projectName">Project Name</label>
          <span className="print-only print-text">{projectInfo.name || 'Untitled Project'}</span>
          <input
            id="projectName"
            type="text"
            value={projectInfo.name}
            onChange={(e) => updateProjectInfo('name', e.target.value)}
            placeholder="Enter project name..."
            className="no-print"
          />
        </div>
        <div className="form-group">
          <label htmlFor="projectStartDate">Project Start Date</label>
          <span className="print-only print-text">
            {projectInfo.startDate ? format(parseISO(projectInfo.startDate), 'dd MMM yyyy') : 'TBD'}
          </span>
          <input
            id="projectStartDate"
            type="date"
            value={projectInfo.startDate}
            onChange={(e) => updateProjectInfo('startDate', e.target.value)}
            className="no-print"
          />
          <small className="hint no-print">This is the default start date for the first activity.</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="projectDivision">Division</label>
          <span className="print-only print-text">{divisionName || 'Unassigned'}</span>
          <div className="no-print">
            {divisions && divisions.length > 0 ? (
              <select
                id="projectDivision"
                value={projectInfo.divisionId || ''}
                onChange={(e) => updateProjectInfo('divisionId', e.target.value || null)}
                className="modal-select"
              >
                <option value="">Unassigned</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            ) : (
              <div className="org-badge unassigned">
                <Building2 size={14} />
                <span>{divisionName || 'Unassigned'}</span>
              </div>
            )}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="projectSquad">Squad</label>
          <span className="print-only print-text">{squadName || 'Unassigned'}</span>
          <div className="no-print">
            {squads && squads.length > 0 ? (
              <select
                id="projectSquad"
                value={projectInfo.squadId || ''}
                onChange={(e) => updateProjectInfo('squadId', e.target.value || null)}
                className="modal-select"
              >
                <option value="">Unassigned</option>
                {squads.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <div className="org-badge unassigned">
                <Users size={14} />
                <span>{squadName || 'Unassigned'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="projectNotes">Notes</label>
          <span className="print-only print-text notes-print-text">{projectInfo.notes || 'None'}</span>
          <textarea
            id="projectNotes"
            value={projectInfo.notes}
            onChange={(e) => updateProjectInfo('notes', e.target.value)}
            placeholder="Optional project planning notes..."
            rows={2}
            className="no-print"
          />
        </div>
      </div>
    </section>
  );
};
