import { useProblemStore } from '../store/useProblemStore';

export default function ParametersDisplay() {
  const { parameters, scenario } = useProblemStore();

  if (!parameters || Object.keys(parameters).length === 0) {
    return null;
  }

  // Filter out internal/verified parameters for cleaner display
  const displayParams = Object.entries(parameters).filter(([key]) => {
    // Hide internal verification fields and raw computed fields
    return !key.endsWith('_verified') && 
           key !== 'I' && 
           key !== 'tau' &&
           key !== 'mass' && // often not directly relevant
           key !== 'g'; // standard gravity, usually implied
  });

  // Group parameters by category
  const kinematicParams = displayParams.filter(([key]) => 
    ['theta0', 'omega0', 'alpha', 't_end', 'delta_theta', 'v0', 'x0', 'a', 'angle_deg', 'initial_height', 'period', 'omega', 'amplitude', 'damping'].includes(key)
  );
  
  const physicalParams = displayParams.filter(([key]) => 
    ['radius', 'object_type', 'mass', 'k', 'mu_k', 'length', 'f_friction'].includes(key)
  );
  
  const derivedParams = displayParams.filter(([key]) => 
    ['omega_final_verified', 'theta_total_verified', 'a_verified', 't_flight_verified', 'range_verified', 'max_height_verified', 'omega_verified', 'period_verified', 'amplitude_verified', 'x0_verified', 'I_verified', 'alpha_verified', 'tension_verified', 'distance_verified'].includes(key)
  );

  const otherParams = displayParams.filter(([key]) => 
    !['theta0', 'omega0', 'alpha', 't_end', 'delta_theta', 'v0', 'x0', 'a', 'angle_deg', 'initial_height', 'period', 'omega', 'amplitude', 'damping', 'radius', 'object_type', 'mass', 'k', 'mu_k', 'length', 'f_friction', 'omega_final_verified', 'theta_total_verified', 'a_verified', 't_flight_verified', 'range_verified', 'max_height_verified', 'omega_verified', 'period_verified', 'amplitude_verified', 'x0_verified', 'I_verified', 'alpha_verified', 'tension_verified', 'distance_verified'].includes(key)
  );

  const formatKey = (key) => {
    const labels = {
      theta0: 'θ₀',
      omega0: 'ω₀',
      alpha: 'α',
      t_end: 't',
      delta_theta: 'Δθ',
      v0: 'v₀',
      x0: 'x₀',
      a: 'a',
      angle_deg: 'θ',
      initial_height: 'h₀',
      period: 'T',
      omega: 'ω',
      amplitude: 'A',
      damping: 'b',
      radius: 'r',
      object_type: 'Type',
      mass: 'm',
      k: 'k',
      mu_k: 'μₖ',
      length: 'L',
      f_friction: 'f',
      omega_final_verified: 'ω (verified)',
      theta_total_verified: 'θ (verified)',
      a_verified: 'a (verified)',
      t_flight_verified: 't_flight (verified)',
      range_verified: 'Range (verified)',
      max_height_verified: 'h_max (verified)',
      omega_verified: 'ω (verified)',
      period_verified: 'T (verified)',
      amplitude_verified: 'A (verified)',
      x0_verified: 'x₀ (verified)',
      I_verified: 'I (verified)',
      alpha_verified: 'α (verified)',
      tension_verified: 'Tension (verified)',
      distance_verified: 'd (verified)',
    };
    return labels[key] || key;
  };

  const formatValue = (key, value) => {
    if (typeof value === 'number') {
      // Special formatting for certain keys
      if (key === 'object_type') {
        const types = {
          'disk': 'Disk (solid cylinder)',
          'hoop': 'Hoop (thin ring)',
          'sphere': 'Solid sphere',
          'rod': 'Rod (about end)',
        };
        return types[value] || value;
      }
      if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.01 && value !== 0)) {
        return value.toExponential(2);
      }
      return value.toFixed(3).replace(/\.?0+$/, '');
    }
    return String(value);
  };

  const getUnit = (key) => {
    const units = {
      theta0: 'rad',
      omega0: 'rad/s',
      alpha: 'rad/s²',
      t_end: 's',
      delta_theta: 'rad',
      v0: 'm/s',
      x0: 'm',
      a: 'm/s²',
      angle_deg: '°',
      initial_height: 'm',
      period: 's',
      omega: 'rad/s',
      amplitude: 'm',
      damping: 'kg/s',
      radius: 'm',
      object_type: '',
      mass: 'kg',
      k: 'N/m',
      mu_k: '',
      length: 'm',
      f_friction: 'N',
      omega_final_verified: 'rad/s',
      theta_total_verified: 'rad',
      a_verified: 'm/s²',
      t_flight_verified: 's',
      range_verified: 'm',
      max_height_verified: 'm',
      omega_verified: 'rad/s',
      period_verified: 's',
      amplitude_verified: 'm',
      x0_verified: 'm',
      I_verified: 'kg·m²',
      alpha_verified: 'rad/s²',
      tension_verified: 'N',
      distance_verified: 'm',
    };
    return units[key] || '';
  };

  const renderParamGroup = (title, params) => {
    if (params.length === 0) return null;
    return (
      <div className="param-group">
        <h4 className="param-group-title">{title}</h4>
        <div className="param-grid">
          {params.map(([key, value], i) => (
            <div key={i} className="param-item">
              <span className="param-label">{formatKey(key)}</span>
              <span className="param-value">
                {formatValue(key, value)}
                {getUnit(key) && <span className="param-unit">{getUnit(key)}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="parameters-display">
      <h3 className="parameters-title">Problem Parameters</h3>
      {renderParamGroup('Kinematic', kinematicParams)}
      {renderParamGroup('Physical', physicalParams)}
      {renderParamGroup('Derived (Verified)', derivedParams)}
      {renderParamGroup('Other', otherParams)}

      <style jsx>{`
        .parameters-display {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .parameters-title {
          margin: 0 0 1rem;
          font-size: 1rem;
          color: #1e293b;
          font-weight: 600;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .param-group {
          margin-bottom: 1rem;
        }
        .param-group:last-child {
          margin-bottom: 0;
        }
        .param-group-title {
          margin: 0 0 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .param-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
        }
        .param-item {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          padding: 0.5rem 0.75rem;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .param-label {
          font-size: 0.65rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .param-value {
          font-size: 0.9rem;
          font-weight: 500;
          color: #1e293b;
          font-variant-numeric: tabular-nums;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }
        .param-unit {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}