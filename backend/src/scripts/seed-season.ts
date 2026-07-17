/**
 * DEPRECATED — superseded by the trilingual launch content generator.
 *
 * This seed used to insert one English-only sample Story Arc season. All game
 * content (daily + mini + mega + seasons) is now generated in one shot, with
 * every text field stored as { en, fr, ar }, by:
 *
 *   yarn content:launch      (src/scripts/seed-launch-content.ts)
 *
 * Kept as a stub so old workflows fail loudly instead of silently reseeding
 * English-only content. (The previous implementation is in git history.)
 */
import { logger } from "../utils/logger";

logger.warn("seed:season is deprecated — run `yarn content:launch` instead (trilingual daily/mini/mega/season content).");
process.exit(1);
