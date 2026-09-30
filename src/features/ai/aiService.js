/**
 * DevaSetu AI Client Service
 * Communicates with backend Express endpoints for AI spatial layout generation & optimization.
 * Uses centralized API_BASE_URL. Never stores or transmits API keys from the browser.
 */

import { API_BASE_URL } from '../../lib/api.js';

/**
 * Checks backend AI service status
 */
export async function checkAiServiceStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/status`);
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch (err) {
    return { success: false, configured: false, error: err.message };
  }
}

/**
 * Requests AI layout generation or optimization from backend
 */
export async function requestAiLayout({ scene, prompt = '', mode = 'generate', allowFallback = true }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/layout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scene,
        prompt,
        mode,
        allowFallback,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.message || 'AI layout generation is temporarily unavailable. You can continue designing manually.',
        error: data.error,
        status: res.status,
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      message: 'AI layout generation is temporarily unavailable. You can continue designing manually.',
      error: err.message,
    };
  }
}
