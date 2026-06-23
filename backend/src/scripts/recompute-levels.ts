/**
 * One-off data repair. Run once after deploy:  yarn migrate:levels
 *
 * 1. Recompute every user's stored `level` from their `xp` using the current
 *    curve in ../shared/leveling. Needed after the 10x level-curve rescale —
 *    accounts keep their XP but their level recomputes much lower, and the
 *    stored value (shown on Home, Leaderboard and the Profile avatar badge)
 *    otherwise only self-corrects on the next solve.
 * 2. Clamp any negative `hints` / `coins` back to 0. The old (non-atomic) hint
 *    decrement could race two requests below 0; the balance is now guarded
 *    atomically in useHint, but existing accounts may already be negative.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database";
import { User } from "../modules/users/user.model";
import { levelForXp } from "../shared/leveling";
import { logger } from "../utils/logger";

async function run() {
  await connectDatabase();

  const users = await User.find({}, "xp level hints coins");
  let levelFixed = 0;
  let balanceFixed = 0;

  for (const user of users) {
    const update: Record<string, number> = {};

    const newLevel = levelForXp(user.xp ?? 0);
    if (newLevel !== user.level) update.level = newLevel;

    if ((user.hints ?? 0) < 0) update.hints = 0;
    if ((user.coins ?? 0) < 0) update.coins = 0;

    if (Object.keys(update).length > 0) {
      await User.findByIdAndUpdate(user._id, update);
      if ("level" in update) levelFixed += 1;
      if ("hints" in update || "coins" in update) balanceFixed += 1;
    }
  }

  logger.info(
    `Repair complete (${users.length} users): ${levelFixed} levels recomputed, ${balanceFixed} negative balances clamped.`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error("Level recompute failed:", err);
  process.exit(1);
});
