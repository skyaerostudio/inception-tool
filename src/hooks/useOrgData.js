import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_DIVISIONS_KEY = 'calendar_app_divisions';
const LOCAL_SQUADS_KEY = 'calendar_app_squads';

export const useOrgData = () => {
  const [divisions, setDivisions] = useState([]);
  const [squads, setSquads] = useState([]);
  const [isOrgLoading, setIsOrgLoading] = useState(true);
  const isCloud = isSupabaseConfigured();

  // Load divisions and squads on mount
  useEffect(() => {
    let isMounted = true;

    const fetchOrgData = async () => {
      setIsOrgLoading(true);

      if (isCloud) {
        try {
          const [divRes, sqRes] = await Promise.all([
            supabase.from('divisions').select('*').order('name', { ascending: true }),
            supabase.from('squads').select('*').order('name', { ascending: true })
          ]);

          if (divRes.error) throw divRes.error;
          if (sqRes.error) throw sqRes.error;

          if (isMounted) {
            setDivisions(divRes.data || []);
            setSquads(sqRes.data || []);
          }
        } catch (err) {
          console.error('Error loading org data from Supabase:', err);
        }
      } else {
        const savedDivisions = localStorage.getItem(LOCAL_DIVISIONS_KEY);
        const savedSquads = localStorage.getItem(LOCAL_SQUADS_KEY);
        if (isMounted) {
          setDivisions(savedDivisions ? JSON.parse(savedDivisions) : []);
          setSquads(savedSquads ? JSON.parse(savedSquads) : []);
        }
      }

      if (isMounted) setIsOrgLoading(false);
    };

    fetchOrgData();
    return () => { isMounted = false; };
  }, []);

  // Save to localStorage helper
  const saveLocalDivisions = useCallback((list) => {
    localStorage.setItem(LOCAL_DIVISIONS_KEY, JSON.stringify(list));
  }, []);

  const saveLocalSquads = useCallback((list) => {
    localStorage.setItem(LOCAL_SQUADS_KEY, JSON.stringify(list));
  }, []);

  // --- Divisions CRUD ---
  const addDivision = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (divisions.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Division "${trimmed}" already exists.`);
      return;
    }

    if (isCloud) {
      try {
        const { data, error } = await supabase
          .from('divisions')
          .insert([{ name: trimmed }])
          .select()
          .single();
        if (error) throw error;
        setDivisions(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error adding division:', err);
      }
    } else {
      const newDiv = { id: 'div_' + Date.now(), name: trimmed, created_at: new Date().toISOString() };
      const updated = [...divisions, newDiv].sort((a, b) => a.name.localeCompare(b.name));
      setDivisions(updated);
      saveLocalDivisions(updated);
    }
  };

  const renameDivision = async (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (isCloud) {
      try {
        const { error } = await supabase.from('divisions').update({ name: trimmed }).eq('id', id);
        if (error) throw error;
        setDivisions(prev => prev.map(d => d.id === id ? { ...d, name: trimmed } : d).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error renaming division:', err);
      }
    } else {
      const updated = divisions.map(d => d.id === id ? { ...d, name: trimmed } : d).sort((a, b) => a.name.localeCompare(b.name));
      setDivisions(updated);
      saveLocalDivisions(updated);
    }
  };

  const deleteDivision = async (id) => {
    if (isCloud) {
      try {
        const { error } = await supabase.from('divisions').delete().eq('id', id);
        if (error) throw error;
        setDivisions(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        console.error('Error deleting division:', err);
      }
    } else {
      const updated = divisions.filter(d => d.id !== id);
      setDivisions(updated);
      saveLocalDivisions(updated);
    }
  };

  // --- Squads CRUD ---
  const addSquad = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (squads.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Squad "${trimmed}" already exists.`);
      return;
    }

    if (isCloud) {
      try {
        const { data, error } = await supabase
          .from('squads')
          .insert([{ name: trimmed }])
          .select()
          .single();
        if (error) throw error;
        setSquads(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error adding squad:', err);
      }
    } else {
      const newSquad = { id: 'sq_' + Date.now(), name: trimmed, created_at: new Date().toISOString() };
      const updated = [...squads, newSquad].sort((a, b) => a.name.localeCompare(b.name));
      setSquads(updated);
      saveLocalSquads(updated);
    }
  };

  const renameSquad = async (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (isCloud) {
      try {
        const { error } = await supabase.from('squads').update({ name: trimmed }).eq('id', id);
        if (error) throw error;
        setSquads(prev => prev.map(s => s.id === id ? { ...s, name: trimmed } : s).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Error renaming squad:', err);
      }
    } else {
      const updated = squads.map(s => s.id === id ? { ...s, name: trimmed } : s).sort((a, b) => a.name.localeCompare(b.name));
      setSquads(updated);
      saveLocalSquads(updated);
    }
  };

  const deleteSquad = async (id) => {
    if (isCloud) {
      try {
        const { error } = await supabase.from('squads').delete().eq('id', id);
        if (error) throw error;
        setSquads(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error('Error deleting squad:', err);
      }
    } else {
      const updated = squads.filter(s => s.id !== id);
      setSquads(updated);
      saveLocalSquads(updated);
    }
  };

  return {
    divisions,
    squads,
    isOrgLoading,
    addDivision,
    renameDivision,
    deleteDivision,
    addSquad,
    renameSquad,
    deleteSquad
  };
};
