import { useState, useEffect } from 'react';
import { Guest, WeddingInfo } from '../types';
import {
  apiGetGuests,
  apiAddGuest,
  apiDeleteGuest,
  generateInviteLink,
  apiGetWeddingInfo,
  apiSaveWeddingInfo,
  apiChangePassword,
  apiGetUsers,
  apiCreateUser,
  apiDeleteUser,
  apiGetCurrentUser,
  apiUpdateCurrentUser,
  AdminUser,
} from '../api';

interface Props {
  onLogout: () => void;
}

type Tab = 'guests' | 'settings' | 'users' | 'account';

function StatusBadge({ status }: { status: Guest['rsvpStatus'] }) {
  const config = {
    pending: { label: 'En attente', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    confirmed: { label: 'Confirmé ✓', class: 'bg-green-50 text-green-700 border-green-200' },
    declined: { label: 'Décliné ✗', class: 'bg-red-50 text-red-700 border-red-200' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${c.class}`}>
      {c.label}
    </span>
  );
}

export default function AdminDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('guests');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Guest['rsvpStatus']>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Guest | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add guest form
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', plusOne: false,
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Settings
  const [weddingInfo, setWeddingInfo] = useState<WeddingInfo>({
    groomName: '', brideName: '', date: '', time: '',
    venueName: '', venueAddress: '', receptionTime: '',
    receptionVenue: '', receptionAddress: '', dressCode: '', rsvpDeadline: '',
    lang: 'fr', card2Text: '',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSaved, setPassSaved] = useState(false);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '', firstName: '', lastName: '', isSuperuser: false });
  const [userFormError, setUserFormError] = useState('');
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userDeleted, setUserDeleted] = useState(false);

  // Account
  const [currentUser, setCurrentUser] = useState<{ username: string; firstName: string; lastName: string; email: string; isSuperuser: boolean }>({ username: '', firstName: '', lastName: '', email: '', isSuperuser: false });
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  const refresh = async () => {
    try {
      const data = await apiGetGuests();
      setGuests(data);
    } catch (err: any) {
      console.error('Failed to load guests:', err);
    }
  };

  useEffect(() => {
    if (currentUser.username && !currentUser.isSuperuser && (tab === 'settings' || tab === 'users')) {
      setTab('guests');
    }
  }, [tab, currentUser]);

  useEffect(() => {
    refresh();
    const loadWeddingInfo = async () => {
      try {
        const info = await apiGetWeddingInfo();
        setWeddingInfo(info);
      } catch (err: any) {
        console.error('Failed to load wedding info:', err);
      }
    };
    loadWeddingInfo();
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiGetUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const data = await apiGetCurrentUser();
      setCurrentUser(data);
    } catch (err: any) {
      console.error('Failed to load current user:', err);
    }
  };

  const filteredGuests = guests.filter(g => {
    const matchSearch = `${g.firstName} ${g.lastName} ${g.email || ''} ${g.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.rsvpStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvpStatus === 'confirmed').length,
    declined: guests.filter(g => g.rsvpStatus === 'declined').length,
    pending: guests.filter(g => g.rsvpStatus === 'pending').length,
    totalAttending: guests
      .filter(g => g.rsvpStatus === 'confirmed')
      .reduce((sum, g) => sum + (g.numberOfGuests || 1), 0),
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.firstName || !form.lastName || !form.phone) {
      setFormError('Prénom, nom et téléphone sont requis.');
      return;
    }
    setFormLoading(true);
    try {
      await apiAddGuest({ ...form });
      await refresh();
      setForm({ firstName: '', lastName: '', email: '', phone: '', plusOne: false });
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(err?.message || 'Erreur lors de l\'ajout de l\'invité.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteGuest(id);
      await refresh();
      setShowDeleteConfirm(null);
      if (showDetailModal?.id === id) setShowDetailModal(null);
    } catch (err: any) {
      console.error('Failed to delete guest:', err);
    }
  };

  const handleCopyLink = async (guest: Guest) => {
    const link = generateInviteLink(guest.token);
    await navigator.clipboard.writeText(link);
    setCopiedId(guest.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = (guest: Guest) => {
    if (!guest.phone) {
      alert('Aucun numéro de téléphone renseigné pour cet invité.');
      return;
    }
    const link = generateInviteLink(guest.token);
    const message = encodeURIComponent(
      `Bonjour ${guest.firstName} ! 👋\n\nVous êtes invité(e) au mariage de ${weddingInfo.groomName} & ${weddingInfo.brideName}.\n\nVoici votre lien d'invitation personnalisé :\n${link}\n\nMerci de confirmer votre présence via ce lien. 💍`
    );
    const phone = guest.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const saved = await apiSaveWeddingInfo(weddingInfo);
      setWeddingInfo(saved);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to save wedding info:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!newPassword || newPassword.length < 6) {
      setPassError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Les mots de passe ne correspondent pas.');
      return;
    }
    try {
      await apiChangePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPassSaved(true);
      setTimeout(() => setPassSaved(false), 2000);
    } catch (err: any) {
      setPassError(err?.message || 'Erreur lors du changement de mot de passe.');
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountLoading(true);
    try {
      const saved = await apiUpdateCurrentUser({ firstName: currentUser.firstName, lastName: currentUser.lastName, email: currentUser.email });
      setCurrentUser(saved);
      setAccountSaved(true);
      setTimeout(() => setAccountSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to update account:', err);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    if (!userForm.username || !userForm.password) {
      setUserFormError('Le nom d\'utilisateur et le mot de passe sont requis.');
      return;
    }
    setUserFormLoading(true);
    try {
      await apiCreateUser(userForm);
      await loadUsers();
      setUserForm({ username: '', password: '', email: '', firstName: '', lastName: '', isSuperuser: false });
      setShowAddUserModal(false);
    } catch (err: any) {
      setUserFormError(err?.message || 'Erreur lors de la création de l\'utilisateur.');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await apiDeleteUser(id);
      await loadUsers();
      setUserDeleted(true);
      setTimeout(() => setUserDeleted(false), 2000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression de l\'utilisateur.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2d1f14] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#b8860b] to-[#d4a017] rounded-lg flex items-center justify-center">
                <span className="text-sm">💍</span>
              </div>
              <div>
                <h1 className="text-white font-medium text-sm tracking-wide">Mariage — Administration</h1>
                <p className="text-[#9b8878] text-xs">{weddingInfo.groomName} & {weddingInfo.brideName} • {weddingInfo.date}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-[#9b8878] hover:text-white transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { key: 'guests', label: 'Invités', icon: '👥' },
              ...(currentUser.isSuperuser
                ? [
                    { key: 'settings', label: 'Mariage', icon: '💍' },
                    { key: 'users', label: 'Utilisateurs', icon: '🔑' },
                  ]
                : []),
              { key: 'account', label: 'Mon compte', icon: '👤' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as Tab)}
                className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  tab === t.key
                    ? 'border-[#b8860b] text-[#b8860b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ===== GUESTS TAB ===== */}
        {tab === 'guests' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total invités', value: stats.total, color: 'from-[#4a3728] to-[#6b5744]', icon: '👥' },
                { label: 'Confirmés', value: stats.confirmed, color: 'from-green-500 to-green-600', icon: '✅' },
                { label: 'Déclinés', value: stats.declined, color: 'from-red-400 to-red-500', icon: '❌' },
                { label: 'En attente', value: stats.pending, color: 'from-amber-400 to-amber-500', icon: '⏳' },
              ].map(s => (
                <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-md`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-3xl font-bold">{s.value}</span>
                  </div>
                  <p className="text-white/80 text-sm">{s.label}</p>
                </div>
              ))}
            </div>

            {stats.confirmed > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-3">
                <span className="text-green-600 text-xl">🥂</span>
                <p className="text-green-700 text-sm font-medium">
                  <strong>{stats.totalAttending} personnes</strong> assisteront à la cérémonie au total.
                </p>
              </div>
            )}

            {/* Actions bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:flex-1">
                <div className="relative w-full sm:max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Rechercher un invité..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 bg-white"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="w-full sm:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] bg-white text-gray-700"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmés</option>
                  <option value="declined">Déclinés</option>
                </select>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#b8860b] to-[#d4a017] hover:from-[#a07709] hover:to-[#b8860b] text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un invité
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {filteredGuests.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-5xl mb-4 block">👥</span>
                  <p className="text-gray-400 text-sm">
                    {guests.length === 0 ? 'Aucun invité enregistré. Commencez par en ajouter !' : 'Aucun résultat pour votre recherche.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Invité</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Personnes</th>
                        <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredGuests.map(guest => (
                        <tr key={guest.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-[#b8860b]/20 to-[#d4a017]/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-[#b8860b] font-medium text-sm">
                                  {guest.firstName[0]}{guest.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{guest.firstName} {guest.lastName}</p>
                                {guest.plusOne && (
                                  <p className="text-xs text-gray-400">+1 autorisé</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <p className="text-sm text-gray-600">{guest.email}</p>
                            {guest.phone && <p className="text-xs text-gray-400">{guest.phone}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={guest.rsvpStatus} />
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span className="text-sm text-gray-600">
                              {guest.rsvpStatus === 'confirmed' ? `${guest.numberOfGuests || 1} pers.` : '—'}
                            </span>
                          </td>
                           <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* WhatsApp */}
                              <button
                                onClick={() => handleSendWhatsApp(guest)}
                                title="Envoyer par WhatsApp"
                                className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </button>
                              {/* Copy link */}
                              <button
                                onClick={() => handleCopyLink(guest)}
                                title="Copier le lien d'invitation"
                                className="p-2 text-gray-400 hover:text-[#b8860b] hover:bg-[#b8860b]/10 rounded-lg transition-colors"
                              >
                                {copiedId === guest.id ? (
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                              {/* View details */}
                              <button
                                onClick={() => setShowDetailModal(guest)}
                                title="Voir les détails"
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => setShowDeleteConfirm(guest.id)}
                                title="Supprimer"
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {tab === 'settings' && currentUser.isSuperuser && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <span>💍</span> Informations du mariage
              </h2>
              <form onSubmit={handleSaveSettings}>
                {/* Les mariés */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#b8860b] uppercase tracking-wider mb-3 pb-2 border-b border-[#b8860b]/20">Les mariés</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prénom du marié</label>
                      <input type="text" value={weddingInfo.groomName} onChange={e => setWeddingInfo(prev => ({ ...prev, groomName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prénom de la mariée</label>
                      <input type="text" value={weddingInfo.brideName} onChange={e => setWeddingInfo(prev => ({ ...prev, brideName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Code vestimentaire</label>
                      <input type="text" value={weddingInfo.dressCode} onChange={e => setWeddingInfo(prev => ({ ...prev, dressCode: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                  </div>
                </div>

                {/* Cérémonie */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#b8860b] uppercase tracking-wider mb-3 pb-2 border-b border-[#b8860b]/20">Cérémonie</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date de la cérémonie</label>
                      <input type="date" value={weddingInfo.date} onChange={e => setWeddingInfo(prev => ({ ...prev, date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Heure de la cérémonie</label>
                      <input type="time" value={weddingInfo.time} onChange={e => setWeddingInfo(prev => ({ ...prev, time: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nom du lieu</label>
                      <input type="text" value={weddingInfo.venueName} onChange={e => setWeddingInfo(prev => ({ ...prev, venueName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                  </div>
                </div>

                {/* Adresse de la cérémonie */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#b8860b] uppercase tracking-wider mb-3 pb-2 border-b border-[#b8860b]/20">Adresse de la cérémonie</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Adresse du lieu</label>
                      <input type="text" value={weddingInfo.venueAddress} onChange={e => setWeddingInfo(prev => ({ ...prev, venueAddress: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Heure de la réception</label>
                      <input type="time" value={weddingInfo.receptionTime} onChange={e => setWeddingInfo(prev => ({ ...prev, receptionTime: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lieu de la réception</label>
                      <input type="text" value={weddingInfo.receptionVenue} onChange={e => setWeddingInfo(prev => ({ ...prev, receptionVenue: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                  </div>
                </div>

                {/* Réception & RSVP */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#b8860b] uppercase tracking-wider mb-3 pb-2 border-b border-[#b8860b]/20">Réception & RSVP</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Adresse de la réception</label>
                      <input type="text" value={weddingInfo.receptionAddress} onChange={e => setWeddingInfo(prev => ({ ...prev, receptionAddress: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date limite de réponse</label>
                      <input type="date" value={weddingInfo.rsvpDeadline} onChange={e => setWeddingInfo(prev => ({ ...prev, rsvpDeadline: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800" />
                    </div>
                  </div>
                </div>

                {/* Langue & Texte carte 2 */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#b8860b] uppercase tracking-wider mb-3 pb-2 border-b border-[#b8860b]/20">Langue & Texte</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Langue de l'invitation</label>
                      <select value={weddingInfo.lang} onChange={e => setWeddingInfo(prev => ({ ...prev, lang: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800">
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Texte de la carte 2</label>
                      <textarea
                        value={weddingInfo.card2Text}
                        onChange={e => setWeddingInfo(prev => ({ ...prev, card2Text: e.target.value }))}
                        rows={3}
                        placeholder="Texte affiché sur la deuxième carte de l'invitation..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="w-full sm:w-auto bg-[#b8860b] hover:bg-[#a07709] text-white py-3 px-8 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {settingsSaved ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Sauvegardé !</>
                  ) : 'Sauvegarder les informations'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===== ACCOUNT TAB ===== */}
        {tab === 'account' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Profile info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <span>👤</span> Informations personnelles
              </h2>
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom d'utilisateur</label>
                  <input
                    type="text"
                    value={currentUser.username}
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={currentUser.firstName}
                      onChange={e => setCurrentUser(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                    <input
                      type="text"
                      value={currentUser.lastName}
                      onChange={e => setCurrentUser(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={currentUser.email}
                    onChange={e => setCurrentUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20 text-gray-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={accountLoading}
                  className="w-full bg-[#b8860b] hover:bg-[#a07709] text-white py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {accountSaved ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Sauvegardé !</>
                  ) : 'Sauvegarder les informations'}
                </button>
              </form>
            </div>

            {/* Password */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <span>🔐</span> Changer le mot de passe
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Répéter le mot de passe"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>
                {passError && (
                  <p className="text-red-500 text-xs">{passError}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-[#4a3728] hover:bg-[#3d2a1a] text-white py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {passSaved ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Mot de passe modifié !</>
                  ) : 'Changer le mot de passe'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {tab === 'users' && currentUser.isSuperuser && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Utilisateurs autorisés</h2>
                <p className="text-sm text-gray-500 mt-1">Gérez les personnes qui peuvent accéder à l'espace administrateur.</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#b8860b] to-[#d4a017] hover:from-[#a07709] hover:to-[#b8860b] text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un utilisateur
              </button>
            </div>

            {userDeleted && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3">
                <p className="text-green-700 text-sm font-medium">Utilisateur supprimé avec succès.</p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {users.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-5xl mb-4 block">🔑</span>
                  <p className="text-gray-400 text-sm">Aucun utilisateur autorisé.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Rôle</th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date de création</th>
                        <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-[#b8860b]/20 to-[#d4a017]/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-[#b8860b] font-medium text-sm">
                                  {user.firstName ? user.firstName[0] : user.username[0]}
                                  {user.lastName ? user.lastName[0] : ''}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{user.username}</p>
                                {(user.firstName || user.lastName) && (
                                  <p className="text-xs text-gray-400">{user.firstName} {user.lastName}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <p className="text-sm text-gray-600">{user.email || '—'}</p>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            {user.isSuperuser ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Superutilisateur</span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Administrateur</span>
                            )}
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span className="text-sm text-gray-500">
                              {new Date(user.dateJoined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                title="Supprimer"
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== ADD GUEST MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#2d1f14] to-[#4a3728] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-medium">Ajouter un invité</h3>
              <button onClick={() => { setShowAddModal(false); setFormError(''); }} className="text-white/60 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddGuest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Marie"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Dupont"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 00 00 00 00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="marie.dupont@email.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={form.plusOne}
                  onChange={e => setForm(f => ({ ...f, plusOne: e.target.checked }))}
                  className="w-4 h-4 accent-[#b8860b] rounded"
                />
                <span className="text-sm text-gray-700">Autoriser un accompagnant (+1)</span>
              </label>

              {formError && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setFormError(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-gradient-to-r from-[#b8860b] to-[#d4a017] text-white py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : 'Ajouter l\'invité'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== ADD USER MODAL ===== */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#2d1f14] to-[#4a3728] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-medium">Ajouter un utilisateur</h3>
              <button onClick={() => { setShowAddUserModal(false); setUserFormError(''); }} className="text-white/60 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom d'utilisateur *</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="jean.dupont"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe *</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 6 caractères"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jean.dupont@email.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={userForm.firstName}
                    onChange={e => setUserForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Jean"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={userForm.lastName}
                    onChange={e => setUserForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Dupont"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={userForm.isSuperuser}
                  onChange={e => setUserForm(f => ({ ...f, isSuperuser: e.target.checked }))}
                  className="w-4 h-4 accent-[#b8860b] rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Superutilisateur</span>
                  <p className="text-xs text-gray-400">Accès complet à toutes les fonctionnalités</p>
                </div>
              </label>

              {userFormError && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{userFormError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddUserModal(false); setUserFormError(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={userFormLoading}
                  className="flex-1 bg-gradient-to-r from-[#b8860b] to-[#d4a017] text-white py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {userFormLoading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL ===== */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#2d1f14] to-[#4a3728] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-medium">Fiche invité</h3>
              <button onClick={() => setShowDetailModal(null)} className="text-white/60 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Avatar & name */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#b8860b]/20 to-[#d4a017]/20 rounded-full flex items-center justify-center">
                  <span className="text-[#b8860b] font-semibold text-lg">
                    {showDetailModal.firstName[0]}{showDetailModal.lastName[0]}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{showDetailModal.firstName} {showDetailModal.lastName}</h4>
                  <StatusBadge status={showDetailModal.rsvpStatus} />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: '📧', label: 'Email', value: showDetailModal.email },
                  { icon: '📱', label: 'Téléphone', value: showDetailModal.phone || 'Non renseigné' },
                  { icon: '👥', label: '+1 autorisé', value: showDetailModal.plusOne ? 'Oui' : 'Non' },
                  showDetailModal.rsvpStatus === 'confirmed' && { icon: '🧑‍🤝‍🧑', label: 'Nombre de personnes', value: `${showDetailModal.numberOfGuests || 1} personne(s)` },
                  showDetailModal.plusOneName && { icon: '💑', label: 'Accompagnant(e)', value: showDetailModal.plusOneName },
                  showDetailModal.dietaryRestrictions && { icon: '🥗', label: 'Restrictions alimentaires', value: showDetailModal.dietaryRestrictions },
                  showDetailModal.rsvpMessage && { icon: '💬', label: 'Message', value: showDetailModal.rsvpMessage },
                  showDetailModal.rsvpDate && { icon: '📅', label: 'Répondu le', value: new Date(showDetailModal.rsvpDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                ].filter(Boolean).map((item: any) => (
                  <div key={item.label} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                      <p className="text-sm text-gray-800 mt-0.5">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Invitation link */}
              <div className="mt-4 bg-[#fdf8f0] border border-[#e8d8c0] rounded-xl p-4">
                <p className="text-xs text-[#b8860b] font-medium mb-2">🔗 Lien d'invitation</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[#6b5744] font-mono flex-1 truncate bg-white border border-[#e8d8c0] rounded-lg px-3 py-2">
                    {generateInviteLink(showDetailModal.token)}
                  </p>
                  <button
                    onClick={() => handleCopyLink(showDetailModal)}
                    className="p-2 bg-[#b8860b] hover:bg-[#a07709] text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    {copiedId === showDetailModal.id ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowDetailModal(null)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(showDetailModal.id); setShowDetailModal(null); }}
                  className="px-4 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer la suppression</h3>
            <p className="text-gray-500 text-sm mb-6">
              Cette action est irréversible. Le lien d'invitation de cet invité sera désactivé.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
