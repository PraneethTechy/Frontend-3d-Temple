/**
 * DevaSetu Queue Plan API Service
 * Handles communication with backend persistence endpoints for saving, listing, loading, updating, and deleting plans.
 * Uses centralized API_BASE_URL.
 */

import { API_BASE_URL } from '../../lib/api.js';

export async function fetchSavedPlans() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch saved plans');
    }
    return { success: true, data: data.data || [], count: data.count || 0 };
  } catch (err) {
    console.error('[PlanService fetchSavedPlans]', err.message);
    return { success: false, message: err.message, data: [] };
  }
}

export async function fetchPlanById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load plan');
    }
    return { success: true, data: data.data };
  } catch (err) {
    console.error('[PlanService fetchPlanById]', err.message);
    return { success: false, message: err.message };
  }
}

export async function saveNewPlan({ name, scene, metadata = {} }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scene, metadata }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save plan');
    }
    return { success: true, message: data.message, data: data.data };
  } catch (err) {
    console.error('[PlanService saveNewPlan]', err.message);
    return { success: false, message: err.message };
  }
}

export async function updateExistingPlan(id, { name, scene, metadata = {} }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scene, metadata }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update plan');
    }
    return { success: true, message: data.message, data: data.data };
  } catch (err) {
    console.error('[PlanService updateExistingPlan]', err.message);
    return { success: false, message: err.message };
  }
}

export async function deletePlanById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete plan');
    }
    return { success: true, message: data.message, deletedId: id };
  } catch (err) {
    console.error('[PlanService deletePlanById]', err.message);
    return { success: false, message: err.message };
  }
}
