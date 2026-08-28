import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(() => {
        if (!state.isAuthenticated) {
          navigate('/login');
        } else if (!state.selectedProfile) {
          navigate('/profiles');
        } else {
          navigate('/home');
        }
      }, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, state.isAuthenticated, state.selectedProfile]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      opacity: fadingOut ? 0 : 1,
      transition: 'opacity 0.5s ease-in-out',
      margin: 0,
      padding: 0
    }}>
      <h1 style={{
        color: 'white',
        fontSize: '4rem',
        fontWeight: 'bold',
        letterSpacing: '0.2em',
        animation: 'pulse 2s infinite',
        textShadow: '0 0 20px rgba(229, 9, 20, 0.5)'
      }}>
        MSPLAY
      </h1>
      <style>{`
        @keyframes pulse {
          0% { text-shadow: 0 0 20px rgba(229, 9, 20, 0.5); transform: scale(1); }
          50% { text-shadow: 0 0 40px rgba(229, 9, 20, 0.8); transform: scale(1.05); }
          100% { text-shadow: 0 0 20px rgba(229, 9, 20, 0.5); transform: scale(1); }
        }
      `}</style>
    </div>
  );
}