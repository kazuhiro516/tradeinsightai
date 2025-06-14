import { prisma } from '@/lib/prisma';

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: {
      userId: userId,
    },
  });
}

export async function isSubscriptionActive(userId: string) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  return (
    subscription.status === 'active' &&
    !subscription.cancelAtPeriodEnd &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > new Date()
  );
}

export async function isInTrialPeriod(userId: string) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  return (
    subscription.status === 'trialing' &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > new Date()
  );
}
