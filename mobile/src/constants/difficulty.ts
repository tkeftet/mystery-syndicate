import { colors } from "../theme";
import type { TranslationKey } from "../i18n";

/**
 * Shared difficulty presentation config. Labels are translation keys so every
 * screen renders them in the active language via t(config.labelKey).
 */
export const DIFFICULTY_CONFIG: Record<
  string,
  { labelKey: TranslationKey; color: string; level: number }
> = {
  easy: { labelKey: "difficulty.easy", color: colors.green, level: 1 },
  medium: { labelKey: "difficulty.medium", color: colors.warning, level: 2 },
  hard: { labelKey: "difficulty.hard", color: colors.coral, level: 3 },
  expert: { labelKey: "difficulty.expert", color: "#B58BD6", level: 4 },
};
