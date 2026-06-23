import { User } from "../users/user.model";
import {
  ConflictError,
  ValidationError,
  NotFoundError,
} from "../../shared/errors/AppError";
import { levelForXp } from "../../shared/leveling";

export type ShopItemId =
  | "hint_x1"
  | "hint_x3"
  | "hint_x5"
  | "avatar_detective"
  | "avatar_masked"
  | "avatar_inspector"
  | "avatar_prodigy"
  | "avatar_ace"
  | "avatar_legend"
  | "title_shadow"
  | "title_arbiter"
  | "title_mastermind"
  | "title_maverick"
  | "title_decorated"
  | "title_phantom";

export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  price: number;
  type: "hint" | "avatar" | "title";
  emoji: string;
  quantity?: number;
  /** Minimum account level required to purchase (gates top-tier cosmetics). */
  requiredLevel?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Hints ────────────────────────────────────────────────────────────────
  {
    id: "hint_x1",
    name: "1 Hint",
    description: "Reveals a key clue during investigation",
    price: 150,
    type: "hint",
    emoji: "💡",
    quantity: 1,
  },
  {
    id: "hint_x3",
    name: "3 Hints",
    description: "Better value — 3 hints for investigations",
    price: 400,
    type: "hint",
    emoji: "💡",
    quantity: 3,
  },
  {
    id: "hint_x5",
    name: "5 Hints",
    description: "Best value — stock up on 5 hints",
    price: 600,
    type: "hint",
    emoji: "💡",
    quantity: 5,
  },

  // ── Avatars (cheap → prestige) ────────────────────────────────────────────
  {
    id: "avatar_detective",
    name: "Detective Avatar",
    description: "Classic detective silhouette with hat",
    price: 200,
    type: "avatar",
    emoji: "🕵️",
  },
  {
    id: "avatar_masked",
    name: "Masked Sleuth",
    description: "Goes undercover to crack any case",
    price: 350,
    type: "avatar",
    emoji: "🎭",
  },
  {
    id: "avatar_inspector",
    name: "Inspector Avatar",
    description: "Elite inspector badge avatar",
    price: 700,
    type: "avatar",
    emoji: "🔍",
  },
  {
    id: "avatar_prodigy",
    name: "The Prodigy",
    description: "A rising star of deduction",
    price: 1000,
    type: "avatar",
    emoji: "✨",
  },
  {
    id: "avatar_ace",
    name: "Ace Detective",
    description: "Top of the class, every single case",
    price: 1400,
    type: "avatar",
    emoji: "⭐",
  },
  {
    id: "avatar_legend",
    name: "Legend Avatar",
    description: "Exclusive golden crown — Level 10 required",
    price: 2000,
    type: "avatar",
    emoji: "👑",
    requiredLevel: 10,
  },

  // ── Titles (cheap → prestige) ─────────────────────────────────────────────
  {
    id: "title_shadow",
    name: "Shadow Detective",
    description: "Mysterious title for elite players",
    price: 400,
    type: "title",
    emoji: "🌑",
  },
  {
    id: "title_arbiter",
    name: "The Arbiter",
    description: "Judge of truth and lies",
    price: 600,
    type: "title",
    emoji: "⚖️",
  },
  {
    id: "title_mastermind",
    name: "The Mastermind",
    description: "For those who solve every case",
    price: 1200,
    type: "title",
    emoji: "🧠",
  },
  {
    id: "title_maverick",
    name: "The Maverick",
    description: "Plays by their own rules",
    price: 1600,
    type: "title",
    emoji: "⚡",
  },
  {
    id: "title_decorated",
    name: "Decorated Agent",
    description: "Honored for service to justice",
    price: 2200,
    type: "title",
    emoji: "🏅",
  },
  {
    id: "title_phantom",
    name: "The Phantom",
    description: "Ultra rare title — Level 15 required",
    price: 3000,
    type: "title",
    emoji: "👻",
    requiredLevel: 15,
  },
];

export async function getShopItems() {
  return SHOP_ITEMS;
}

export async function purchaseItem(userId: string, itemId: ShopItemId) {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError("Item");

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User");

  // Level gate (top-tier cosmetics). Derive level from XP so the check is
  // correct even if the stored level is briefly stale.
  if (item.requiredLevel) {
    const level = levelForXp(user.xp ?? 0);
    if (level < item.requiredLevel) {
      throw new ValidationError(
        `Reach Level ${item.requiredLevel} to unlock ${item.name} (you're Level ${level}).`,
      );
    }
  }

  if (user.coins < item.price) {
    throw new ValidationError(
      `Not enough coins. Need ${item.price}, have ${user.coins}`,
    );
  }

  // Check if already owned (avatars and titles)
  if (item.type === "avatar" || item.type === "title") {
    const owned = user.inventory ?? [];
    if (owned.includes(itemId)) {
      throw new ConflictError("Item already owned");
    }
  }

  // Deduct coins
  const update: any = {
    $inc: { coins: -item.price },
  };

  // Apply item effect
  if (item.type === "hint") {
    update.$inc.hints = item.quantity ?? 1;
  } else {
    update.$push = { inventory: itemId };
  }

  await User.findByIdAndUpdate(userId, update);

  return {
    item,
    coinsSpent: item.price,
    coinsRemaining: user.coins - item.price,
  };
}

export async function equipItem(userId: string, itemId: string) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User");

  const owned = user.inventory ?? [];
  if (!owned.includes(itemId)) {
    throw new ValidationError("Item not owned");
  }

  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError("Item");

  // Toggle: equipping the item that's already active unequips it (reverts to
  // the default avatar / no title).
  const update: any = {};
  let equipped: string | null = itemId;

  if (item.type === "avatar") {
    const alreadyEquipped = user.avatar === itemId;
    update.avatar = alreadyEquipped ? "default" : itemId;
    equipped = alreadyEquipped ? null : itemId;
  }
  if (item.type === "title") {
    const alreadyEquipped = user.title === itemId;
    update.title = alreadyEquipped ? null : itemId;
    equipped = alreadyEquipped ? null : itemId;
  }

  await User.findByIdAndUpdate(userId, update);
  return { equipped };
}
