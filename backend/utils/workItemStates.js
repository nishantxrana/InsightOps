/**
 * Work Item State Categorization Utility
 * 
 * Provides consistent state categorization logic across the application
 * based on the defined business rules:
 * 
 * Non-active states: Defined, New, Closed, Blocked, Paused, Removed, Released to Production
 * Active states: All other states (In Progress, Active, Resolved, etc.)
 * Completed states: Closed, Removed, Released to Production
 */

// Define state categories
export const NON_ACTIVE_STATES = [
  'Defined',
  'New', 
  'Closed',
  'Blocked',
  'Paused',
  'Removed',
  'Released to Production'
];

export const COMPLETED_STATES = [
  'Closed',
  'Removed',
  'Released to Production'
];

/**
 * Check if a work item state is active
 * @param {string} state - The work item state
 * @returns {boolean} True if the state is active, false otherwise
 */
export function isActiveState(state) {
  if (!state) return false;
  return !NON_ACTIVE_STATES.includes(state);
}

/**
 * Check if a work item state is completed
 * @param {string} state - The work item state
 * @returns {boolean} True if the state is completed, false otherwise
 */
export function isCompletedState(state) {
  if (!state) return false;
  return COMPLETED_STATES.includes(state);
}

/**
 * Check if a work item state is non-active
 * @param {string} state - The work item state
 * @returns {boolean} True if the state is non-active, false otherwise
 */
export function isNonActiveState(state) {
  if (!state) return false;
  return NON_ACTIVE_STATES.includes(state);
}

/**
 * Filter work items by active state
 * @param {Array} workItems - Array of work items
 * @returns {Array} Array of active work items
 */
export function filterActiveWorkItems(workItems) {
  return workItems.filter(wi => {
    const state = wi.fields?.['System.State'];
    return isActiveState(state);
  });
}

/**
 * Filter work items by completed state
 * @param {Array} workItems - Array of work items
 * @returns {Array} Array of completed work items
 */
export function filterCompletedWorkItems(workItems) {
  return workItems.filter(wi => {
    const state = wi.fields?.['System.State'];
    return isCompletedState(state);
  });
}

/**
 * Filter work items by non-active state
 * @param {Array} workItems - Array of work items
 * @returns {Array} Array of non-active work items
 */
export function filterNonActiveWorkItems(workItems) {
  return workItems.filter(wi => {
    const state = wi.fields?.['System.State'];
    return isNonActiveState(state);
  });
}

/**
 * Get work item state category
 * @param {string} state - The work item state
 * @returns {string} The category: 'active', 'completed', 'non-active', or 'unknown'
 */
export function getStateCategory(state) {
  if (!state) return 'unknown';
  
  if (isCompletedState(state)) return 'completed';
  if (isActiveState(state)) return 'active';
  if (isNonActiveState(state)) return 'non-active';
  
  return 'unknown';
}

/**
 * Generate WIQL condition to exclude completed states
 * @returns {string} WIQL condition string
 */
export function getWiqlExcludeCompletedCondition() {
  const stateList = COMPLETED_STATES.map(state => `'${state}'`).join(', ');
  return `[System.State] NOT IN (${stateList})`;
}

/**
 * Generate WIQL condition to include only active states
 * @returns {string} WIQL condition string (excludes non-active states)
 */
export function getWiqlActiveStatesCondition() {
  const stateList = NON_ACTIVE_STATES.map(state => `'${state}'`).join(', ');
  return `[System.State] NOT IN (${stateList})`;
}

/**
 * Generate WIQL condition to include only completed states
 * @returns {string} WIQL condition string
 */
export function getWiqlCompletedStatesCondition() {
  const stateList = COMPLETED_STATES.map(state => `'${state}'`).join(', ');
  return `[System.State] IN (${stateList})`;
}
