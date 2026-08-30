// Frontend configuration
// In packaged app, backend runs on port 3000 (set by electron main.js)
// In development, Vite proxy forwards /api to localhost:3000
export const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const VITE_ENABLE_LOCAL_MODELS = import.meta.env.VITE_ENABLE_LOCAL_MODELS === 'true';