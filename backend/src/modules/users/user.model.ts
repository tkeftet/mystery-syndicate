import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import type { UserRank } from "../../shared/types/domain.types";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  isGuest: boolean;
  avatar: string;
  rank: UserRank;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  lastStreakDate: Date | null;
  totalSolved: number;
  totalCorrect: number;
  pushToken: string | null;
  hints: number;
  inventory: string[];
  title: string | null;
  // ── Cosmetic / profile customization ──
  activeFrame: string | null;
  activeBackground: string | null;
  activeNameColor: string | null;
  activePrestigeIcon: string | null;
  featuredBadge: string | null;
  featuredAchievement: string | null;
  profileLikes: number;
  profileViews: number;
  isBanned: boolean;
  lastSeenAt: Date | null;
  privacy: {
    profileVisibility: "public" | "friends" | "private";
    showOnline: boolean;
    showLastSeen: boolean;
    showStats: boolean;
    allowRequests: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  accuracy: number;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: false,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: "default",
    },
    rank: {
      type: String,
      enum: [
        "rookie",
        "junior_detective",
        "detective",
        "senior_detective",
        "inspector",
        "chief_inspector",
        "legend",
      ],
      default: "rookie",
    },
    level: {
      type: Number,
      default: 1,
    },
    xp: {
      type: Number,
      default: 0,
    },
    coins: {
      type: Number,
      default: 100,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastStreakDate: {
      type: Date,
      default: null,
    },
    totalSolved: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    pushToken: {
      type: String,
      default: null,
    },
    hints: {
      type: Number,
      default: 3, // start with 3 free hints
    },
    inventory: {
      type: [String],
      default: [],
    },
    title: {
      type: String,
      default: null,
    },
    // ── Cosmetic / profile customization ──
    activeFrame: { type: String, default: null },
    activeBackground: { type: String, default: null },
    activeNameColor: { type: String, default: null },
    activePrestigeIcon: { type: String, default: null },
    featuredBadge: { type: String, default: null },
    featuredAchievement: { type: String, default: null },
    profileLikes: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    isBanned: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ["public", "friends", "private"],
        default: "public",
      },
      showOnline: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
      allowRequests: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
);

// ── Virtual: accuracy ────────────────────────────────────────────────────────
userSchema.virtual("accuracy").get(function () {
  if (this.totalSolved === 0) return 0;
  return Math.round((this.totalCorrect / this.totalSolved) * 100);
});

// ── Pre-save: hash password ──────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash") || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Method: comparePassword ──────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (password: string) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ xp: -1 });
userSchema.index({ streak: -1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>("User", userSchema);
