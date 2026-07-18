import React, { useState } from 'react';
import { User as UserIcon, Lock } from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { db, hashPassword } from '../../../shared/services/db';
import { NeumorphicCard, NeumorphicButton, NeumorphicInput } from '../../../shared/components';

export const LoginView: React.FC = () => {
  const { loginUser } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();
    if (!trimmedUser || !trimmedPass) {
      setError('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Jika online dan Supabase dikonfigurasi, tarik password_hash terbaru
      //    Ini memastikan perubahan password oleh admin berlaku di semua device
      if (navigator.onLine) {
        try {
          const { SyncService } = await import('../../../shared/services/syncService');
          const supabaseConfig = await SyncService.getSupabaseConfig();
          if (supabaseConfig) {
            const { url: baseUrl, key } = supabaseConfig;
            const res = await fetch(
              `${baseUrl}/rest/v1/users?username=eq.${encodeURIComponent(trimmedUser.toLowerCase())}&select=*`,
              { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } }
            );
            if (res.ok) {
              const remoteUsers = await res.json();
              if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
                const remoteUser = remoteUsers[0];
                if (remoteUser.password_hash) {
                  const localUser = await db.users.where('username').equalsIgnoreCase(trimmedUser).first();
                  if (localUser?.id) {
                    await db.users.update(localUser.id, { ...remoteUser });
                  } else {
                    await db.users.put(remoteUser);
                  }
                }
              }
            }
          }
        } catch (_) {
          // Gagal pull dari Supabase, lanjut dengan data lokal
        }
      }

      // 2. Ambil user dari lokal (sudah diupdate jika pull berhasil)
      const user = await db.users.where('username').equalsIgnoreCase(trimmedUser).first();
      if (!user) {
        setError('Username salah');
        setLoading(false);
        return;
      }

      // 3. Hash input password dan cocokkan
      const inputHash = await hashPassword(trimmedPass);
      if (user.password_hash !== inputHash) {
        setError('Password salah');
        setLoading(false);
        return;
      }

      // 4. Autentikasi berhasil
      loginUser(user);
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        width: '100vw',
        backgroundColor: 'var(--bg-default)',
        padding: '20px',
      }}
    >
      <div 
        style={{ width: '100%', maxWidth: '420px' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSubmit(e);
          }
        }}
      >
        <NeumorphicCard
          style={{
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo Avatar */}
          <div
            className="nm-inset"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              padding: '8px'
            }}
          >
            <img src="/Mokundo-Pos/brand-icon.png" alt="Mokundo Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>

          {/* Titles */}
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '4px',
              textAlign: 'center',
            }}
          >
            Surantaka Coffee
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            Sistem Kasir (POS)
          </p>

          {/* Fields */}
          <NeumorphicInput
            id="field_u"
            name="field_u"
            label="Username"
            placeholder="admin / kasir"
            icon={<UserIcon size={18} />}
            value={username}
            onChange={handleUsernameChange}
            containerClassName="w-full"
            containerStyle={{ marginBottom: '14px' }}
            autoComplete="new-password"
            data-lpignore="true"
          />

          <NeumorphicInput
            id="field_p"
            name="field_p"
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            containerClassName="w-full"
            containerStyle={{ marginBottom: '16px' }}
            autoComplete="new-password"
            data-lpignore="true"
          />

          {/* Error Message */}
          {error && (
            <div
              style={{
                color: 'var(--accent-red)',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'left',
                width: '100%',
                marginBottom: '16px',
                paddingLeft: '4px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <NeumorphicButton
            type="button"
            onClick={handleSubmit}
            variant="primary"
            borderRadius="pill"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
            }}
          >
            {loading ? 'Memvalidasi...' : 'Masuk'}
          </NeumorphicButton>
        </NeumorphicCard>
      </div>
    </div>
  );
};
