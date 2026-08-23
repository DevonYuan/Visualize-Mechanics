import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @typedef {Object} AnimationPlayerProps
 * @property {boolean} isPlaying
 * @property {() => void} onPlayPause
 * @property {() => void} onReset
 * @property {number} duration
 * @property {number} currentTime
 * @property {(time: number) => void} setCurrentTime
 */

/** @param {AnimationPlayerProps} props */
export default function AnimationPlayer({
  isPlaying,
  onPlayPause,
  onReset,
  duration,
  currentTime,
  setCurrentTime,
}) {
  const [localTime, setLocalTime] = useState(currentTime);
  const frameIntervalRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Sync local time with prop
  useEffect(() => {
    setLocalTime(currentTime);
  }, [currentTime]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    onPlayPause();
  }, [onPlayPause]);

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

    const fps = 30;
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
            onReset();
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
  }, [isPlaying, duration, setCurrentTime, onReset]);

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
          onClick={onReset}
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
      </div>

      <style jsx>{`
        .animation-player {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .timeline-container {
          margin-bottom: 1rem;
        }
        .timeline-scrubber {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: #e2e8f0;
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
          width: 48px;
          height: 48px;
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
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
        }
        .play-btn:hover {
          background: #2563eb;
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }
        .play-btn.playing {
          background: #ef4444;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
        }
        .play-btn.playing:hover {
          background: #dc2626;
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }
        .restart-btn {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        .restart-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        .time-display {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-variant-numeric: tabular-nums;
          font-size: 0.875rem;
          color: #475569;
        }
        .current-time {
          font-weight: 600;
          color: #1e293b;
        }
        .duration {
          color: #94a3b8;
        }
        .frame-info {
          color: #64748b;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}