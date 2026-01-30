import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, DollarSign, Tag, Loader2 } from 'lucide-react';

interface Fee {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  category: string | null;
}

export default function Fees() {
  const { profile, user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.school_code) return;

    const fetchFees = async () => {
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('school_code', profile.school_code)
        .order('due_date', { ascending: true });

      if (!error && data) {
        setFees(data);
      }
      setLoading(false);
    };

    fetchFees();
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
    return <Navigate to="/admin/fees" replace />;
  }

  if (!profile?.school_code) {
    return <Navigate to="/join-school" replace />;
  }

  const isDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 7 && days >= 0;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fees</h1>
              <p className="text-muted-foreground">
                View fee details and due dates
              </p>
            </div>
          </div>

          {fees.length > 0 && (
            <Card className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5" />
                  <div>
                    <p className="text-sm opacity-90">Total Fees</p>
                    <p className="text-xl font-bold">
                      ${totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : fees.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No fees posted</h3>
              <p className="text-muted-foreground">
                Fee information will appear here when available.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fees.map((fee) => {
              const overdue = isOverdue(fee.due_date);
              const dueSoon = isDueSoon(fee.due_date);

              return (
                <Card
                  key={fee.id}
                  className={`transition-all duration-200 hover:shadow-md ${
                    overdue ? 'border-destructive/50 bg-destructive/5' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{fee.title}</h3>
                          {fee.category && (
                            <Badge variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {fee.category}
                            </Badge>
                          )}
                          {overdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                          {dueSoon && !overdue && (
                            <Badge variant="outline" className="border-orange-500 text-orange-500">
                              Due Soon
                            </Badge>
                          )}
                        </div>

                        {fee.description && (
                          <p className="text-sm text-muted-foreground">
                            {fee.description}
                          </p>
                        )}

                        {fee.due_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span
                              className={
                                overdue
                                  ? 'text-destructive font-medium'
                                  : dueSoon
                                  ? 'text-orange-500 font-medium'
                                  : 'text-muted-foreground'
                              }
                            >
                              Due: {new Date(fee.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-accent">
                          ${fee.amount.toLocaleString()}
                        </p>
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
