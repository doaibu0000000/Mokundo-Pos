import React, { useState } from 'react';
import { User as UserIcon, Lock, Coffee } from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { db, hashPassword } from '../../../shared/services/db';
import { NeumorphicCard, NeumorphicButton, NeumorphicInput } from '../../../shared/components';

export const LoginView: React.FC = () => {
  const { loginUser } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Fetch user by username
      const user = await db.users.where('username').equalsIgnoreCase(username).first();
      if (!user) {
        setError('Username atau password salah');
        setLoading(false);
        return;
      }

      // 2. Hash input password and match
      const inputHash = await hashPassword(password);
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
        backgroundColor: '#202226', // Force dark background for login screen
        padding: '20px',
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '420px' }}>
        <NeumorphicCard
          className="dark"
          style={{
            backgroundColor: '#2B2F3A',
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '10px 10px 20px #15171d, -10px -10px 20px #414757',
            border: 'none',
          }}
        >
          {/* Logo Avatar */}
          <div
            className="nm-inset"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#2B2F3A',
              boxShadow: 'inset 4px 4px 8px #15171d, inset -4px -4px 8px #414757',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              border: 'none',
            }}
          >
            <Coffee size={36} color="var(--accent-blue)" />
          </div>

          {/* Titles */}
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '4px',
              textAlign: 'center',
            }}
          >
            Mokundo Kasir
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: '#8E95A5',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            Sistem Kasir (POS)
          </p>

          {/* Fields */}
          <NeumorphicInput
            id="username-input"
            label="Username"
            placeholder="admin / kasir"
            icon={<UserIcon size={18} />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            containerClassName="w-full mb-5"
            style={{
              backgroundColor: '#20232b',
              color: '#ffffff',
              boxShadow: 'inset 3px 3px 6px #15171d, inset -3px -3px 6px #414757',
            }}
          />

          <NeumorphicInput
            id="password-input"
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            containerClassName="w-full mb-6"
            style={{
              backgroundColor: '#20232b',
              color: '#ffffff',
              boxShadow: 'inset 3px 3px 6px #15171d, inset -3px -3px 6px #414757',
            }}
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
            type="submit"
            variant="primary"
            borderRadius="pill"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              boxShadow: '6px 6px 12px #15171d, -6px -6px 12px #414757',
            }}
          >
            {loading ? 'Memvalidasi...' : 'Masuk'}
          </NeumorphicButton>
        </NeumorphicCard>
      </form>
    </div>
  );
};
