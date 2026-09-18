import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any; profile: Profile | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error.message);
        setProfile(null);
        return null;
      }

      if (data) {
        setProfile(data as Profile);
        return data as Profile;
      } else {
        setProfile(null);
        return null;
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Sessão inicial Supabase:', error.message);
        }
        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchProfile(initialSession.user.id);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Erro na inicialização de autenticação:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession?.user) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession.user);
      await fetchProfile(newSession.user.id);
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password: pass });
      if (res.error) {
        setLoading(false);
        return { error: res.error, profile: null };
      }
      if (res.data.user) {
        setSession(res.data.session);
        setUser(res.data.user);
        const loadedProfile = await fetchProfile(res.data.user.id);
        setLoading(false);
        return { error: null, profile: loadedProfile };
      }
      setLoading(false);
      return { error: null, profile: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err, profile: null };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao encerrar sessão:', err);
    } finally {
      setProfile(null);
      setUser(null);
      setSession(null);
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin: profile?.role === 'admin',
        signIn,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};