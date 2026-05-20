import { useState, useEffect } from 'react';
import { Guest } from './types';
import { apiGetGuestByToken, apiCheckAuth, apiLogin, apiLogout } from './api';
import InvitationPage from './components/InvitationPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import UnauthorizedPage from './components/UnauthorizedPage';

type AppView = 'loading' | 'invitation' | 'unauthorized' | 'admin-login' | 'admin-dashboard';

function getInviteToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('invite');
}

function isAdminRoute(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('admin') === 'true' || window.location.hash === '#admin';
}

export default function App() {
  const [view, setView] = useState<AppView>('loading');
  const [guest, setGuest] = useState<Guest | null>(null);

  useEffect(() => {
    const init = async () => {
      const token = getInviteToken();

      if (isAdminRoute()) {
        const authenticated = await apiCheckAuth();
        if (authenticated) {
          setView('admin-dashboard');
        } else {
          setView('admin-login');
        }
        return;
      }

      if (token) {
        const response = await apiGetGuestByToken(token);
        if (response && response.guest) {
          setGuest(response.guest);
          setView('invitation');
        } else {
          setView('unauthorized');
        }
      } else {
        setView('unauthorized');
      }
    };

    init();
  }, []);

  const handleAdminLogin = async (username: string, password: string) => {
    await apiLogin(username, password);
    setView('admin-dashboard');
  };

  const handleAdminLogout = async () => {
    await apiLogout();
    setView('admin-login');
  };

  const handleRsvpSubmitted = (updatedGuest: Guest) => {
    setGuest(updatedGuest);
  };

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-[#fdf8f0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#b8860b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9b8878] text-sm font-light">Chargement...</p>
        </div>
      </div>
    );
  }

  if (view === 'invitation' && guest) {
    return <InvitationPage guest={guest} onRsvpSubmitted={handleRsvpSubmitted} />;
  }

  if (view === 'admin-login') {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (view === 'admin-dashboard') {
    return <AdminDashboard onLogout={handleAdminLogout} />;
  }

  return <UnauthorizedPage />;
}
