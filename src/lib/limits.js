export const PLAN_LIMITS = {
  free: {
    tasks: 5,
    subjects: 2,
    books: 2,
    habits: 1,
    notebooks: 2,
    pagesPerNotebook: 1,
    stickyNotesPerPage: 2,
    calendarEvents: 2
  },

  premium: {
    tasks: Infinity,
    subjects: Infinity,
    books: Infinity,
    habits: Infinity,
    notebooks: Infinity,
    pagesPerNotebook: Infinity,
    stickyNotesPerPage: Infinity,
    calendarEvents: Infinity
  }
};

export const PLAN_FEATURES = {
  free: {
    advancedThemes: false,
    advancedStatistics: false,
    exportData: false,
    customOrganization: false
  },

  premium: {
    advancedThemes: true,
    advancedStatistics: true,
    exportData: true,
    customOrganization: true
  }
};

export function getPlanLimit(plan, feature) {
  const selectedPlan = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return selectedPlan[feature] ?? 0;
}

export function canUseFeature(plan, feature) {
  const selectedPlan = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  return selectedPlan[feature] === true;
}

export function hasReachedLimit(plan, feature, currentCount) {
  const limit = getPlanLimit(plan, feature);

  return Number.isFinite(limit) && currentCount >= limit;
    }
