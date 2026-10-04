/**
 * DevaSetu Backend API Configuration & Health Client
 * Centralized API base URL using Vite environment variables.
 */

export const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5001'
)
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

export default API_BASE_URL;

/**
 * Checks backend health endpoint
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[DevaSetu API] Health check failed:', error.message);
    return { success: false, error: error.message };
  }
}
