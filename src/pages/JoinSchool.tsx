import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { School, Loader2, LogOut } from 'lucide-react';

export default function JoinSchool() {
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { joinSchool, user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wait for loading
  if (loading) {
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

  // Redirect if already joined a school
  if (profile?.school_code) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (schoolCode.trim().length < 4) {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: 'Please enter a valid school code.',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await joinSchool(schoolCode.trim());
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to join school',
        description: error.message,
      });
    } else {
      toast({
        title: 'Welcome!',
        description: 'You have successfully joined your school community.',
      });
      navigate('/dashboard');
    }
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
          <div className="mx-auto w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg">
            <School className="h-8 w-8 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Join Your School</CardTitle>
            <CardDescription className="mt-2">
              Enter your school's unique code to access your community
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-code">School Code</Label>
              <Input
                id="school-code"
                type="text"
                placeholder="e.g., DEMO2024"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-widest"
                maxLength={20}
                required
              />
              <p className="text-xs text-muted-foreground text-center">
                Ask your school administrator for the code
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join School'
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
