import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { isWorkingDay } from '../utils/dateCalculations';

export const ActivityTable = ({ 
  activities, 
  updateActivity, 
  reorderActivities, 
  addActivity, 
  deleteActivity 
}) => {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    reorderActivities(result.source.index, result.destination.index);
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

  return (
    <section className="card activity-table-section">
      <div className="table-header-flex">
        <h2>Activity Planning</h2>
        <div className="table-header-actions">
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
              <th width="40"></th>
              <th width="200">Activity</th>
              <th width="100">Mandays</th>
              <th width="220">Start Dependency</th>
              <th width="150">Start Date</th>
              <th width="150">End Date</th>
              <th>Remarks</th>
              <th width="50" style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="activities-list">
              {(provided) => (
                <tbody {...provided.droppableProps} ref={provided.innerRef}>
                  {activities.map((act, index) => {
                    const parsedStart = parseISO(act.startDate);
                    const isNonWorkingStart = isValid(parsedStart) && !isWorkingDay(parsedStart);

                    return (
                      <Draggable key={act.id} draggableId={act.id} index={index}>
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'is-dragging' : ''}
                          >
                            <td className="drag-handle" {...provided.dragHandleProps}>
                              <GripVertical size={18} />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={act.name}
                                onChange={(e) => updateActivity(act.id, 'name', e.target.value)}
                                className="activity-input"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={act.mandays}
                                onChange={(e) => updateActivity(act.id, 'mandays', parseInt(e.target.value) || '')}
                                className="number-input"
                              />
                            </td>
                            <td>
                              <div className="dependency-cell">
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
                            <td>
                              <div className="start-date-cell">
                                {act.startMode === 'manual' ? (
                                  <input
                                    type="date"
                                    value={act.manualStartDate || ''}
                                    onChange={(e) => updateActivity(act.id, 'manualStartDate', e.target.value)}
                                    className="date-input"
                                  />
                                ) : (
                                  <span className="calculated-date">
                                    {act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : '-'}
                                  </span>
                                )}
                                {isNonWorkingStart && act.startMode === 'manual' && (
                                  <div className="warning-tooltip" title="Selected date is a non-working day. It will be pushed to the next working day.">
                                    <AlertCircle size={14} className="warning-icon" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="calculated-date fw-bold text-primary">
                                {act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-'}
                              </span>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={act.remarks}
                                onChange={(e) => updateActivity(act.id, 'remarks', e.target.value)}
                                placeholder="Notes..."
                                className="activity-input"
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
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
        
        <div className="add-activity-footer">
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

