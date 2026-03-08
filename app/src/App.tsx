import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Login } from '@/components/Login';
import { Register } from '@/components/Register';
import { ChatLayout } from '@/components/ChatLayout';
import { TitleBar } from '@/components/TitleBar';
import { InvitePage } from '@/pages/InvitePage';
import { MasterAdminDashboard } from '@/components/MasterAdminDashboard';
import { ForceChangePassword } from '@/components/ForceChangePassword';
import { Toaster } from '@/components/ui/sonner';
import './App.css';
import { useState, useEffect } from 'react';

// Wrapper for ForceChangePassword to handle redirect after password change
function ForceChangePasswordWrapper() {
  const { needsPasswordChange, checking, clearPasswordChange } = useForcePasswordChange();
  const { isAuthenticated } = useAuth();

  if (checking) return null;

  // If user doesn't need password change and is not authenticated, redirect to login
  if (!needsPasswordChange && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user doesn't need password change but is authenticated, redirect to home
  if (!needsPasswordChange && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <ForceChangePassword onPasswordChanged={clearPasswordChange} />;
}

// Check if user needs to force change password
function useForcePasswordChange() {
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPasswordChange = () => {
      const tempUser = localStorage.getItem('tempUser');
      const token = localStorage.getItem('token');
      // If tempUser exists in localStorage, it means user needs to change password
      if (tempUser && token) {
        setNeedsPasswordChange(true);
      }
      setChecking(false);
    };
    checkPasswordChange();
  }, []);

  const clearPasswordChange = () => {
    localStorage.removeItem('tempUser');
    setNeedsPasswordChange(false);
  };

  return { needsPasswordChange, checking, clearPasswordChange };
}

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { needsPasswordChange, checking } = useForcePasswordChange();

  if (checking) return null;
  
  // If needs password change, redirect to force change password page
  if (needsPasswordChange) {
    return <Navigate to="/force-change-password" replace />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Public route component (redirects to home if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use HashRouter for Electron, BrowserRouter for web
const Router = isElectron ? HashRouter : BrowserRouter;

function App() {
  return (
    <div className="flex flex-col h-screen">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <AuthProvider>
          <Router>
            <Routes>
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/invite/:code" 
                element={<InvitePage />} 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <MasterAdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/force-change-password" 
                element={
                  <ForceChangePasswordWrapper />
                } 
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <ChatLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/friends" 
                element={
                  <ProtectedRoute>
                    <ChatLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/channels/:serverId/:channelId" 
                element={
                  <ProtectedRoute>
                    <ChatLayout />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="*" 
                element={<Navigate to="/" replace />} 
              />
            </Routes>
          </Router>
        </AuthProvider>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
