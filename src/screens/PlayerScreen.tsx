import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { contentRepository } from '../services/contentRepository';
import { ContentItem } from '../types/content';
import { useAppStore } from '../store/useAppStore';
import { useDeviceMode } from '../hooks/useDeviceMode';

export default function PlayerScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const episodeId = searchParams.get('episode');

  const navigate = useNavigate();
  const { isTv } = useDeviceMode();
  const { state, actions } = useAppStore();

  const [item, setItem] = useState<ContentItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(7200); // Default to 2 hours if not detected
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState('Português (Original 5.1)');
  const [selectedSubtitle, setSelectedSubtitle] = useState('Português');
  const [, setIsSeeking] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Live content check
  const isLiveWithoutDvr = Boolean(
    item?.type === 'tv' || 
    item?.isLive || 
    duration === Infinity || 
    !isFinite(duration)
  );

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      const found = await contentRepository.getById(id);
      if (found) {
        setItem(found);
        // Restore progress if exists
        const savedProgress = state.watchProgress[found.id];
        if (savedProgress && !found.isLive && found.type !== 'tv') {
          setCurrentTime(Math.floor(savedProgress * 7200));
        }
      }
      try {
        const stream = await contentRepository.resolvePlayback(id);
        if (stream?.url) {
          setStreamUrl(stream.url);
        }
      } catch {
        // Fallback to backdrop preview
      }
    }
    loadItem();
  }, [id]);

  // Fallback simulation timer when streamUrl is null (demo / mock preview mode)
  useEffect(() => {
    if (streamUrl) return; // Video element handles timeupdate when streamUrl is present
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !isLiveWithoutDvr) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, streamUrl, isLiveWithoutDvr]);

  // Auto-hide controls after 3.5 seconds
  const resetControlsTimer = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !audioModalOpen) {
        setControlsVisible(false);
      }
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, audioModalOpen]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper to determine accurate seekable range
  const getSeekableRange = (): { start: number; end: number; seekable: boolean } => {
    const video = videoRef.current;
    if (!video) {
      return { start: 0, end: duration, seekable: !isLiveWithoutDvr };
    }

    if (isLiveWithoutDvr) {
      // Check if live stream has a DVR seekable window
      if (video.seekable && video.seekable.length > 0) {
        const start = video.seekable.start(0);
        const end = video.seekable.end(video.seekable.length - 1);
        if (end - start > 15) {
          return { start, end, seekable: true };
        }
      }
      return { start: 0, end: 0, seekable: false };
    }

    if (video.seekable && video.seekable.length > 0) {
      return {
        start: video.seekable.start(0),
        end: video.seekable.end(video.seekable.length - 1),
        seekable: true,
      };
    }

    const videoDur = isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
    return { start: 0, end: videoDur, seekable: true };
  };

  // Accurate Seek Handler
  const seekTo = (targetSeconds: number) => {
    const { start, end, seekable } = getSeekableRange();
    if (!seekable) return;

    const clamped = Math.max(start, Math.min(end, targetSeconds));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
  };

  // Skip +10 / -10 seconds
  const handleSkip = (seconds: number) => {
    const { start, end, seekable } = getSeekableRange();
    if (!seekable) return;

    const current = videoRef.current ? videoRef.current.currentTime : currentTime;
    const target = Math.max(start, Math.min(end, current + seconds));
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
    setCurrentTime(target);
    resetControlsTimer();
  };

  // Direct click or touch on the progress scrubber bar
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const { start, end, seekable } = getSeekableRange();
    if (!seekable || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = start + percent * (end - start);
    seekTo(target);
    resetControlsTimer();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    seekTo(target);
    resetControlsTimer();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    } else {
      setIsPlaying(prev => !prev);
    }
    resetControlsTimer();
  };

  const handleExit = () => {
    if (item && !isLiveWithoutDvr && duration > 0) {
      // Save playback progress (fraction 0..1) to store
      const progress = currentTime / duration;
      actions.setWatchProgress(item.id, Math.min(0.99, Math.max(0.01, progress)));
    }
    navigate(-1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Keyboard and TV D-pad controls (Space = Play/Pause, ArrowLeft/Right = Skip, Esc = Exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimer();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, currentTime, duration, isLiveWithoutDvr]);

  const progressPercent = isLiveWithoutDvr
    ? 100
    : duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        color: '#ffffff',
        zIndex: 2000,
        overflow: 'hidden',
        cursor: controlsVisible ? 'default' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Cinematic Video Canvas */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle at center, rgba(20,20,30,0.6) 0%, #000 80%), url(${item?.backdrop || item?.coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: isPlaying ? 'none' : 'brightness(0.7)',
        transition: 'filter 0.3s ease',
      }}>
        {streamUrl && (
          <video
            ref={videoRef}
            src={streamUrl}
            autoPlay
            playsInline
            muted={isMuted}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (isFinite(v.duration) && v.duration > 0) {
                setDuration(v.duration);
              }
            }}
            onDurationChange={(e) => {
              const v = e.currentTarget;
              if (isFinite(v.duration) && v.duration > 0) {
                setDuration(v.duration);
              }
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              setCurrentTime(v.currentTime);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onSeeking={() => setIsSeeking(true)}
            onSeeked={() => setIsSeeking(false)}
            onError={() => {
              // Gracefully fall back to background image simulation
              setStreamUrl(null);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
        )}
        {/* Animated simulation scanline effect */}
        {isPlaying && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 50%, rgba(229,9,20,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 2,
          }} />
        )}
      </div>

      {/* Top Bar (Back Button + Title) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: isTv ? '32px var(--ms-tv-safe-area, 48px)' : '24px 32px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        opacity: controlsVisible ? 1 : 0,
        transform: controlsVisible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.3s ease',
        zIndex: 10,
        pointerEvents: controlsVisible ? 'auto' : 'none',
      }}>
        <button
          onClick={handleExit}
          tabIndex={0}
          aria-label="Voltar"
          className="player-control-btn"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#ffffff',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          ‹
        </button>

        <div>
          <h2 style={{ margin: 0, fontSize: isTv ? '1.5rem' : '1.2rem', fontWeight: 700 }}>
            {item?.title} {episodeId && `• ${episodeId}`}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--ms-text-muted, #808080)' }}>
            {isLiveWithoutDvr ? 'Transmissão Ao Vivo • MSPLAY HD' : 'Reprodução MSPLAY • Ultra HD 4K'}
          </span>
        </div>
      </div>

      {/* Big Center Play / Pause Indicator (when paused) */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          style={{
            position: 'relative',
            zIndex: 10,
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(229,9,20,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(229,9,20,0.8)',
            transform: 'scale(1)',
            transition: 'transform 0.2s',
          }}
        >
          ▶
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: isTv ? '32px var(--ms-tv-safe-area, 48px)' : '24px 32px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)',
        opacity: controlsVisible ? 1 : 0,
        transform: controlsVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.3s ease',
        zIndex: 10,
        pointerEvents: controlsVisible ? 'auto' : 'none',
      }}>
        {/* Progress Scrubber */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ccc', marginBottom: '6px' }}>
            <span>{isLiveWithoutDvr ? 'AO VIVO' : formatTime(currentTime)}</span>
            <span>{isLiveWithoutDvr ? '🔴 LIVE' : formatTime(duration)}</span>
          </div>

          <div
            ref={progressBarRef}
            onClick={handleProgressBarClick}
            onTouchStart={handleProgressBarClick}
            onTouchMove={handleProgressBarClick}
            style={{
              position: 'relative',
              height: '6px',
              width: '100%',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '3px',
              cursor: isLiveWithoutDvr ? 'default' : 'pointer',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progressPercent}%`,
              background: 'var(--ms-red, #E50914)',
              borderRadius: '3px',
              boxShadow: '0 0 10px #E50914',
            }} />
            {!isLiveWithoutDvr && (
              <input
                type="range"
                min={0}
                max={duration}
                step={1}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Barra de progresso"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                }}
              />
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={togglePlay}
              tabIndex={0}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="player-control-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.6rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              tabIndex={0}
              disabled={isLiveWithoutDvr}
              aria-label="Voltar 10 segundos"
              className="player-control-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: isLiveWithoutDvr ? 'rgba(255,255,255,0.3)' : '#ffffff',
                fontSize: '1.2rem',
                cursor: isLiveWithoutDvr ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
            >
              ↺ 10s
            </button>

            <button
              onClick={() => handleSkip(10)}
              tabIndex={0}
              disabled={isLiveWithoutDvr}
              aria-label="Avançar 10 segundos"
              className="player-control-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: isLiveWithoutDvr ? 'rgba(255,255,255,0.3)' : '#ffffff',
                fontSize: '1.2rem',
                cursor: isLiveWithoutDvr ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
            >
              ↻ 10s
            </button>

            {/* Volume Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
              <button
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (videoRef.current) {
                    videoRef.current.muted = nextMuted;
                  }
                }}
                tabIndex={0}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {isMuted || volume === 0 ? '🔇' : '🔊'}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = false;
                  }
                  setIsMuted(false);
                }}
                style={{ width: '80px', accentColor: 'var(--ms-red, #E50914)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setAudioModalOpen(true)}
              tabIndex={0}
              className="player-control-btn"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>💬</span>
              <span>Áudio & Legendas</span>
            </button>

            <button
              onClick={toggleFullscreen}
              tabIndex={0}
              aria-label="Tela cheia"
              className="player-control-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.3rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              ⛶
            </button>
          </div>
        </div>
      </div>

      {/* Audio & Subtitle Modal */}
      {audioModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: '#181818',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.2rem', fontWeight: 700 }}>Áudio e Legendas</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--ms-text-muted, #808080)', marginBottom: '10px' }}>ÁUDIO</h4>
                {['Português (Original 5.1)', 'Inglês (Original)', 'Espanhol'].map(a => (
                  <button
                    key={a}
                    onClick={() => setSelectedAudio(a)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      marginBottom: '6px',
                      background: selectedAudio === a ? 'rgba(229,9,20,0.2)' : 'transparent',
                      border: selectedAudio === a ? '1px solid var(--ms-red, #E50914)' : '1px solid transparent',
                      color: selectedAudio === a ? '#ffffff' : '#b3b3b3',
                      borderRadius: '6px',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--ms-text-muted, #808080)', marginBottom: '10px' }}>LEGENDAS</h4>
                {['Desativadas', 'Português', 'Inglês'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSubtitle(s)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      marginBottom: '6px',
                      background: selectedSubtitle === s ? 'rgba(229,9,20,0.2)' : 'transparent',
                      border: selectedSubtitle === s ? '1px solid var(--ms-red, #E50914)' : '1px solid transparent',
                      color: selectedSubtitle === s ? '#ffffff' : '#b3b3b3',
                      borderRadius: '6px',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAudioModalOpen(false)}
                style={{
                  background: 'var(--ms-red, #E50914)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .player-control-btn:hover, .player-control-btn:focus {
          color: var(--ms-red, #E50914) !important;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}