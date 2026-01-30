import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSchool } from '@/hooks/useSchool';
import { supabase } from '@/integrations/supabase/client';
import { Award, CreditCard, Bell, Users, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Stats {
  scholarships: number;
  fees: number;
  notices: number;
}

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { school, loading: schoolLoading } = useSchool();
  const [stats, setStats] = useState<Stats>({ scholarships: 0, fees: 0, notices: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!school?.school_code) return;

    const fetchStats = async () => {
      const [scholarshipsRes, feesRes, noticesRes] = await Promise.all([
        supabase.from('scholarships').select('id', { count: 'exact' }).eq('school_code', school.school_code),
        supabase.from('fees').select('id', { count: 'exact' }).eq('school_code', school.school_code),
        supabase.from('notices').select('id', { count: 'exact' }).eq('school_code', school.school_code),
      ]);

      setStats({
        scholarships: scholarshipsRes.count || 0,
        fees: feesRes.count || 0,
        notices: noticesRes.count || 0,
      });
    };

    fetchStats();
  }, [school?.school_code]);

  if (authLoading || roleLoading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!school) {
    return <Navigate to="/admin/create-school" replace />;
  }

  const copyCode = () => {
    navigator.clipboard.writeText(school.school_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome, {profile?.full_name || 'Admin'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Manage your school community from here.
          </p>
        </div>

        {/* School Code Card */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm opacity-90 mb-1">Your School Code</p>
                <p className="text-3xl font-bold font-mono tracking-widest">{school.school_code}</p>
                <p className="text-sm opacity-90 mt-2">{school.name}</p>
              </div>
              <Button
                variant="secondary"
                onClick={copyCode}
                className="flex items-center gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>
            <p className="text-sm opacity-75 mt-4">
              Share this code with students so they can join your school community.
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Scholarships</p>
                  <p className="text-3xl font-bold">{stats.scholarships}</p>
                </div>
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fees</p>
                  <p className="text-3xl font-bold">{stats.fees}</p>
                </div>
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Notices</p>
                  <p className="text-3xl font-bold">{stats.notices}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Bell className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Tips */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Go to <strong>Scholarships</strong> to add and manage scholarship opportunities</li>
              <li>• Go to <strong>Fees</strong> to post fee information for students</li>
              <li>• Go to <strong>Notices</strong> to send announcements to your school community</li>
              <li>• Share your school code with students so they can join</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
