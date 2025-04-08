import { db } from '@/lib/db';
import { auth} from '@clerk/nextjs/server';
import { getUserSubscriptionStatus } from '@/lib/stripe';

export const UPLOAD_LIMITS = {
  FREE: 10,
  PRO: Infinity
} as const;

export async function checkAndUpdateUploadLimit() {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      monthlyUploadsUsed: true,
      lastUploadReset: true,
    }
  });

  if (!user) throw new Error('User not found');

  // Reset counter if it's a new month
  const lastReset = new Date(user.lastUploadReset);
  const now = new Date();
  const isNewMonth = lastReset.getMonth() !== now.getMonth() || 
                    lastReset.getFullYear() !== now.getFullYear();

  if (isNewMonth) {
    await db.user.update({
      where: { id: userId },
      data: {
        monthlyUploadsUsed: 0,
        lastUploadReset: now
      }
    });
    return true;
  }

  // Check limits for free users
  const subData = await getUserSubscriptionStatus(userId);
  if (subData?.status !== 'active') {
    if (user.monthlyUploadsUsed >= UPLOAD_LIMITS.FREE) {
      throw new Error(`You've reached your monthly limit of ${UPLOAD_LIMITS.FREE} uploads. Upgrade to Pro for unlimited uploads.`);
    }

    // Increment upload count
    await db.user.update({
      where: { id: userId },
      data: {
        monthlyUploadsUsed: {
          increment: 1
        }
      }
    });
  }

  return true;
}