import React, { useState } from 'react';
import { X, UserPlus, ShieldPlus, Trash2, Edit2, Search, User, Shield, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#6366f1', '#ef4444', '#64748b'
];

export const UserManager = ({
  users,
  roles,
  addUser,
  updateUser,
  deleteUser,
  addRole,
  updateRole,
  deleteRole,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // User form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [userColor, setUserColor] = useState('#3b82f6');

  // Role form state
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');

  // Helpers for user form reset
  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserRoleId('');
    setUserColor('#3b82f6');
    setShowAddUser(false);
    setEditingUserId(null);
  };

  const handleStartEditUser = (user) => {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email || '');
    setUserRoleId(user.role_id || '');
    setUserColor(user.avatar_color || '#3b82f6');
    setShowAddUser(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;

    if (editingUserId) {
      updateUser(editingUserId, {
        name: userName,
        email: userEmail,
        role_id: userRoleId || null,
        avatar_color: userColor
      });
    } else {
      addUser({
        name: userName,
        email: userEmail,
        role_id: userRoleId || null,
        avatar_color: userColor
      });
    }
    resetUserForm();
  };

  // Helpers for role form reset
  const resetRoleForm = () => {
    setRoleName('');
    setRoleDesc('');
    setShowAddRole(false);
    setEditingRoleId(null);
  };

  const handleStartEditRole = (role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setShowAddRole(true);
  };

  const handleSaveRole = (e) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    if (editingRoleId) {
      updateRole(editingRoleId, { name: roleName, description: roleDesc });
    } else {
      addRole({ name: roleName, description: roleDesc });
    }
    resetRoleForm();
  };

  // Filtered users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRoleFilter === 'all' || user.role_id === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unassigned';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content user-manager-modal glass-panel">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <User size={24} className="title-icon text-primary" />
            <div>
              <h3>User & Role Management</h3>
              <p className="subtitle">Manage team members, roles, and job assignments</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <User size={16} />
            <span>Users Master ({users.length})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <Shield size={16} />
            <span>Job Roles ({roles.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {activeTab === 'users' ? (
            <div className="users-tab-content">
              {/* Top Controls */}
              <div className="manager-top-controls">
                <div className="search-filter-group">
                  <div className="search-input-box">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="select-input role-filter-select"
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles ({roles.length})</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {!showAddUser && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => { resetUserForm(); setShowAddUser(true); }}
                  >
                    <UserPlus size={16} />
                    <span>Add User</span>
                  </button>
                )}
              </div>

              {/* Add/Edit User Form Drawer */}
              {showAddUser && (
                <form className="user-form-card card" onSubmit={handleSaveUser}>
                  <div className="form-card-header">
                    <h4>{editingUserId ? 'Edit User Details' : 'Create New User'}</h4>
                    <button type="button" className="btn-icon" onClick={resetUserForm}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Budi Santoso"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="activity-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. budi@company.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="activity-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Assigned Role</label>
                      <select
                        value={userRoleId}
                        onChange={(e) => setUserRoleId(e.target.value)}
                        className="select-input"
                      >
                        <option value="">-- Unassigned --</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Avatar Color Tag</label>
                      <div className="color-picker-row">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`color-dot ${userColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setUserColor(color)}
                          >
                            {userColor === color && <Check size={12} color="#fff" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={resetUserForm}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      {editingUserId ? 'Save Changes' : 'Create User'}
                    </button>
                  </div>
                </form>
              )}

              {/* Users List Table */}
              <div className="table-responsive user-list-table-container">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th width="220">User Name</th>
                      <th>Email</th>
                      <th width="180">Role</th>
                      <th width="100" style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-table-cell">
                          No users found matching your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => {
                        const roleObj = roles.find(r => r.id === user.role_id);
                        return (
                          <tr key={user.id}>
                            <td>
                              <div className="user-avatar-cell">
                                <span
                                  className="user-avatar-badge"
                                  style={{ backgroundColor: user.avatar_color || '#3b82f6' }}
                                >
                                  {user.name.substring(0, 2).toUpperCase()}
                                </span>
                                <span className="user-name-text">{user.name}</span>
                              </div>
                            </td>
                            <td className="text-muted">{user.email || '-'}</td>
                            <td>
                              {roleObj ? (
                                <span className="role-tag-badge">
                                  <Shield size={12} />
                                  {roleObj.name}
                                </span>
                              ) : (
                                <span className="role-tag-badge unassigned">Unassigned</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="action-buttons-group">
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Edit User"
                                  onClick={() => handleStartEditUser(user)}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon-danger"
                                  title="Delete User"
                                  onClick={() => {
                                    if (window.confirm(`Delete user "${user.name}"?`)) {
                                      deleteUser(user.id);
                                    }
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="roles-tab-content">
              {/* Top Controls */}
              <div className="manager-top-controls">
                <p className="hint">Define job roles for team allocation (e.g. Business Analyst, QA Tester, Dev)</p>
                {!showAddRole && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => { resetRoleForm(); setShowAddRole(true); }}
                  >
                    <ShieldPlus size={16} />
                    <span>Add Role</span>
                  </button>
                )}
              </div>

              {/* Add/Edit Role Drawer */}
              {showAddRole && (
                <form className="user-form-card card" onSubmit={handleSaveRole}>
                  <div className="form-card-header">
                    <h4>{editingRoleId ? 'Edit Role' : 'Create Custom Role'}</h4>
                    <button type="button" className="btn-icon" onClick={resetRoleForm}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Role Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Security Auditor"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        className="activity-input"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Description / Responsibilities</label>
                      <input
                        type="text"
                        placeholder="e.g. Responsible for vulnerability scans and penetration testing"
                        value={roleDesc}
                        onChange={(e) => setRoleDesc(e.target.value)}
                        className="activity-input"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={resetRoleForm}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      {editingRoleId ? 'Save Changes' : 'Create Role'}
                    </button>
                  </div>
                </form>
              )}

              {/* Roles Table */}
              <div className="table-responsive">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th width="200">Role Name</th>
                      <th>Description</th>
                      <th width="120" style={{ textAlign: 'center' }}>Users</th>
                      <th width="100" style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-table-cell">No roles defined yet.</td>
                      </tr>
                    ) : (
                      roles.map(role => {
                        const assignedUsersCount = users.filter(u => u.role_id === role.id).length;
                        return (
                          <tr key={role.id}>
                            <td>
                              <span className="role-tag-badge">
                                <Shield size={12} />
                                {role.name}
                              </span>
                            </td>
                            <td className="text-muted">{role.description || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge-pill">{assignedUsersCount} users</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="action-buttons-group">
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Edit Role"
                                  onClick={() => handleStartEditRole(role)}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon-danger"
                                  title="Delete Role"
                                  onClick={() => {
                                    if (window.confirm(`Delete role "${role.name}"?`)) {
                                      deleteRole(role.id);
                                    }
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
};
