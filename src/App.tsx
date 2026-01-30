import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import JoinSchool from "./pages/JoinSchool";
import CreateSchool from "./pages/admin/CreateSchool";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminScholarships from "./pages/admin/AdminScholarships";
import AdminFees from "./pages/admin/AdminFees";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminSettings from "./pages/admin/AdminSettings";
import Dashboard from "./pages/dashboard/Dashboard";
import Scholarships from "./pages/dashboard/Scholarships";
import Fees from "./pages/dashboard/Fees";
import Notices from "./pages/dashboard/Notices";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/join-school" element={<JoinSchool />} />
            
            {/* Admin routes */}
            <Route path="/admin/create-school" element={<CreateSchool />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/scholarships" element={<AdminScholarships />} />
            <Route path="/admin/fees" element={<AdminFees />} />
            <Route path="/admin/notices" element={<AdminNotices />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            
            {/* Student routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/scholarships" element={<Scholarships />} />
            <Route path="/dashboard/fees" element={<Fees />} />
            <Route path="/dashboard/notices" element={<Notices />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
