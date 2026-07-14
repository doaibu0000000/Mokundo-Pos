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
      // 1. Fetch user by username
      const user = await db.users.where('username').equalsIgnoreCase(trimmedUser).first();
      if (!user) {
        setError('Username atau password salah');
        setLoading(false);
        return;
      }

      // 2. Hash input password and match
      const inputHash = await hashPassword(trimmedPass);
      if (user.password_hash !== inputHash) {
        setError('Username atau password salah');
        setLoading(false);
        return;
      }

      // 3. Authenticate session
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
              marginBottom: '20px',
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
