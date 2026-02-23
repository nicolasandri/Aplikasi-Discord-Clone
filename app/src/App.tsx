import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Login } from '@/components/Login';
import { Register } from '@/components/Register';
import { ChatLayout } from '@/components/ChatLayout';
import { TitleBar } from '@/components/TitleBar';
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
          <AppContent />
        </AuthProvider>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
