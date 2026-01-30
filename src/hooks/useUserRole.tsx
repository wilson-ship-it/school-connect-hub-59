import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<'admin' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setRole(data.role as 'admin' | 'student');
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  return {
    role,
    isAdmin: role === 'admin',
    isStudent: role === 'student',
    loading,
  };
}
