import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Building2, Users } from 'lucide-react';

export const OrgManager = ({
  divisions,
  squads,
  addDivision,
  renameDivision,
  deleteDivision,
  addSquad,
  renameSquad,
  deleteSquad,
  onClose
}) => {
  const [newDivName, setNewDivName] = useState('');
  const [newSquadName, setNewSquadName] = useState('');
  const [editingDivId, setEditingDivId] = useState(null);
  const [editingSquadId, setEditingSquadId] = useState(null);
  const [editDivName, setEditDivName] = useState('');
  const [editSquadName, setEditSquadName] = useState('');

  const handleAddDivision = (e) => {
    e.preventDefault();
    if (newDivName.trim()) {
      addDivision(newDivName.trim());
      setNewDivName('');
    }
  };

  const handleAddSquad = (e) => {
    e.preventDefault();
    if (newSquadName.trim()) {
      addSquad(newSquadName.trim());
      setNewSquadName('');
    }
  };

  const startEditDiv = (div) => {
    setEditingDivId(div.id);
    setEditDivName(div.name);
  };

  const saveEditDiv = () => {
    if (editDivName.trim()) {
      renameDivision(editingDivId, editDivName.trim());
    }
    setEditingDivId(null);
    setEditDivName('');
  };

  const startEditSquad = (squad) => {
    setEditingSquadId(squad.id);
    setEditSquadName(squad.name);
  };

  const saveEditSquad = () => {
    if (editSquadName.trim()) {
      renameSquad(editingSquadId, editSquadName.trim());
    }
    setEditingSquadId(null);
    setEditSquadName('');
  };

  const handleDeleteDivision = (id, name) => {
    if (window.confirm(`Delete division "${name}"? Projects using this division will become unassigned.`)) {
      deleteDivision(id);
    }
  };

  const handleDeleteSquad = (id, name) => {
    if (window.confirm(`Delete squad "${name}"? Projects using this squad will become unassigned.`)) {
      deleteSquad(id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content org-modal" onClick={(e) => e.stopPropagation()}>
        <div className="org-modal-header">
          <h3>Manage Organization</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="org-columns">
          {/* Divisions Column */}
          <div className="org-column">
            <div className="org-column-header">
              <Building2 size={18} />
              <span>Divisions</span>
              <span className="org-count">{divisions.length}</span>
            </div>

            <form className="org-add-form" onSubmit={handleAddDivision}>
              <input
                type="text"
                value={newDivName}
                onChange={(e) => setNewDivName(e.target.value)}
                placeholder="Add division..."
                className="org-add-input"
              />
              <button type="submit" className="btn-add-org" disabled={!newDivName.trim()}>
                <Plus size={16} />
              </button>
            </form>

            <div className="org-list">
              {divisions.length === 0 && (
                <div className="org-empty">No divisions yet</div>
              )}
              {divisions.map(div => (
                <div key={div.id} className="org-item">
                  {editingDivId === div.id ? (
                    <div className="org-item-editing">
                      <input
                        type="text"
                        value={editDivName}
                        onChange={(e) => setEditDivName(e.target.value)}
                        className="org-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditDiv();
                          if (e.key === 'Escape') setEditingDivId(null);
                        }}
                      />
                      <button type="button" className="org-action-btn save" onClick={saveEditDiv}>
                        <Check size={14} />
                      </button>
                      <button type="button" className="org-action-btn cancel" onClick={() => setEditingDivId(null)}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="org-item-name">{div.name}</span>
                      <div className="org-item-actions">
                        <button type="button" className="org-action-btn" onClick={() => startEditDiv(div)} title="Rename">
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="org-action-btn danger" onClick={() => handleDeleteDivision(div.id, div.name)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Squads Column */}
          <div className="org-column">
            <div className="org-column-header">
              <Users size={18} />
              <span>Squads</span>
              <span className="org-count">{squads.length}</span>
            </div>

            <form className="org-add-form" onSubmit={handleAddSquad}>
              <input
                type="text"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                placeholder="Add squad..."
                className="org-add-input"
              />
              <button type="submit" className="btn-add-org" disabled={!newSquadName.trim()}>
                <Plus size={16} />
              </button>
            </form>

            <div className="org-list">
              {squads.length === 0 && (
                <div className="org-empty">No squads yet</div>
              )}
              {squads.map(squad => (
                <div key={squad.id} className="org-item">
                  {editingSquadId === squad.id ? (
                    <div className="org-item-editing">
                      <input
                        type="text"
                        value={editSquadName}
                        onChange={(e) => setEditSquadName(e.target.value)}
                        className="org-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditSquad();
                          if (e.key === 'Escape') setEditingSquadId(null);
                        }}
                      />
                      <button type="button" className="org-action-btn save" onClick={saveEditSquad}>
                        <Check size={14} />
                      </button>
                      <button type="button" className="org-action-btn cancel" onClick={() => setEditingSquadId(null)}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="org-item-name">{squad.name}</span>
                      <div className="org-item-actions">
                        <button type="button" className="org-action-btn" onClick={() => startEditSquad(squad)} title="Rename">
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="org-action-btn danger" onClick={() => handleDeleteSquad(squad.id, squad.name)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
