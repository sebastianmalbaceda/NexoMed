import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStream } from '@/hooks/useNotificationStream';
import { useNotificationToast } from '@/hooks/useNotificationToast';
import { Sidebar } from '@/components/hospital/Sidebar';
import { Header } from '@/components/hospital/Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import PatientsPage from '@/pages/PatientsPage';
import BedMapPage from '@/pages/BedMapPage';
import NotificationsPage from '@/pages/NotificationsPage';
import DiagnosticTestsPage from '@/pages/DiagnosticTestsPage';
import UnifiedHistoryPage from '@/pages/UnifiedHistoryPage';
import DoctorPage from '@/pages/DoctorPage';
import NursePage from '@/pages/NursePage';
import TCAEPage from '@/pages/TCAEPage';
import IncidentsPage from '@/pages/IncidentsPage';
import NurseShiftSchedulePage from '@/pages/NurseShiftSchedulePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

/** Full-page layout: sidebar + header + main content */
function AppLayout() {
  const { isAuthenticated, hydrated } = useAuthStore();
  useNotificationStream();
  useNotificationToast();

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected layout */}
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE', 'TCAE']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE']}><PatientsPage /></ProtectedRoute>} />
              <Route path="/patients/:patientId" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE', 'TCAE']}><PatientsPage /></ProtectedRoute>} />
              <Route path="/beds" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE', 'TCAE']}><BedMapPage /></ProtectedRoute>} />
              <Route path="/doctor" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorPage /></ProtectedRoute>} />
              <Route path="/nurse" element={<ProtectedRoute allowedRoles={['NURSE']}><NursePage /></ProtectedRoute>} />
              <Route path="/vitals" element={<ProtectedRoute allowedRoles={['TCAE', 'NURSE']}><TCAEPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE']}><NotificationsPage /></ProtectedRoute>} />
              <Route path="/tests" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE']}><DiagnosticTestsPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE']}><UnifiedHistoryPage /></ProtectedRoute>} />
              <Route path="/incidents" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE', 'TCAE']}><IncidentsPage /></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute allowedRoles={['DOCTOR', 'NURSE', 'TCAE']}><NurseShiftSchedulePage /></ProtectedRoute>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
