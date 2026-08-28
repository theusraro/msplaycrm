import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { repositories } from '../services/repositoryFactory';

export default function ProfilesScreen() {
  const navigate = useNavigate();
  const { isTv } = useDeviceMode();
  const { state, actions } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const createBtnRef = useRef<HTMLButtonElement>(null);

  // Load profiles from repository (remote user profiles or fallback)
  useEffect(() => {
    async function loadUserProfiles() {
      try {
        const loaded = await repositories.profile.getAll();
        if (loaded && loaded.length > 0) {
          actions.setProfiles(loaded as any);
          return;
        }
      } catch {
        // Fallback
      }
      if (state.profiles.length === 0) {
        actions.setProfiles([
          { id: '1', name: 'Matheus', avatar: '', color: 'linear-gradient(135deg, #e50914, #8b0000)' },
          { id: '2', name: 'Sala', avatar: '', color: 'linear-gradient(135deg, #0078d4, #003366)' },
          { id: '3', name: 'Quarto', avatar: '', color: 'linear-gradient(135deg, #107c10, #004d00)' },
        ]);
      }
    }
    loadUserProfiles();
  }, [actions]);

  // Focus management for TV mode modal
  useEffect(() => {
    if (showModal && isTv && inputRef.current) {
      inputRef.current.focus();
    } else if (!showModal && isTv && addBtnRef.current && state.profiles.length > 0) {
      // Focus back to add button when modal closes
      addBtnRef.current.focus();
    }
  }, [showModal, isTv, state.profiles.length]);

  const getGradient = (name: string, savedColor?: string) => {
    if (savedColor) return savedColor;
    const colors = [
      'linear-gradient(135deg, #e50914, #8b0000)',
      'linear-gradient(135deg, #0078d4, #003366)',
      'linear-gradient(135deg, #107c10, #004d00)',
      'linear-gradient(135deg, #8a2be2, #4b0082)',
      'linear-gradient(135deg, #ff8c00, #b8860b)'
    ];
    return colors[name.length % colors.length];
  };

  const handleSelect = (profile: any) => {
    actions.setSelectedProfile(profile);
    navigate('/home');
  };

  const handleAdd = () => {
    if (!newProfileName.trim()) return;
    
    if (editingProfileId) {
      // Edit mode
      const updated = state.profiles.map(p => 
        p.id === editingProfileId ? { ...p, name: newProfileName.trim() } : p
      );
      actions.setProfiles(updated);
    } else {
      // Create mode
      if (state.profiles.length >= 5) return; // limit
      const newProfile = {
        id: Date.now().toString(),
        name: newProfileName.trim(),
        avatar: '',
        color: getGradient(newProfileName.trim())
      };
      actions.setProfiles([...state.profiles, newProfile]);
    }
    
    setNewProfileName('');
    setEditingProfileId(null);
    setShowModal(false);
  };

  const openEdit = (e: React.MouseEvent, profile: any) => {
    e.stopPropagation();
    setEditingProfileId(profile.id);
    setNewProfileName(profile.name);
    setShowModal(true);
  };

  const openDelete = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    setShowDeleteModal(profileId);
  };

  const confirmDelete = () => {
    if (!showDeleteModal) return;
    const updated = state.profiles.filter(p => p.id !== showDeleteModal);
    actions.setProfiles(updated);
    if (state.selectedProfile?.id === showDeleteModal) {
      actions.setSelectedProfile(null);
    }
    setShowDeleteModal(null);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent, currentElement: string) => {
    if (!isTv) return;
    
    if (e.key === 'Escape' || e.key === 'Backspace') {
      setShowModal(false);
      setEditingProfileId(null);
      return;
    }

    if (e.key === 'ArrowDown' && currentElement === 'input') {
      e.preventDefault();
      cancelBtnRef.current?.focus();
    } else if (e.key === 'ArrowUp' && (currentElement === 'cancel' || currentElement === 'create')) {
      e.preventDefault();
      inputRef.current?.focus();
    } else if (e.key === 'ArrowRight' && currentElement === 'cancel') {
      e.preventDefault();
      createBtnRef.current?.focus();
    } else if (e.key === 'ArrowLeft' && currentElement === 'create') {
      e.preventDefault();
      cancelBtnRef.current?.focus();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '3rem', fontWeight: 600 }}>Quem está assistindo?</h1>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2rem',
        maxWidth: '1000px',
        width: '100%',
        justifyContent: 'center'
      }}>
        {state.profiles.map((profile) => (
          <div
            key={profile.id}
            tabIndex={0}
            onClick={() => handleSelect(profile)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect(profile)}
            className="profile-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              width: '150px'
            }}
          >
            <div className="avatar" style={{
              width: '140px',
              height: '140px',
              borderRadius: '12px',
              background: getGradient(profile.name, profile.color),
              marginBottom: '1rem',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3.5rem',
              fontWeight: 'bold',
              border: '3px solid transparent'
            }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <span className="name" style={{ color: '#ccc', transition: 'all 0.3s ease', fontSize: '1.2rem', textAlign: 'center' }}>
              {profile.name}
            </span>
            
            <div className="profile-actions" style={{
              display: 'flex', gap: '10px', marginTop: '10px', opacity: 0, transition: 'opacity 0.2s'
            }}>
              <button 
                onClick={(e) => openEdit(e, profile)}
                className="action-btn"
              >
                ✏️
              </button>
              <button 
                onClick={(e) => openDelete(e, profile.id)}
                className="action-btn delete-btn"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {state.profiles.length < 5 ? (
          <div
            ref={addBtnRef}
            tabIndex={0}
            onClick={() => { setNewProfileName(''); setEditingProfileId(null); setShowModal(true); }}
            onKeyDown={(e) => e.key === 'Enter' && (() => { setNewProfileName(''); setEditingProfileId(null); setShowModal(true); })()}
            className="profile-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              outline: 'none',
              width: '150px'
            }}
          >
            <div className="avatar" style={{
              width: '140px',
              height: '140px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              transition: 'all 0.3s ease',
              border: '3px solid transparent'
            }}>
              +
            </div>
            <span className="name" style={{ color: '#ccc', transition: 'all 0.3s ease', fontSize: '1.2rem', textAlign: 'center' }}>Novo Perfil</span>
          </div>
        ) : (
          <div style={{ width: '100%', textAlign: 'center', color: '#888', marginTop: '2rem' }}>
            Limite de perfis atingido.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            border: '1px solid #333'
          }}>
            <h2 style={{ marginBottom: '1.5rem', marginTop: 0, color: 'white' }}>
              {editingProfileId ? 'Editar Perfil' : 'Novo Perfil'}
            </h2>
            <input
              ref={inputRef}
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                else handleModalKeyDown(e, 'input');
              }}
              placeholder="Nome do perfil"
              style={{
                width: '100%',
                padding: '1rem',
                marginBottom: '1.5rem',
                background: '#0a0a0a',
                border: '1px solid #444',
                color: 'white',
                borderRadius: '6px',
                boxSizing: 'border-box',
                fontSize: '1.1rem',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                ref={cancelBtnRef}
                onClick={() => { setShowModal(false); setEditingProfileId(null); }} 
                onKeyDown={(e) => handleModalKeyDown(e, 'cancel')}
                className="modal-btn"
                style={{
                  padding: '0.8rem 1.5rem', background: 'transparent', color: 'white', border: '1px solid #666', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem'
                }}
              >
                Cancelar
              </button>
              <button 
                ref={createBtnRef}
                onClick={handleAdd} 
                onKeyDown={(e) => handleModalKeyDown(e, 'create')}
                className="modal-btn primary"
                style={{
                  padding: '0.8rem 1.5rem', background: '#e50914', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold'
                }}
              >
                {editingProfileId ? 'Salvar' : 'Criar Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            border: '1px solid #333'
          }}>
            <h2 style={{ marginBottom: '1rem', marginTop: 0, color: 'white' }}>Excluir Perfil</h2>
            <p style={{ color: '#ccc', marginBottom: '2rem' }}>Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDeleteModal(null)} 
                className="modal-btn"
                style={{ padding: '0.8rem 1.5rem', background: 'transparent', color: 'white', border: '1px solid #666', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                className="modal-btn"
                style={{ padding: '0.8rem 1.5rem', background: '#8b0000', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .profile-card:hover .avatar, .profile-card:focus .avatar {
          transform: scale(1.08);
          border-color: white;
          box-shadow: ${isTv ? '0 0 20px rgba(229, 9, 20, 0.6)' : 'none'};
        }
        .profile-card:hover .name, .profile-card:focus .name {
          color: white;
          font-weight: bold;
        }
        .profile-card:hover .profile-actions, .profile-card:focus .profile-actions {
          opacity: 1 !important;
        }
        ${isTv ? `
        .profile-card:focus .avatar {
          border-color: #e50914;
          transform: scale(1.15);
        }
        input:focus { border-color: #e50914 !important; }
        .modal-btn:focus { outline: 2px solid #e50914; outline-offset: 2px; }
        ` : ''}
        .action-btn {
          background: rgba(255,255,255,0.1); border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; transition: background 0.2s;
        }
        .action-btn:hover { background: rgba(255,255,255,0.2); }
        .delete-btn:hover { background: rgba(229, 9, 20, 0.8); }
      `}</style>
    </div>
  );
}