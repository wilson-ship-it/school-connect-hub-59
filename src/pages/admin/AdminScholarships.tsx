import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSchool } from '@/hooks/useSchool';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Award, Plus, Edit, Trash2, Loader2, Calendar, DollarSign } from 'lucide-react';

interface Scholarship {
  id: string;
  title: string;
  description: string | null;
  amount: number | null;
  deadline: string | null;
  eligibility: string | null;
}

export default function AdminScholarships() {
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { school, loading: schoolLoading } = useSchool();
  const { toast } = useToast();
  
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: '',
    eligibility: '',
  });

  useEffect(() => {
    if (!school?.school_code) return;
    fetchScholarships();
  }, [school?.school_code]);

  const fetchScholarships = async () => {
    const { data, error } = await supabase
      .from('scholarships')
      .select('*')
      .eq('school_code', school!.school_code)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setScholarships(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', amount: '', deadline: '', eligibility: '' });
    setEditingId(null);
  };

  const openEditDialog = (scholarship: Scholarship) => {
    setFormData({
      title: scholarship.title,
      description: scholarship.description || '',
      amount: scholarship.amount?.toString() || '',
      deadline: scholarship.deadline || '',
      eligibility: scholarship.eligibility || '',
    });
    setEditingId(scholarship.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.school_code) return;

    setIsSubmitting(true);

    const scholarshipData = {
      school_code: school.school_code,
      title: formData.title,
      description: formData.description || null,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      deadline: formData.deadline || null,
      eligibility: formData.eligibility || null,
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('scholarships')
        .update(scholarshipData)
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('scholarships')
        .insert(scholarshipData);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return;
    }

    toast({
      title: editingId ? 'Scholarship updated' : 'Scholarship added',
      description: editingId ? 'The scholarship has been updated.' : 'The scholarship has been added.',
    });

    setIsDialogOpen(false);
    resetForm();
    fetchScholarships();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('scholarships')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Scholarship deleted',
      description: 'The scholarship has been removed.',
    });
    fetchScholarships();
  };

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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
              <Award className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Scholarships</h1>
              <p className="text-muted-foreground">Manage scholarship opportunities</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Scholarship
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Scholarship' : 'Add New Scholarship'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eligibility">Eligibility Requirements</Label>
                  <Textarea
                    id="eligibility"
                    value={formData.eligibility}
                    onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? 'Update' : 'Add Scholarship'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : scholarships.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No scholarships yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first scholarship opportunity for students.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Scholarship
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {scholarships.map((scholarship) => (
              <Card key={scholarship.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{scholarship.title}</h3>
                      {scholarship.description && (
                        <p className="text-muted-foreground mb-3">{scholarship.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {scholarship.amount && (
                          <div className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-4 w-4" />
                            <span>{scholarship.amount.toLocaleString()}</span>
                          </div>
                        )}
                        {scholarship.deadline && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      {scholarship.eligibility && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <strong>Eligibility:</strong> {scholarship.eligibility}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(scholarship)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(scholarship.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
