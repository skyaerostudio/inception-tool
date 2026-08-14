import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

const LOCAL_AUTH_KEY = 'calendar_app_local_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const hasSupabase = isSupabaseConfigured();

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (hasSupabase && supabase) {
        try {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Error fetching auth session:', error.message);
          }
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoading(false);
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (mounted) {
              setSession(newSession);
              setUser(newSession?.user ?? null);
              setLoading(false);
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        } catch (err) {
          console.error('Supabase Auth init error:', err);
          if (mounted) setLoading(false);
        }
      } else {
        // Local Fallback Mode
        try {
          const savedUser = localStorage.getItem(LOCAL_AUTH_KEY);
          if (savedUser && mounted) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setSession({ user: parsed });
          }
        } catch (err) {
          console.error('Error loading local auth user:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [hasSupabase]);

  // Sign up with Email
  const signUp = async ({ email, password, fullName }) => {
    setAuthError(null);
    if (hasSupabase && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      if (data?.user && !data?.session) {
        // Email confirmation required by Supabase settings
        return { user: data.user, requiresConfirmation: true };
      }

      setUser(data.user);
      setSession(data.session);
      return { user: data.user, session: data.session, requiresConfirmation: false };
    } else {
      // Local fallback mode
      const localUser = {
        id: 'local-user-' + Date.now(),
        email,
        user_metadata: { full_name: fullName || email.split('@')[0] },
        created_at: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
      setUser(localUser);
      setSession({ user: localUser });
      return { user: localUser, requiresConfirmation: false };
    }
  };

  // Sign in with Email & Password
  const signIn = async ({ email, password }) => {
    setAuthError(null);
    if (hasSupabase && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      setUser(data.user);
      setSession(data.session);
      return data;
    } else {
      // Local fallback mode
      const localUser = {
        id: 'local-user-demo',
        email,
        user_metadata: { full_name: email.split('@')[0] },
        created_at: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
      setUser(localUser);
      setSession({ user: localUser });
      return { user: localUser };
    }
  };

  // Sign out
  const signOut = async () => {
    setAuthError(null);
    if (hasSupabase && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
      }
    }
    localStorage.removeItem(LOCAL_AUTH_KEY);
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    loading,
    authError,
    setAuthError,
    signUp,
    signIn,
    signOut,
    isCloudAuth: hasSupabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
