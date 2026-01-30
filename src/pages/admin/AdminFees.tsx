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
import { CreditCard, Plus, Edit, Trash2, Loader2, Calendar, DollarSign, Tag } from 'lucide-react';

interface Fee {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  category: string | null;
}

export default function AdminFees() {
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { school, loading: schoolLoading } = useSchool();
  const { toast } = useToast();
  
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    due_date: '',
    category: '',
  });

  useEffect(() => {
    if (!school?.school_code) return;
    fetchFees();
  }, [school?.school_code]);

  const fetchFees = async () => {
    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('school_code', school!.school_code)
      .order('due_date', { ascending: true });

    if (!error && data) {
      setFees(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', amount: '', due_date: '', category: '' });
    setEditingId(null);
  };

  const openEditDialog = (fee: Fee) => {
    setFormData({
      title: fee.title,
      description: fee.description || '',
      amount: fee.amount.toString(),
      due_date: fee.due_date || '',
      category: fee.category || '',
    });
    setEditingId(fee.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.school_code) return;

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter a valid amount.',
      });
      return;
    }

    setIsSubmitting(true);

    const feeData = {
      school_code: school.school_code,
      title: formData.title,
      description: formData.description || null,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date || null,
      category: formData.category || null,
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('fees')
        .update(feeData)
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('fees')
        .insert(feeData);
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
      title: editingId ? 'Fee updated' : 'Fee added',
      description: editingId ? 'The fee has been updated.' : 'The fee has been added.',
    });

    setIsDialogOpen(false);
    resetForm();
    fetchFees();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('fees')
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
      title: 'Fee deleted',
      description: 'The fee has been removed.',
    });
    fetchFees();
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
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fees</h1>
              <p className="text-muted-foreground">Manage fee information</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Fee' : 'Add New Fee'}</DialogTitle>
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
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Tuition, Lab, Library"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? 'Update' : 'Add Fee'}
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
        ) : fees.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No fees yet</h3>
              <p className="text-muted-foreground mb-4">
                Add fee information for your students.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fees.map((fee) => (
              <Card key={fee.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{fee.title}</h3>
                        {fee.category && (
                          <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {fee.category}
                          </span>
                        )}
                      </div>
                      {fee.description && (
                        <p className="text-muted-foreground mb-3">{fee.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          <span>{fee.amount.toLocaleString()}</span>
                        </div>
                        {fee.due_date && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {new Date(fee.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(fee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(fee.id)}>
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
