import { create } from 'zustand';

const initialState = {
  scenario: null,
  parameters: null,
  animationSpec: null,
  workedSolution: null,
  timeSeries: null,
  currentTime: 0,
  isPlaying: false,
  isLoading: false,
  error: null,
  uploadStatus: 'idle',
};

export const useProblemStore = create((set) => ({
  ...initialState,

  setProblemData: (data) => set({
    scenario: data.scenario,
    parameters: data.parameters,
    animationSpec: data.animation_spec,
    workedSolution: data.worked_solution,
    timeSeries: data.time_series,
    currentTime: 0,
    isPlaying: false,
    error: null,
    uploadStatus: 'success',
    isLoading: false,
  }),

  setCurrentTime: (time) => set({ currentTime: time }),

  setPlayState: (playing) => set({ isPlaying: playing }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false, uploadStatus: 'error' }),

  setUploadStatus: (status) => set({ uploadStatus: status }),

  reset: () => set(initialState),
}));