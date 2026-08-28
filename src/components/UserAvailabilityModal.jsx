import React, { useState, useEffect } from 'react';
import { X, Activity, UserCheck, AlertTriangle, Search, Filter, Shield, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { parseISO, isWithinInterval, areIntervalsOverlapping, format, isValid } from 'date-fns';

export const UserAvailabilityModal = ({
  users,
  roles,
  fetchAllProjectsActivities,
  onClose
}) => {
  const [projectDataList, setProjectDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'idle' | 'optimal' | 'overloaded'
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      setIsLoading(true);
      const data = await fetchAllProjectsActivities();
      if (isMounted) {
        setProjectDataList(data);
        setIsLoading(false);
      }
    };
    loadAll();
    return () => { isMounted = false; };
  }, []);

  // Compute stats for each user
  const userWorkloadStats = users.map(user => {
    const userRole = roles.find(r => r.id === user.role_id);
    const assignedActivities = [];

    // Collect all activities assigned to this user across projects
    projectDataList.forEach(pData => {
      pData.activities.forEach(act => {
        const assignedIds = Array.isArray(act.picIds) && act.picIds.length > 0
          ? act.picIds
          : (act.picId ? [act.picId] : []);
        
        let isAssigned = assignedIds.includes(user.id);

        // Fallback: match by user name if act.pic string exists
        if (!isAssigned && act.pic && typeof act.pic === 'string') {
          const names = act.pic.split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
          isAssigned = names.includes(user.name.toLowerCase());
        }

        if (isAssigned) {
          assignedActivities.push({
            ...act,
            projectName: pData.project.name,
            projectId: pData.project.id
          });
        }
      });
    });

    const inProgressActs = assignedActivities.filter(a => a.status === 'In Progress');
    const toDoActs = assignedActivities.filter(a => a.status === 'To Do' || !a.status);
    const doneActs = assignedActivities.filter(a => a.status === 'Done');

    // Calculate total active mandays (In Progress + To Do)
    const activeMandays = [...inProgressActs, ...toDoActs].reduce((sum, a) => sum + (parseInt(a.mandays) || 0), 0);
    const inProgressMandays = inProgressActs.reduce((sum, a) => sum + (parseInt(a.mandays) || 0), 0);

    // Detect overlapping intervals among In Progress activities
    let hasScheduleCollision = false;
    for (let i = 0; i < inProgressActs.length; i++) {
      for (let j = i + 1; j < inProgressActs.length; j++) {
        const actA = inProgressActs[i];
        const actB = inProgressActs[j];
        if (actA.startDate && actA.endDate && actB.startDate && actB.endDate) {
          const startA = parseISO(actA.startDate);
          const endA = parseISO(actA.endDate);
          const startB = parseISO(actB.startDate);
          const endB = parseISO(actB.endDate);

          if (isValid(startA) && isValid(endA) && isValid(startB) && isValid(endB)) {
            if (areIntervalsOverlapping({ start: startA, end: endA }, { start: startB, end: endB })) {
              hasScheduleCollision = true;
              break;
            }
          }
        }
      }
      if (hasScheduleCollision) break;
    }

    // Determine Workload Availability Status
    let workloadStatus = 'idle'; // 'idle' | 'optimal' | 'overloaded'
    if (inProgressActs.length === 0) {
      workloadStatus = 'idle';
    } else if (inProgressActs.length >= 3 || hasScheduleCollision) {
      workloadStatus = 'overloaded';
    } else {
      workloadStatus = 'optimal';
    }

    return {
      user,
      role: userRole,
      assignedActivities,
      inProgressActs,
      toDoActs,
      doneActs,
      activeMandays,
      inProgressMandays,
      hasScheduleCollision,
      workloadStatus
    };
  });

  // Filtered stats
  const filteredUserStats = userWorkloadStats.filter(item => {
    const matchesSearch = item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.user.email && item.user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || item.user.role_id === roleFilter;
    const matchesStatus = statusFilter === 'all' || item.workloadStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Overview Counts
  const totalUsers = users.length;
  const idleCount = userWorkloadStats.filter(s => s.workloadStatus === 'idle').length;
  const optimalCount = userWorkloadStats.filter(s => s.workloadStatus === 'optimal').length;
  const overloadedCount = userWorkloadStats.filter(s => s.workloadStatus === 'overloaded').length;

  return (
    <div className="modal-overlay">
      <div className="modal-content availability-matrix-modal glass-panel">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Activity size={24} className="title-icon text-primary" />
            <div>
              <h3>Resource Availability & Activity Matrix</h3>
              <p className="subtitle">Real-time workload monitoring across all project activities</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {isLoading ? (
            <div className="app-loading">
              <div className="spinner"></div>
              <p>Analyzing resource availability & activity schedules...</p>
            </div>
          ) : (
            <>
              {/* Summary Stats Header Row */}
              <div className="availability-summary-grid">
                <div className="summary-card total-card">
                  <div className="summary-icon"><UserCheck size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-value">{totalUsers}</span>
                    <span className="summary-label">Total Team Members</span>
                  </div>
                </div>

                <div className="summary-card idle-card">
                  <div className="summary-icon"><Clock size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-value">{idleCount}</span>
                    <span className="summary-label">Idle / Available</span>
                  </div>
                </div>

                <div className="summary-card optimal-card">
                  <div className="summary-icon"><CheckCircle2 size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-value">{optimalCount}</span>
                    <span className="summary-label">Optimal Capacity</span>
                  </div>
                </div>

                <div className="summary-card overloaded-card">
                  <div className="summary-icon"><AlertTriangle size={20} /></div>
                  <div className="summary-info">
                    <span className="summary-value">{overloadedCount}</span>
                    <span className="summary-label">Overloaded / Collisions</span>
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="manager-top-controls">
                <div className="search-filter-group">
                  <div className="search-input-box">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search PIC name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <select
                    className="select-input"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles ({roles.length})</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>

                  <select
                    className="select-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Workload Statuses</option>
                    <option value="idle">🟢 Idle / Available</option>
                    <option value="optimal">🔵 Optimal</option>
                    <option value="overloaded">🔴 Overloaded</option>
                  </select>
                </div>
              </div>

              {/* Availability Grid / Cards */}
              <div className="availability-grid">
                {filteredUserStats.length === 0 ? (
                  <div className="empty-state-card">
                    <Filter size={32} className="text-muted" />
                    <p>No team members match the selected filter criteria.</p>
                  </div>
                ) : (
                  filteredUserStats.map(item => {
                    const { user, role, inProgressActs, toDoActs, doneActs, inProgressMandays, hasScheduleCollision, workloadStatus } = item;

                    return (
                      <div key={user.id} className={`user-workload-card ${workloadStatus}`}>
                        {/* Card Header */}
                        <div className="workload-card-header">
                          <div className="user-profile-meta">
                            <span
                              className="user-avatar-badge"
                              style={{ backgroundColor: user.avatar_color || '#3b82f6' }}
                            >
                              {user.name.substring(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <h4 className="user-name-title">{user.name}</h4>
                              <span className="role-tag-badge">
                                <Shield size={12} />
                                {role ? role.name : 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          <div className="workload-status-badge-container">
                            {workloadStatus === 'idle' && (
                              <span className="status-pill status-idle">
                                <span className="status-dot"></span> Idle / Available
                              </span>
                            )}
                            {workloadStatus === 'optimal' && (
                              <span className="status-pill status-optimal">
                                <span className="status-dot"></span> Optimal Capacity
                              </span>
                            )}
                            {workloadStatus === 'overloaded' && (
                              <span className="status-pill status-overloaded">
                                <AlertTriangle size={12} /> Overloaded
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Collision Warning */}
                        {hasScheduleCollision && (
                          <div className="collision-warning-banner">
                            <AlertTriangle size={14} />
                            <span>Warning: Multiple concurrent activities overlapping in schedule dates!</span>
                          </div>
                        )}

                        {/* Activity Breakdown Stats */}
                        <div className="activity-stats-row">
                          <div className="stat-box">
                            <span className="stat-num text-warning">{inProgressActs.length}</span>
                            <span className="stat-lbl">In Progress</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-num text-secondary">{toDoActs.length}</span>
                            <span className="stat-lbl">To Do</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-num text-success">{doneActs.length}</span>
                            <span className="stat-lbl">Done</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-num text-primary">{inProgressMandays}</span>
                            <span className="stat-lbl">Active Mandays</span>
                          </div>
                        </div>

                        {/* Activities List Details */}
                        <div className="user-assigned-tasks-list">
                          <h5 className="tasks-section-title">Current & Assigned Activities</h5>
                          {item.assignedActivities.length === 0 ? (
                            <p className="no-tasks-hint">No activities assigned to this user.</p>
                          ) : (
                            item.assignedActivities.map(act => {
                              const isCurrent = act.status === 'In Progress';
                              const isDone = act.status === 'Done';

                              return (
                                <div
                                  key={act.id + act.projectId}
                                  className={`assigned-task-item ${act.status ? act.status.toLowerCase().replace(' ', '-') : 'to-do'}`}
                                >
                                  <div className="task-item-main">
                                    <span className={`task-status-pill status-${act.status ? act.status.toLowerCase().replace(' ', '-') : 'to-do'}`}>
                                      {act.status || 'To Do'}
                                    </span>
                                    <div className="task-info-group">
                                      <span className="task-name">{act.name}</span>
                                      <span className="task-project-name">Project: {act.projectName}</span>
                                    </div>
                                  </div>
                                  <div className="task-item-meta">
                                    <span className="task-date-range">
                                      <Calendar size={12} />
                                      {act.startDate ? format(parseISO(act.startDate), 'dd MMM') : '-'} ~ {act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : '-'}
                                    </span>
                                    <span className="task-mandays">{act.mandays} days</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
