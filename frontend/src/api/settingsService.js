import { VITE_API_URL } from '../config';

/**
 * Get the current NIM API key status (masked)
 */
export async function getNIMKeyStatus() {
  try {
    const response = await fetch(`${VITE_API_URL}/api/v1/settings/nim-key`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the backend server is running.');
    }
    throw error;
  }
}

/**
 * Set the NIM API key
 */
export async function setNIMKey(apiKey) {
  try {
    const response = await fetch(`${VITE_API_URL}/api/v1/settings/nim-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey }),
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

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the backend server is running.');
    }
    throw error;
  }
}

/**
 * Delete the NIM API key
 */
export async function deleteNIMKey() {
  try {
    const response = await fetch(`${VITE_API_URL}/api/v1/settings/nim-key`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the backend server is running.');
    }
    throw error;
  }
}

/**
 * Get the database path (for debugging)
 */
export async function getDatabasePath() {
  try {
    const response = await fetch(`${VITE_API_URL}/api/v1/settings/db-path`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend. Make sure the backend server is running.');
    }
    throw error;
  }
}