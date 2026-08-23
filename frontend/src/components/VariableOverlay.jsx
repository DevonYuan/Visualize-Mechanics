import { useMemo } from 'react';
import { useProblemStore } from '../store/useProblemStore';
import { getFrameData, getFrameIndex } from '../types';

export default function VariableOverlay() {
  const { timeSeries, currentTime, scenario } = useProblemStore();

  const currentData = useMemo(() => {
    if (!timeSeries) return {};
    const idx = getFrameIndex(timeSeries, currentTime);
    return getFrameData(timeSeries, idx);
  }, [timeSeries, currentTime]);

  // Determine which variables to show based on scenario
  const visibleVariables = useMemo(() => {
    const vars = [];

    if (scenario === 'projectile_motion') {
      if (currentData.x !== undefined) vars.push({ label: 'X', value: currentData.x, unit: 'm' });
      if (currentData.y !== undefined) vars.push({ label: 'Y', value: currentData.y, unit: 'm' });
      if (currentData.vx !== undefined) vars.push({ label: 'Vₓ', value: currentData.vx, unit: 'm/s' });
      if (currentData.vy !== undefined) vars.push({ label: 'Vᵧ', value: currentData.vy, unit: 'm/s' });
      if (currentData.v !== undefined) vars.push({ label: 'Speed', value: currentData.v, unit: 'm/s' });
    } else if (scenario === 'kinematics_1d') {
      if (currentData.x !== undefined) vars.push({ label: 'Position', value: currentData.x, unit: 'm' });
      if (currentData.v !== undefined) vars.push({ label: 'Velocity', value: currentData.v, unit: 'm/s' });
      if (currentData.a !== undefined) vars.push({ label: 'Accel.', value: currentData.a, unit: 'm/s²' });
    } else if (scenario === 'inclined_plane') {
      if (currentData.x !== undefined) vars.push({ label: 'Distance', value: currentData.x, unit: 'm' });
      if (currentData.v !== undefined) vars.push({ label: 'Velocity', value: currentData.v, unit: 'm/s' });
      if (currentData.a !== undefined) vars.push({ label: 'Accel.', value: currentData.a, unit: 'm/s²' });
      if (currentData.f_normal !== undefined) vars.push({ label: 'Normal', value: currentData.f_normal, unit: 'N' });
      if (currentData.f_friction !== undefined) vars.push({ label: 'Friction', value: currentData.f_friction, unit: 'N' });
    } else {
      // Generic: show all available
      const allVars = [
        { key: 'x', label: 'X', unit: 'm' },
        { key: 'y', label: 'Y', unit: 'm' },
        { key: 'z', label: 'Z', unit: 'm' },
        { key: 'y1', label: 'Y₁', unit: 'm' },
        { key: 'y2', label: 'Y₂', unit: 'm' },
        { key: 'vx', label: 'Vₓ', unit: 'm/s' },
        { key: 'vy', label: 'Vᵧ', unit: 'm/s' },
        { key: 'vz', label: 'V_z', unit: 'm/s' },
        { key: 'v', label: 'Speed', unit: 'm/s' },
        { key: 'ax', label: 'Aₓ', unit: 'm/s²' },
        { key: 'ay', label: 'Aᵧ', unit: 'm/s²' },
        { key: 'az', label: 'A_z', unit: 'm/s²' },
        { key: 'a', label: 'Accel.', unit: 'm/s²' },
        { key: 'theta', label: 'θ', unit: 'rad' },
        { key: 'omega', label: 'ω', unit: 'rad/s' },
        { key: 'alpha', label: 'α', unit: 'rad/s²' },
        { key: 'ke', label: 'KE', unit: 'J' },
        { key: 'pe', label: 'PE', unit: 'J' },
        { key: 'e_total', label: 'E_total', unit: 'J' },
        { key: 'f_normal', label: 'Normal', unit: 'N' },
        { key: 'f_friction', label: 'Friction', unit: 'N' },
        { key: 'tension', label: 'Tension', unit: 'N' },
      ];

      allVars.forEach(({ key, label, unit }) => {
        if (currentData[key] !== undefined) {
          vars.push({ label, value: currentData[key], unit });
        }
      });
    }

    return vars;
  }, [currentData, scenario]);

  if (visibleVariables.length === 0) return null;

  return (
    <div className="variable-overlay">
      <div className="overlay-header">
        <span className="overlay-title">Live Values</span>
        <span className="overlay-time">t = {currentTime.toFixed(2)}s</span>
      </div>
      <div className="variable-grid">
        {visibleVariables.map((v, i) => (
          <div key={i} className="variable-item">
            <span className="variable-label">{v.label}</span>
            <span className="variable-value">
              {Number(v.value).toFixed(2)} <span className="variable-unit">{v.unit}</span>
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .variable-overlay {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          min-width: 180px;
        }
        .overlay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .overlay-title {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
        }
        .overlay-time {
          color: #94a3b8;
          font-size: 0.75rem;
          font-variant-numeric: tabular-nums;
        }
        .variable-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }
        .variable-item {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .variable-label {
          font-size: 0.7rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .variable-value {
          font-size: 0.95rem;
          font-weight: 500;
          color: #1e293b;
          font-variant-numeric: tabular-nums;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        .variable-unit {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 400;
          margin-left: 0.25rem;
        }
      `}</style>
    </div>
  );
}