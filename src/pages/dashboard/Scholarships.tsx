import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Award, Calendar, DollarSign, Loader2 } from 'lucide-react';

interface Scholarship {
  id: string;
  title: string;
  description: string | null;
  amount: number | null;
  deadline: string | null;
  eligibility: string | null;
}

export default function Scholarships() {
  const { profile, user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.school_code) return;

    const fetchScholarships = async () => {
      const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .eq('school_code', profile.school_code)
        .order('deadline', { ascending: true });

      if (!error && data) {
        setScholarships(data);
      }
      setLoading(false);
    };

    fetchScholarships();
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
    return <Navigate to="/admin/scholarships" replace />;
  }

  if (!profile?.school_code) {
    return <Navigate to="/join-school" replace />;
  }

  const isDeadlineSoon = (deadline: string | null) => {
    if (!deadline) return false;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 7 && days >= 0;
  };

  const isExpired = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
            <Award className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Scholarships</h1>
            <p className="text-muted-foreground">
              Available scholarship opportunities
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : scholarships.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No scholarships available</h3>
              <p className="text-muted-foreground">
                Check back later for new opportunities.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {scholarships.map((scholarship) => {
              const expired = isExpired(scholarship.deadline);
              const deadlineSoon = isDeadlineSoon(scholarship.deadline);

              return (
                <Card
                  key={scholarship.id}
                  className={`transition-all duration-200 hover:shadow-md ${
                    expired ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{scholarship.title}</h3>
                          {expired && <Badge variant="secondary">Expired</Badge>}
                          {deadlineSoon && !expired && (
                            <Badge variant="outline" className="border-orange-500 text-orange-500">
                              Deadline Soon
                            </Badge>
                          )}
                        </div>

                        {scholarship.description && (
                          <p className="text-muted-foreground mb-3">{scholarship.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm">
                          {scholarship.amount && (
                            <div className="flex items-center gap-1 text-green-600 font-medium">
                              <DollarSign className="h-4 w-4" />
                              <span>{scholarship.amount.toLocaleString()}</span>
                            </div>
                          )}
                          {scholarship.deadline && (
                            <div className={`flex items-center gap-1 ${
                              expired ? 'text-muted-foreground' : deadlineSoon ? 'text-orange-500' : 'text-muted-foreground'
                            }`}>
                              <Calendar className="h-4 w-4" />
                              <span>Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {scholarship.eligibility && (
                          <p className="text-sm text-muted-foreground mt-3">
                            <strong>Eligibility:</strong> {scholarship.eligibility}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
