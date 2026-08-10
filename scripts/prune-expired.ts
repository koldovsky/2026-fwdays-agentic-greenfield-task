import { db } from '../db';
import { pendingRegistrations, magicLinks, otpCodes } from '../db/schema';
import { lt } from 'drizzle-orm';

export async function pruneExpired() {
  const now = new Date();
  try {
    console.log('Starting pruning of expired records...');
    
    await db.delete(pendingRegistrations).where(lt(pendingRegistrations.expiresAt, now));
    await db.delete(magicLinks).where(lt(magicLinks.expiresAt, now));
    await db.delete(otpCodes).where(lt(otpCodes.expiresAt, now));
    
    console.log('Expired records pruned successfully.');
  } catch (error) {
    console.error('Failed to prune expired records:', error);
  }
}

// Support running directly from CLI
if (require.main === module) {
  pruneExpired()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
