import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Award, CreditCard, Bell, ArrowRight, Calendar, Loader2, Mic } from 'lucide-react';

interface Stats {
  scholarships: number;
  notices: number;
}

export default function Dashboard() {
  const { profile, user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<Stats>({ scholarships: 0, notices: 0 });
  const [recentNotices, setRecentNotices] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.school_code) return;

    const fetchStats = async () => {
      const [scholarshipsRes, noticesRes] = await Promise.all([
        supabase.from('scholarships').select('id', { count: 'exact' }).eq('school_code', profile.school_code),
        supabase.from('notices').select('id', { count: 'exact' }).eq('school_code', profile.school_code),
      ]);

      setStats({
        scholarships: scholarshipsRes.count || 0,
        notices: noticesRes.count || 0,
      });

      // Fetch recent notices
      const { data: notices } = await supabase
        .from('notices')
        .select('*')
        .eq('school_code', profile.school_code)
        .order('created_at', { ascending: false })
        .limit(3);

      if (notices) setRecentNotices(notices);
    };

    fetchStats();
  }, [profile?.school_code]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (!profile?.school_code) {
    return <Navigate to="/join-school" replace />;
  }

  const quickActions = [
    {
      href: '/dashboard/scholarships',
      label: 'Scholarships',
      description: 'View available scholarships',
      icon: Award,
      color: 'bg-secondary/10 text-secondary',
      count: stats.scholarships,
    },
    {
      href: '/dashboard/fees',
      label: 'Fees',
      description: 'Check fee information',
      icon: CreditCard,
      color: 'bg-accent/10 text-accent',
    },
    {
      href: '/dashboard/notices',
      label: 'Notices',
      description: 'Read announcements',
      icon: Bell,
      color: 'bg-blue-500/10 text-blue-500',
      count: stats.notices,
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your school community today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Scholarships</p>
                  <p className="text-3xl font-bold">{stats.scholarships}</p>
                </div>
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Announcements</p>
                  <p className="text-3xl font-bold">{stats.notices}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Bell className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} to={action.href}>
                  <Card className="h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer group">
                    <CardContent className="p-5">
                      <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-4`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{action.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {action.description}
                          </p>
                        </div>
                        {action.count !== undefined && action.count > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {action.count}
                          </Badge>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground mt-4 group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Voice Assistant Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">AI Voice Assistant</h2>
          <Link to="/dashboard/voice">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                    <Mic className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Talk to your AI Assistant</h3>
                    <p className="text-muted-foreground">
                      Ask about scholarships, fees, notices, and more using your voice
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Notices */}
        {recentNotices.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Notices</h2>
              <Link
                to="/dashboard/notices"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid gap-4">
              {recentNotices.map((notice) => (
                <Card key={notice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bell className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{notice.title}</h3>
                          {notice.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">Urgent</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notice.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(notice.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
