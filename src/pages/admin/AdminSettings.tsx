import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSchool } from '@/hooks/useSchool';
import { Settings, Copy, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminSettings() {
  const { profile, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { school, loading: schoolLoading } = useSchool();
  const [copied, setCopied] = useState(false);

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
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your school settings</p>
          </div>
        </div>

        {/* School Info */}
        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
            <CardDescription>Your school details and code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">School Name</p>
              <p className="text-lg font-semibold">{school.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">School Code</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono tracking-widest bg-muted px-4 py-2 rounded-lg">
                  {school.school_code}
                </span>
                <Button variant="outline" onClick={copyCode}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Share this code with students so they can join your school.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Info */}
        <Card>
          <CardHeader>
            <CardTitle>Administrator</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{profile?.full_name}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
