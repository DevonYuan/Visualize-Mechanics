import { VITE_API_URL } from '../config';

/**
 * Upload image to backend /api/v1/solve endpoint
 * Supports both multipart/form-data (file) and base64
 */
export async function solveProblem(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${VITE_API_URL}/api/v1/solve`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the backend server is running.');
    }
    throw error;
  }
}

/**
 * Alternative: solve with base64 encoded image
 */
export async function solveProblemBase64(imageBase64, contentType = 'image/jpeg') {
  try {
    const response = await fetch(`${VITE_API_URL}/api/v1/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        image_b64: imageBase64,
        content_type: contentType,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the backend server is running.');
    }
    throw error;
  }
}

/**
 * Check backend health
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${VITE_API_URL}/api/v1/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}