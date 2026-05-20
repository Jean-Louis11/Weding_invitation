import { useState } from 'react';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function AdminLogin({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err?.message || 'Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3f0] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#c9a84c] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#c9a84c]/30">
            <span className="text-2xl">💍</span>
          </div>
          <h1 className="text-2xl text-[#2a2a2a] font-light tracking-wider mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Espace Administrateur
          </h1>
          <p className="text-[#9a8a6a] text-sm">Gestion des invités</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#c9a84c]/30 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[#6a6a5a] text-xs uppercase tracking-[0.2em] mb-2">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#f5f3f0] border border-[#c9a84c]/30 rounded-xl px-4 py-3 text-[#2a2a2a] placeholder-[#9a8a6a] focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[#6a6a5a] text-xs uppercase tracking-[0.2em] mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#f5f3f0] border border-[#c9a84c]/30 rounded-xl px-4 py-3 text-[#2a2a2a] placeholder-[#9a8a6a] focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20 transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c9a84c] hover:bg-[#b8973d] text-white py-3 rounded-xl font-medium tracking-widest text-sm transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                'ACCÉDER'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
