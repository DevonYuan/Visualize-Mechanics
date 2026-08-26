// Shared TypeScript types matching backend API contracts

export type ScenarioType =
  | 'projectile_motion'
  | 'kinematics_1d'
  | 'inclined_plane'
  | 'collision_1d'
  | 'rotational_kinematics'
  | 'mass_spring'
  | 'torque'
  | 'conceptual_mc';

export interface CameraSpec {
  position: [number, number, number];
  target: [number, number, number];
}

export interface AnimationSpec {
  duration_s: number;
  fps: number;
  camera: CameraSpec;
}

export interface SolutionStep {
  step: number;
  description: string;
  equation: string | null;
}

export interface WorkedSolution {
  steps: SolutionStep[];
  final_answer: Record<string, string>;
}

export interface TimeSeries {
  t: number[];
  // Translational
  x?: number[];
  y?: number[];
  z?: number[];
  vx?: number[];
  vy?: number[];
  vz?: number[];
  v?: number[];
  ax?: number[];
  ay?: number[];
  az?: number[];
  a?: number[];
  // Translational (two objects for collision_1d)
  x1?: number[];
  x2?: number[];
  v1?: number[];
  v2?: number[];
  a1?: number[];
  a2?: number[];
  // Rotational
  theta?: number[];
  omega?: number[];
  alpha?: number[];
  // Energy
  ke?: number[];
  pe?: number[];
  e_total?: number[];
  // Spring
  x_eq?: number[];
  // Forces
  force?: number[];
  f_normal?: number[];
  f_friction?: number[];
  tension?: number[];
}

export interface SolveResponse {
  scenario: ScenarioType;
  parameters: Record<string, number>;
  // Conceptual MC responses have no animation / time series (unless the backend
  // derives one from concrete numbers in the question).
  animation_spec?: AnimationSpec | null;
  worked_solution: WorkedSolution;
  time_series?: TimeSeries | null;
}

export interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
  data?: SolveResponse;
}

// Helper functions for time-series data access
export function getFrameData(timeSeries: TimeSeries, frameIndex: number): Record<string, number | undefined> {
  return {
    t: timeSeries.t[frameIndex],
    x: timeSeries.x?.[frameIndex],
    y: timeSeries.y?.[frameIndex],
    z: timeSeries.z?.[frameIndex],
    vx: timeSeries.vx?.[frameIndex],
    vy: timeSeries.vy?.[frameIndex],
    vz: timeSeries.vz?.[frameIndex],
    v: timeSeries.v?.[frameIndex],
    ax: timeSeries.ax?.[frameIndex],
    ay: timeSeries.ay?.[frameIndex],
    az: timeSeries.az?.[frameIndex],
    a: timeSeries.a?.[frameIndex],
    x1: timeSeries.x1?.[frameIndex],
    x2: timeSeries.x2?.[frameIndex],
    v1: timeSeries.v1?.[frameIndex],
    v2: timeSeries.v2?.[frameIndex],
    a1: timeSeries.a1?.[frameIndex],
    a2: timeSeries.a2?.[frameIndex],
    y1: timeSeries.y1?.[frameIndex],
    y2: timeSeries.y2?.[frameIndex],
    theta: timeSeries.theta?.[frameIndex],
    omega: timeSeries.omega?.[frameIndex],
    alpha: timeSeries.alpha?.[frameIndex],
    ke: timeSeries.ke?.[frameIndex],
    pe: timeSeries.pe?.[frameIndex],
    e_total: timeSeries.e_total?.[frameIndex],
    x_eq: timeSeries.x_eq?.[frameIndex],
    force: timeSeries.force?.[frameIndex],
    f_normal: timeSeries.f_normal?.[frameIndex],
    f_friction: timeSeries.f_friction?.[frameIndex],
    tension: timeSeries.tension?.[frameIndex],
  };
}

/**
 * Maps a playback time to the frame index, using the same lookup the 3D scenes use
 * (first sample at or after `currentTime`), so the variable overlay and the scene
 * always agree on which frame is shown.
 */
export function getFrameIndex(timeSeries: TimeSeries, currentTime: number): number {
  if (!timeSeries?.t?.length) return 0;
  const idx = timeSeries.t.findIndex(t => t >= currentTime);
  return idx >= 0 ? Math.min(idx, timeSeries.t.length - 1) : timeSeries.t.length - 1;
}