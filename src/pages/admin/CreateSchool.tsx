import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSchool } from '@/hooks/useSchool';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { School, Loader2, LogOut, Copy, Check } from 'lucide-react';

export default function CreateSchool() {
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { school, loading: schoolLoading, createSchool } = useSchool();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wait for loading
  if (authLoading || roleLoading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/join-school" replace />;
  }

  // Redirect if already has school
  if (school || profile?.school_code) {
    return <Navigate to="/admin" replace />;
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSchoolCode(code);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(schoolCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (schoolName.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: 'Invalid name',
        description: 'School name must be at least 3 characters.',
      });
      return;
    }

    if (schoolCode.trim().length < 4) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'School code must be at least 4 characters.',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await createSchool(schoolName.trim(), schoolCode.trim());
    
    if (error) {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Failed to create school',
        description: error.message.includes('duplicate')
          ? 'This school code is already taken. Please choose a different one.'
          : error.message,
      });
      return;
    }

    await refreshProfile();
    setIsLoading(false);
    
    toast({
      title: 'School created!',
      description: 'Your school has been set up successfully.',
    });
    navigate('/admin');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <School className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Create Your School</CardTitle>
            <CardDescription className="mt-2">
              Set up your school and get a unique code for students to join
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name</Label>
              <Input
                id="school-name"
                type="text"
                placeholder="e.g., Springfield High School"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school-code">School Code</Label>
              <div className="flex gap-2">
                <Input
                  id="school-code"
                  type="text"
                  placeholder="e.g., SPRING2024"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="text-center font-mono tracking-widest"
                  maxLength={12}
                  required
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Students will use this code to join your school
              </p>
            </div>

            {schoolCode && (
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Your school code:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold font-mono tracking-widest">{schoolCode}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={copyCode}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create School'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
