// Shared TypeScript types matching backend API contracts

export type ScenarioType =
  | 'projectile_motion'
  | 'kinematics_1d'
  | 'inclined_plane'
  | 'atwood_machine'
  | 'collision_1d'
  | 'rotational_kinematics'
  | 'mass_spring';

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
  animation_spec: AnimationSpec;
  worked_solution: WorkedSolution;
  time_series: TimeSeries;
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

export function getFrameIndex(timeSeries: TimeSeries, currentTime: number): number {
  const duration = timeSeries.t[timeSeries.t.length - 1] || 1;
  const ratio = Math.min(Math.max(currentTime / duration, 0), 1);
  return Math.floor(ratio * (timeSeries.t.length - 1));
}