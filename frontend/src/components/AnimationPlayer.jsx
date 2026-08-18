import { useCallback, useEffect, useRef, useState } from 'react';
import { useProblemStore } from '../store/useProblemStore';

export default function AnimationPlayer() {
  const {
    timeSeries,
    animationSpec,
    currentTime,
    isPlaying,
    setCurrentTime,
    setPlayState,
  } = useProblemStore();

  const [localTime, setLocalTime] = useState(currentTime);
  const duration = animationSpec?.duration_s || 1;
  const frameIntervalRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Sync local time with store
  useEffect(() => {
    setLocalTime(currentTime);
  }, [currentTime]);

  // Calculate current frame index
  const currentFrameIndex = useCallback(() => {
    if (!timeSeries?.t?.length) return 0;
    const ratio = Math.min(Math.max(localTime / duration, 0), 1);
    return Math.floor(ratio * (timeSeries.t.length - 1));
  }, [timeSeries, localTime, duration]);

  // Extract current frame data
  const currentData = useCallback(() => {
    if (!timeSeries) return {};
    const idx = currentFrameIndex();
    return {
      t: timeSeries.t[idx],
      x: timeSeries.x?.[idx],
      y: timeSeries.y?.[idx],
      z: timeSeries.z?.[idx],
      vx: timeSeries.vx?.[idx],
      vy: timeSeries.vy?.[idx],
      vz: timeSeries.vz?.[idx],
      v: timeSeries.v?.[idx],
      ax: timeSeries.ax?.[idx],
      ay: timeSeries.ay?.[idx],
      az: timeSeries.az?.[idx],
      a: timeSeries.a?.[idx],
      theta: timeSeries.theta?.[idx],
      omega: timeSeries.omega?.[idx],
      alpha: timeSeries.alpha?.[idx],
      ke: timeSeries.ke?.[idx],
      pe: timeSeries.pe?.[idx],
      e_total: timeSeries.e_total?.[idx],
      x_eq: timeSeries.x_eq?.[idx],
      force: timeSeries.force?.[idx],
      f_normal: timeSeries.f_normal?.[idx],
      f_friction: timeSeries.f_friction?.[idx],
      tension: timeSeries.tension?.[idx],
    };
  }, [timeSeries, currentFrameIndex]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    setPlayState(!isPlaying);
  }, [isPlaying, setPlayState]);

  // Handle scrubber change
  const handleScrub = useCallback((e) => {
    const newTime = parseFloat(e.target.value);
    setLocalTime(newTime);
    setCurrentTime(newTime);
  }, [setCurrentTime]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        const step = duration / 100;
        setLocalTime(prev => Math.max(0, prev - step));
        setCurrentTime(prev => Math.max(0, prev - step));
      } else if (e.code === 'ArrowRight') {
        const step = duration / 100;
        setLocalTime(prev => Math.min(duration, prev + step));
        setCurrentTime(prev => Math.min(duration, prev + step));
      } else if (e.code === 'Home') {
        setLocalTime(0);
        setCurrentTime(0);
      } else if (e.code === 'End') {
        setLocalTime(duration);
        setCurrentTime(duration);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, handlePlayPause, setCurrentTime]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      return;
    }

    const fps = animationSpec?.fps || 30;
    const frameTime = 1000 / fps;

    frameIntervalRef.current = setInterval(() => {
      const now = performance.now();
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = now;
        return;
      }

      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= frameTime) {
        lastFrameTimeRef.current = now;

        setLocalTime(prev => {
          const newTime = prev + frameTime / 1000;
          if (newTime >= duration) {
            setPlayState(false);
            setCurrentTime(0);
            return 0;
          }
          setCurrentTime(newTime);
          return newTime;
        });
      }
    }, frameTime);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [isPlaying, duration, animationSpec?.fps, setCurrentTime, setPlayState]);

  return (
    <div className="animation-player">
      <div className="timeline-container">
        <input
          type="range"
          min="0"
          max={duration}
          step={duration / 1000}
          value={localTime}
          onChange={handleScrub}
          className="timeline-scrubber"
          aria-label="Animation timeline"
        />
        <div className="timeline-labels">
          <span>0.00s</span>
          <span>{(duration / 2).toFixed(2)}s</span>
          <span>{duration.toFixed(2)}s</span>
        </div>
      </div>

      <div className="controls">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          className="restart-btn"
          onClick={() => { setLocalTime(0); setCurrentTime(0); setPlayState(false); }}
          aria-label="Restart"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <div className="time-display">
          <span className="current-time">Time: {localTime.toFixed(2)}s</span>
          <span className="duration">/ {duration.toFixed(2)}s</span>
        </div>

        <div className="frame-info" style={{ display: 'none' }}>
          Frame: {currentFrameIndex() + 1} / {timeSeries?.t?.length || 0}
        </div>
      </div>

      <style jsx>{`
        .animation-player {
          background: rgba(15, 23, 42, 0.9);
          border-radius: 12px;
          padding: 1.25rem;
          backdrop-filter: blur(8px);
          border: 1px solid #1e293b;
        }
        .timeline-container {
          margin-bottom: 1rem;
        }
        .timeline-scrubber {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: #1e293b;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }
        .timeline-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .timeline-scrubber::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
        }
        .timeline-scrubber::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          border: none;
          cursor: pointer;
        }
        .timeline-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .play-btn, .restart-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .play-btn {
          background: #3b82f6;
          color: white;
        }
        .play-btn:hover {
          background: #2563eb;
          transform: scale(1.05);
        }
        .play-btn.playing {
          background: #ef4444;
        }
        .play-btn.playing:hover {
          background: #dc2626;
        }
        .restart-btn {
          background: #1e293b;
          color: #94a3b8;
        }
        .restart-btn:hover {
          background: #334155;
          color: white;
        }
        .time-display {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-variant-numeric: tabular-nums;
        }
        .current-time {
          color: #e2e8f0;
          font-size: 0.95rem;
          font-weight: 500;
        }
        .duration {
          color: #64748b;
          font-size: 0.95rem;
        }
        .frame-info {
          color: #64748b;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}