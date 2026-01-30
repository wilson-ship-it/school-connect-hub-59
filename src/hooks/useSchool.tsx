import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface School {
  id: string;
  name: string;
  school_code: string;
  admin_id: string;
}

export function useSchool() {
  const { user, profile } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSchool(null);
      setLoading(false);
      return;
    }

    const fetchSchool = async () => {
      // First try to find school where user is admin
      const { data: adminSchool } = await supabase
        .from('schools')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (adminSchool) {
        setSchool(adminSchool);
        setLoading(false);
        return;
      }

      // Then try to find school by profile's school_code
      if (profile?.school_code) {
        const { data: studentSchool } = await supabase
          .from('schools')
          .select('*')
          .eq('school_code', profile.school_code)
          .single();

        if (studentSchool) {
          setSchool(studentSchool);
        }
      }
      setLoading(false);
    };

    fetchSchool();
  }, [user, profile?.school_code]);

  const createSchool = async (name: string, schoolCode: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const code = schoolCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const { data, error } = await supabase
      .from('schools')
      .insert({
        name,
        school_code: code,
        admin_id: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setSchool(data);
      // Update admin's profile with school code
      await supabase
        .from('profiles')
        .update({ school_code: code })
        .eq('user_id', user.id);
    }

    return { error: error as Error | null, data };
  };

  return {
    school,
    loading,
    createSchool,
  };
}
