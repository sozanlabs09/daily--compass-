export const DEFAULT_PLAN = 'free';

export function normalizePlan(plan) {
  return plan === 'premium' ? 'premium' : DEFAULT_PLAN;
}

export function isPremiumActive(profile) {
  if (!profile || profile.plan !== 'premium') {
    return false;
  }

  if (!profile.subscription_expires_at) {
    return false;
  }

  const expiryDate = new Date(profile.subscription_expires_at);

  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }

  return expiryDate.getTime() > Date.now();
}

export function getEffectivePlan(profile) {
  return isPremiumActive(profile) ? 'premium' : DEFAULT_PLAN;
}

export function getSubscriptionStatus(profile) {
  if (!profile || normalizePlan(profile.plan) === 'free') {
    return 'free';
  }

  return isPremiumActive(profile) ? 'active' : 'expired';
  }
