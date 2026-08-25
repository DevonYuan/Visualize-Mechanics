import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './AnimationPlayer.module.css';

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
  const frameRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const durationRef = useRef(duration);
  const setCurrentTimeRef = useRef(setCurrentTime);
  const onResetRef = useRef(onReset);

  // Keep refs in sync with props
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  
  useEffect(() => {
    setCurrentTimeRef.current = setCurrentTime;
  }, [setCurrentTime]);
  
  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  // Sync local time with prop (external updates)
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

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      lastFrameTimeRef.current = 0;
      return;
    }

    const fps = 30;
    const frameTime = 1000 / fps;

    const tick = (now) => {
      if (!isPlayingRef.current) return;
      
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = now;
      }

      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= frameTime) {
        lastFrameTimeRef.current = now;

        setLocalTime(prev => {
          const newTime = prev + frameTime / 1000;
          if (newTime >= durationRef.current) {
            // Schedule onReset and time reset for after render
            setTimeout(() => {
              onResetRef.current();
              setCurrentTimeRef.current(0);
            }, 0);
            return 0;
          }
          // Schedule setCurrentTime for after render to avoid setState-in-render warning
          setTimeout(() => setCurrentTimeRef.current(newTime), 0);
          return newTime;
        });
      }

      if (isPlayingRef.current) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    lastFrameTimeRef.current = 0;
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [isPlaying]); // Re-run when play/pause toggles

  return (
    <div className={styles['animation-player']}>
      <div className={styles['timeline-container']}>
        <input
          type="range"
          min="0"
          max={duration}
          step={duration / 1000}
          value={localTime}
          onChange={handleScrub}
          className={styles['timeline-scrubber']}
          aria-label="Animation timeline"
        />
        <div className={styles['timeline-labels']}>
          <span>0.00s</span>
          <span>{(duration / 2).toFixed(2)}s</span>
          <span>{duration.toFixed(2)}s</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button
          className={`${styles['play-btn']} ${isPlaying ? styles.playing : ''}`}
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
          className={styles['restart-btn']}
          onClick={onReset}
          aria-label="Restart"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <div className={styles['time-display']}>
          <span className={styles['current-time']}>Time: {localTime.toFixed(2)}s</span>
          <span className={styles.duration}>/ {duration.toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}