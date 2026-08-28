import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { repositories } from '../services/repositoryFactory';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { state, actions: { login } } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.isAuthenticated) {
      navigate('/profiles', { replace: true });
    }
  }, [state.isAuthenticated, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await repositories.auth.login(normalizedUsername, password);
      if (result.success) {
        login();
      } else {
        setError(result.error || 'Usuário ou senha inválidos.');
        setLoading(false);
      }
    } catch {
      setError('Erro ao conectar. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      color: 'white'
    }}>
      <div style={{
        background: '#141414',
        padding: '3rem 2rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ color: '#e50914', textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', letterSpacing: '2px' }}>
          MSPLAY
        </h1>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder=" "
              className={error ? 'error' : ''}
              id="username"
            />
            <label htmlFor="username">Usuário</label>
          </div>

          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder=" "
              className={error ? 'error' : ''}
              id="password"
            />
            <label htmlFor="password">Senha</label>
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: '1.2rem',
                userSelect: 'none'
              }}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </span>
          </div>

          {error && (
            <div style={{ color: '#e50914', fontSize: '0.9rem', marginTop: '-0.5rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '1rem',
              background: '#e50914',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '1rem',
              transition: 'background 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {loading ? <div className="spinner"></div> : 'Entrar'}
          </button>
        </form>
      </div>

      <style>{`
        .input-group {
          position: relative;
          width: 100%;
        }
        .input-group input {
          width: 100%;
          padding: 1.2rem 1rem 0.6rem;
          background: #333;
          border: 1px solid transparent;
          border-radius: 4px;
          color: white;
          font-size: 1rem;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-group input.error {
          border-color: #e50914;
        }
        .input-group input:focus {
          border-color: #e50914;
        }
        .input-group label {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #8c8c8c;
          transition: all 0.2s ease;
          pointer-events: none;
          font-size: 1rem;
        }
        .input-group input:focus + label,
        .input-group input:not(:placeholder-shown) + label {
          top: 0.8rem;
          font-size: 0.75rem;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}