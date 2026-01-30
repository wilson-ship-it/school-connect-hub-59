import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Calendar, AlertTriangle, Info, Megaphone, Loader2 } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  created_at: string;
}

export default function Notices() {
  const { profile, user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.school_code) return;

    const fetchNotices = async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('school_code', profile.school_code)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotices(data);
      }
      setLoading(false);
    };

    fetchNotices();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notices-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notices',
          filter: `school_code=eq.${profile.school_code}`,
        },
        (payload) => {
          setNotices((prev) => [payload.new as Notice, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    return <Navigate to="/admin/notices" replace />;
  }

  if (!profile?.school_code) {
    return <Navigate to="/join-school" replace />;
  }

  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'low':
        return <Info className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Bell className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notices</h1>
            <p className="text-muted-foreground">
              Stay updated with school announcements
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notices.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No notices yet</h3>
              <p className="text-muted-foreground">
                School announcements will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <Card
                key={notice.id}
                className={`transition-all duration-200 hover:shadow-md ${
                  notice.priority === 'high'
                    ? 'border-destructive/30 bg-destructive/5'
                    : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          notice.priority === 'high'
                            ? 'bg-destructive/10'
                            : 'bg-blue-500/10'
                        }`}
                      >
                        {getPriorityIcon(notice.priority)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg leading-tight">
                          {notice.title}
                        </h3>
                        {getPriorityBadge(notice.priority)}
                      </div>

                      <p className="text-muted-foreground whitespace-pre-wrap mb-3">
                        {notice.content}
                      </p>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(notice.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
