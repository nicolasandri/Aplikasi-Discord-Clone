import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Login } from '@/components/Login';
import { Register } from '@/components/Register';
import { ChatLayout } from '@/components/ChatLayout';
import { TitleBar } from '@/components/TitleBar';
import { InvitePage } from '@/pages/InvitePage';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Public route component (redirects to home if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  return (
    <div className="flex flex-col h-screen">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <AuthProvider>
          <BrowserRouter>
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
                path="/" 
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
          </BrowserRouter>
        </AuthProvider>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
