import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Login } from '@/components/Login';
import { Register } from '@/components/Register';
import { ChatLayout } from '@/components/ChatLayout';
import { TitleBar } from '@/components/TitleBar';
import { InvitePage } from '@/pages/InvitePage';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  if (isAuthenticated) {
    return <ChatLayout />;
  }

  return showLogin ? (
    <Login onToggleForm={() => setShowLogin(false)} />
  ) : (
    <Register onToggleForm={() => setShowLogin(true)} />
  );
}

function App() {
  return (
    <div className="flex flex-col h-screen">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/invite/:code" element={<InvitePage />} />
              <Route path="/*" element={<AppContent />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
