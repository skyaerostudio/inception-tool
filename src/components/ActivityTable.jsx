import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, AlertCircle, Plus, Trash2, User, Shield, ChevronDown, Search } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { isWorkingDay } from '../utils/dateCalculations';

const MultiPicSelector = ({ act, users, roles, updateActivity }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  // Helper to get formatted names for legacy act.pic string
  const formatPicNames = (ids) => {
    return ids.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
  };

  // Support array picIds, single string picId, and name-based fallback with act.pic
  const assignedIds = React.useMemo(() => {
    if (Array.isArray(act.picIds) && act.picIds.length > 0) return act.picIds;
    if (act.picId) return [act.picId];
    
    // Fallback: match act.pic names against users list
    if (act.pic && typeof act.pic === 'string' && users.length > 0) {
      const names = act.pic.split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
      const matched = users.filter(u => names.includes(u.name.toLowerCase())).map(u => u.id);
      if (matched.length > 0) return matched;
    }

    return [];
  }, [act.picIds, act.picId, act.pic, users]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleUser = (userId) => {
    let nextIds;
    if (assignedIds.includes(userId)) {
      nextIds = assignedIds.filter(id => id !== userId);
    } else {
      nextIds = [...assignedIds, userId];
    }
    updateActivity(act.id, 'picIds', nextIds);
    updateActivity(act.id, 'picId', nextIds[0] || null);
    updateActivity(act.id, 'pic', formatPicNames(nextIds));
  };

  const clearAll = (e) => {
    e.stopPropagation();
    updateActivity(act.id, 'picIds', []);
    updateActivity(act.id, 'picId', null);
    updateActivity(act.id, 'pic', '');
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter(u => {
      const r = roles.find(role => role.id === u.role_id);
      const nameMatch = u.name.toLowerCase().includes(term);
      const roleMatch = r && r.name.toLowerCase().includes(term);
      const emailMatch = u.email && u.email.toLowerCase().includes(term);
      return nameMatch || roleMatch || emailMatch;
    });
  }, [users, roles, searchTerm]);

  const assignedUsers = users.filter(u => assignedIds.includes(u.id));

  return (
    <div className="multi-pic-container" ref={dropdownRef}>
      <button
        type="button"
        className="multi-pic-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Assign multiple PICs for this activity"
      >
        {assignedUsers.length === 0 ? (
          <span className="placeholder-text">+ Assign PICs</span>
        ) : (
          <div className="pic-chips-wrapper">
            {assignedUsers.map(u => {
              const r = roles.find(role => role.id === u.role_id);
              return (
                <span 
                  key={u.id} 
                  className="pic-chip" 
                  style={{ backgroundColor: u.avatar_color || '#008744' }}
                >
                  {u.name} {r ? `(${r.name})` : ''}
                </span>
              );
            })}
          </div>
        )}
        <ChevronDown size={14} className="text-muted" />
      </button>

      {isOpen && (
        <div className="multi-pic-popover">
          <div className="popover-header">
            <span>Select Assignees ({assignedIds.length})</span>
            {assignedIds.length > 0 && (
              <button type="button" className="btn-link-xs" onClick={clearAll}>
                Clear All
              </button>
            )}
          </div>

          {/* Real-time Search Box */}
          <div className="popover-search-box">
            <Search size={14} className="search-icon text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search user or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="popover-search-input"
            />
            {searchTerm && (
              <button 
                type="button" 
                className="clear-search-btn" 
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="popover-user-list">
            {users.length === 0 ? (
              <div className="empty-hint">No users found. Add users in Users & Roles.</div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-hint">No user matching "{searchTerm}".</div>
            ) : (
              filteredUsers.map(u => {
                const r = roles.find(role => role.id === u.role_id);
                const isSelected = assignedIds.includes(u.id);
                return (
                  <label key={u.id} className={`popover-user-item ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(u.id)}
                    />
                    <span className="user-dot" style={{ backgroundColor: u.avatar_color || '#008744' }} />
                    <span className="user-name">{u.name}</span>
                    {r && <span className="user-role">({r.name})</span>}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ActivityTable = ({ 
  activities, 
  updateActivity, 
  reorderActivities, 
  addActivity, 
  deleteActivity,
  users = [],
  roles = []
}) => {
  const [showActuals, setShowActuals] = React.useState(false);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    reorderActivities(result.source.index, result.destination.index);
  };

  const getDependencyText = (act, index) => {
    if (index === 0 || act.startMode === 'project_start') return 'Project Start Date';
    if (act.startMode === 'after_prev') return 'After Previous Ends';
    if (act.startMode === 'parallel_prev') return 'Same Time as Previous';
    if (act.startMode === 'offset_prev') return `${act.offset || 0} days after previous`;
    if (act.startMode === 'manual') return 'Manual Specific Date';
    return '';
  };

  const renderStartModeOptions = (index) => {
    if (index === 0) {
      return <option value="project_start">Project Start Date</option>;
    }
    return (
      <>
        <option value="after_prev">After Previous Ends</option>
        <option value="parallel_prev">Same Time as Previous</option>
        <option value="offset_prev">Custom Offset from Previous</option>
        <option value="manual">Manual Specific Date</option>
      </>
    );
  };

  const getPrintPicText = (act) => {
    if (act.pic && act.pic.trim()) return act.pic.trim();
    const ids = Array.isArray(act.picIds) && act.picIds.length > 0 
      ? act.picIds 
      : (act.picId ? [act.picId] : []);
    if (ids.length === 0) return 'Unassigned';
    
    return ids.map(id => {
      const u = users.find(user => user.id === id);
      if (!u) return null;
      const r = roles.find(role => role.id === u.role_id);
      return `${u.name}${r ? ` (${r.name})` : ''}`;
    }).filter(Boolean).join(', ');
  };

  return (
    <section className="card activity-table-section">
      <div className="table-header-flex">
        <h2>Activity Planning</h2>
        <div className="table-header-actions no-print">
          <button
            type="button"
            className={`btn btn-sm ${showActuals ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowActuals(!showActuals)}
            title="Toggle logging actual start and end dates for milestones"
          >
            <span>{showActuals ? '✓ Actual Dates Visible' : '+ Log Actual Dates'}</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => addActivity('New Activity')}
          >
            <Plus size={16} />
            <span>Add Activity</span>
          </button>
          <span className="hint">Drag and drop to reorder sequence</span>
        </div>
      </div>
      
      <div className="table-responsive">
        <table className="activity-table">
          <thead>
            <tr>
              <th width="40" className="no-print"></th>
              <th width="220">Activity</th>
              <th width="160">Status</th>
              <th width="220">PIC (Assignees)</th>
              <th width="90">Mandays</th>
              <th width="210">Start Dependency</th>
              <th width="140">Planned Start</th>
              <th width="140">Planned End</th>
              {showActuals && <th width="140">Actual Start</th>}
              {showActuals && <th width="140">Actual End</th>}
              <th width="220">Remarks</th>
              <th width="60" style={{ textAlign: 'center' }} className="no-print">Action</th>
            </tr>
          </thead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="activities-list">
              {(provided) => (
                <tbody {...provided.droppableProps} ref={provided.innerRef}>
                  {activities.map((act, index) => {
                    const parsedStart = parseISO(act.startDate);
                    const isNonWorkingStart = isValid(parsedStart) && !isWorkingDay(parsedStart);
                    const statusVal = act.status || 'To Do';

                    return (
                      <Draggable key={act.id} draggableId={act.id} index={index}>
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'is-dragging' : ''}
                          >
                            <td className="drag-handle no-print" {...provided.dragHandleProps}>
                              <GripVertical size={18} />
                            </td>

                            {/* Activity Name */}
                            <td>
                              <span className="print-only print-text">{act.name}</span>
                              <input
                                type="text"
                                value={act.name}
                                onChange={(e) => updateActivity(act.id, 'name', e.target.value)}
                                className="activity-input no-print"
                              />
                            </td>

                            {/* Status Selector */}
                            <td>
                              <span className={`print-only print-text status-badge-print ${statusVal.toLowerCase().replace(' ', '-')}`}>
                                {statusVal}
                              </span>
                              <div className="no-print">
                                <select
                                  value={statusVal}
                                  onChange={(e) => updateActivity(act.id, 'status', e.target.value)}
                                  className={`select-input status-select status-select-${statusVal.toLowerCase().replace(' ', '-')}`}
                                >
                                  <option value="To Do">🔘 To Do</option>
                                  <option value="In Progress">🟡 In Progress</option>
                                  <option value="Done">🟢 Done</option>
                                </select>
                              </div>
                            </td>

                            {/* Multi PIC Selector */}
                            <td>
                              <span className="print-only print-text">
                                {getPrintPicText(act)}
                              </span>
                              <div className="no-print pic-select-cell">
                                <MultiPicSelector 
                                  act={act}
                                  users={users}
                                  roles={roles}
                                  updateActivity={updateActivity}
                                />
                              </div>
                            </td>

                            {/* Mandays */}
                            <td>
                              <span className="print-only print-text">{act.mandays}</span>
                              <input
                                type="number"
                                min="1"
                                value={act.mandays}
                                onChange={(e) => updateActivity(act.id, 'mandays', parseInt(e.target.value) || '')}
                                className="number-input no-print"
                              />
                            </td>

                            {/* Start Dependency */}
                            <td>
                              <span className="print-only print-text">{getDependencyText(act, index)}</span>
                              <div className="dependency-cell no-print">
                                <select
                                  value={act.startMode}
                                  onChange={(e) => updateActivity(act.id, 'startMode', e.target.value)}
                                  className="select-input"
                                >
                                  {renderStartModeOptions(index)}
                                </select>
                                {act.startMode === 'offset_prev' && (
                                  <div className="offset-input-group">
                                    <input
                                      type="number"
                                      min="1"
                                      value={act.offset}
                                      onChange={(e) => updateActivity(act.id, 'offset', parseInt(e.target.value) || 0)}
                                      className="number-input small"
                                    />
                                    <span className="unit">days after prev</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Planned Start */}
                            <td>
                              <div className="start-date-cell">
                                {act.startMode === 'manual' ? (
                                  <>
                                    <span className="print-only print-text">
                                      {act.manualStartDate ? format(parseISO(act.manualStartDate), 'dd MMM yyyy') : '-'}
                                    </span>
                                    <input
                                      type="date"
                                      value={act.manualStartDate || ''}
                                      onChange={(e) => updateActivity(act.id, 'manualStartDate', e.target.value)}
                                      className="date-input no-print"
                                    />
                                  </>
                                ) : (
                                  <span className="calculated-date">
                                    {act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-'}
                                  </span>
                                )}
                                {isNonWorkingStart && act.startMode === 'manual' && (
                                  <div className="warning-tooltip no-print" title="Selected date is a non-working day. It will be pushed to the next working day.">
                                    <AlertCircle size={14} className="warning-icon" />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Planned End */}
                            <td>
                              <span className="calculated-date fw-bold text-primary">
                                {act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-'}
                              </span>
                            </td>

                            {/* Actual Start */}
                            {showActuals && (
                              <td>
                                <span className="print-only print-text">
                                  {act.actualStartDate ? format(parseISO(act.actualStartDate), 'dd MMM yyyy') : '-'}
                                </span>
                                <input
                                  type="date"
                                  value={act.actualStartDate || ''}
                                  onChange={(e) => updateActivity(act.id, 'actualStartDate', e.target.value)}
                                  className="date-input no-print"
                                />
                              </td>
                            )}

                            {/* Actual End */}
                            {showActuals && (
                              <td>
                                <span className="print-only print-text">
                                  {act.actualEndDate ? format(parseISO(act.actualEndDate), 'dd MMM yyyy') : '-'}
                                </span>
                                <input
                                  type="date"
                                  value={act.actualEndDate || ''}
                                  onChange={(e) => updateActivity(act.id, 'actualEndDate', e.target.value)}
                                  className="date-input no-print"
                                />
                              </td>
                            )}

                            {/* Remarks */}
                            <td>
                              <span className="print-only print-text">{act.remarks || '-'}</span>
                              <input
                                type="text"
                                value={act.remarks}
                                onChange={(e) => updateActivity(act.id, 'remarks', e.target.value)}
                                placeholder="Notes..."
                                className="activity-input no-print"
                              />
                            </td>

                            {/* Delete Action */}
                            <td style={{ textAlign: 'center' }} className="no-print">
                              <button
                                type="button"
                                className="btn-icon-danger"
                                onClick={() => deleteActivity(act.id)}
                                title="Delete Activity"
                                disabled={activities.length <= 1}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
              )}
            </Droppable>
          </DragDropContext>
        </table>
        
        <div className="add-activity-footer no-print">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => addActivity('New Activity')}
          >
            <Plus size={16} />
            <span>Add Activity</span>
          </button>
        </div>
      </div>
    </section>
  );
};
