import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_USERS_KEY = 'calendar_app_users';
const LOCAL_ROLES_KEY = 'calendar_app_roles';

const DEFAULT_ROLES = [
  { id: 'role_ba', name: 'Business Analyst', description: 'Requirements gathering & BRD creation' },
  { id: 'role_qa', name: 'QA Tester', description: 'Quality assurance & test execution' },
  { id: 'role_fe', name: 'Frontend Dev', description: 'UI component & web app development' },
  { id: 'role_be', name: 'Backend Dev', description: 'API & database development' },
  { id: 'role_fs', name: 'Fullstack Dev', description: 'End-to-end fullstack development' },
  { id: 'role_tl', name: 'Tech Lead', description: 'Technical architecture & code leadership' },
  { id: 'role_pm', name: 'Project Manager', description: 'Project planning & resource management' },
  { id: 'role_ui', name: 'UI/UX Designer', description: 'Product design & wireframes' },
  { id: 'role_devops', name: 'DevOps', description: 'Infrastructure & deployment pipeline' }
];

const DEFAULT_USERS = [
  { id: 'user_1', name: 'Alex Johnson', email: 'alex.j@example.com', role_id: 'role_pm', avatar_color: '#8b5cf6' },
  { id: 'user_2', name: 'Budi Santoso', email: 'budi.s@example.com', role_id: 'role_ba', avatar_color: '#3b82f6' },
  { id: 'user_3', name: 'Citra Dewi', email: 'citra.d@example.com', role_id: 'role_fe', avatar_color: '#10b981' },
  { id: 'user_4', name: 'Deni Kurniawan', email: 'deni.k@example.com', role_id: 'role_be', avatar_color: '#f59e0b' },
  { id: 'user_5', name: 'Eka Rahma', email: 'eka.r@example.com', role_id: 'role_qa', avatar_color: '#ec4899' }
];

export const useUserData = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const isCloud = isSupabaseConfigured();

  // Fetch users and roles on mount
  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      setIsUserLoading(true);

      if (isCloud) {
        try {
          const [rolesRes, usersRes] = await Promise.all([
            supabase.from('roles').select('*').order('name', { ascending: true }),
            supabase.from('users').select('*').order('name', { ascending: true })
          ]);

          if (rolesRes.error) throw rolesRes.error;
          if (usersRes.error) throw usersRes.error;

          if (isMounted) {
            setRoles(rolesRes.data || []);
            setUsers(usersRes.data || []);
          }
        } catch (err) {
          console.error('Error loading users/roles from Supabase:', err);
        }
      } else {
        const savedRoles = localStorage.getItem(LOCAL_ROLES_KEY);
        const savedUsers = localStorage.getItem(LOCAL_USERS_KEY);

        let rolesList = savedRoles ? JSON.parse(savedRoles) : DEFAULT_ROLES;
        let usersList = savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS;

        if (!savedRoles) {
          localStorage.setItem(LOCAL_ROLES_KEY, JSON.stringify(DEFAULT_ROLES));
        }
        if (!savedUsers) {
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_USERS));
        }

        if (isMounted) {
          setRoles(rolesList);
          setUsers(usersList);
        }
      }

      if (isMounted) setIsUserLoading(false);
    };

    fetchUserData();
    return () => { isMounted = false; };
  }, [isCloud]);

  // Helpers for local storage
  const saveLocalRoles = useCallback((list) => {
    localStorage.setItem(LOCAL_ROLES_KEY, JSON.stringify(list));
  }, []);

  const saveLocalUsers = useCallback((list) => {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  }, []);

  // --- Roles CRUD ---
  const addRole = async ({ name, description = '' }) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (roles.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Role "${trimmed}" already exists.`);
      return;
    }

    if (isCloud) {
      try {
        const { data, error } = await supabase
          .from('roles')
          .insert([{ name: trimmed, description: description.trim() }])
          .select()
          .single();
        if (error) throw error;
        setRoles(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error adding role:', err);
      }
    } else {
      const newRole = {
        id: 'role_' + Date.now(),
        name: trimmed,
        description: description.trim(),
        created_at: new Date().toISOString()
      };
      const updated = [...roles, newRole].sort((a, b) => a.name.localeCompare(b.name));
      setRoles(updated);
      saveLocalRoles(updated);
    }
  };

  const updateRole = async (id, { name, description }) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isCloud) {
      try {
        const { error } = await supabase
          .from('roles')
          .update({ name: trimmed, description: description.trim() })
          .eq('id', id);
        if (error) throw error;
        setRoles(prev => prev.map(r => r.id === id ? { ...r, name: trimmed, description: description.trim() } : r));
      } catch (err) {
        console.error('Error updating role:', err);
      }
    } else {
      const updated = roles.map(r => r.id === id ? { ...r, name: trimmed, description: description.trim() } : r);
      setRoles(updated);
      saveLocalRoles(updated);
    }
  };

  const deleteRole = async (id) => {
    if (isCloud) {
      try {
        const { error } = await supabase.from('roles').delete().eq('id', id);
        if (error) throw error;
        setRoles(prev => prev.filter(r => r.id !== id));
      } catch (err) {
        console.error('Error deleting role:', err);
      }
    } else {
      const updated = roles.filter(r => r.id !== id);
      setRoles(updated);
      saveLocalRoles(updated);
    }
  };

  // --- Users CRUD ---
  const addUser = async ({ name, email = '', role_id = null, avatar_color = '#3b82f6' }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (isCloud) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            name: trimmedName,
            email: email.trim() || null,
            role_id: role_id || null,
            avatar_color
          }])
          .select()
          .single();
        if (error) throw error;
        setUsers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error adding user:', err);
      }
    } else {
      const newUser = {
        id: 'user_' + Date.now(),
        name: trimmedName,
        email: email.trim(),
        role_id: role_id || null,
        avatar_color: avatar_color || '#3b82f6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const updated = [...users, newUser].sort((a, b) => a.name.localeCompare(b.name));
      setUsers(updated);
      saveLocalUsers(updated);
    }
  };

  const updateUser = async (id, { name, email, role_id, avatar_color }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (isCloud) {
      try {
        const { error } = await supabase
          .from('users')
          .update({
            name: trimmedName,
            email: email ? email.trim() : null,
            role_id: role_id || null,
            avatar_color: avatar_color || '#3b82f6',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === id ? {
          ...u,
          name: trimmedName,
          email: email ? email.trim() : '',
          role_id: role_id || null,
          avatar_color: avatar_color || u.avatar_color
        } : u));
      } catch (err) {
        console.error('Error updating user:', err);
      }
    } else {
      const updated = users.map(u => u.id === id ? {
        ...u,
        name: trimmedName,
        email: email ? email.trim() : '',
        role_id: role_id || null,
        avatar_color: avatar_color || u.avatar_color,
        updated_at: new Date().toISOString()
      } : u);
      setUsers(updated);
      saveLocalUsers(updated);
    }
  };

  const deleteUser = async (id) => {
    if (isCloud) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    } else {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      saveLocalUsers(updated);
    }
  };

  return {
    users,
    roles,
    isUserLoading,
    addUser,
    updateUser,
    deleteUser,
    addRole,
    updateRole,
    deleteRole
  };
};
