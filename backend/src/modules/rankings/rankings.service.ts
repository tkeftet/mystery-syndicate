import { User } from "../users/user.model";
import { Investigation } from "../investigations/investigation.model";

export async function getDailyLeaderboard() {
  const today = new Date().toISOString().split("T")[0];
  const start = new Date(today);
  const end = new Date(today);
  end.setDate(end.getDate() + 1);

  const results = await Investigation.aggregate([
    {
      $match: {
        status: "completed",
        completedAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$userId",
        score: { $max: "$score" },
        isCorrect: { $first: "$isCorrect" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: "users",
        let: { userId: { $toObjectId: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
          { $project: { username: 1, avatar: 1, rank: 1, level: 1 } },
        ],
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        score: 1,
        isCorrect: 1,
        username: "$user.username",
        avatar: "$user.avatar",
        rank: "$user.rank",
        level: "$user.level",
      },
    },
  ]);

  return results;
}

export async function getWeeklyLeaderboard() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const results = await Investigation.aggregate([
    {
      $match: {
        status: "completed",
        completedAt: { $gte: startOfWeek },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalScore: { $sum: "$score" },
        casesSolved: { $sum: 1 },
        correctSolutions: {
          $sum: { $cond: ["$isCorrect", 1, 0] },
        },
      },
    },
    { $sort: { totalScore: -1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: "users",
        let: { userId: { $toObjectId: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
          { $project: { username: 1, avatar: 1, rank: 1, level: 1 } },
        ],
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        totalScore: 1,
        casesSolved: 1,
        correctSolutions: 1,
        username: "$user.username",
        avatar: "$user.avatar",
        rank: "$user.rank",
        level: "$user.level",
      },
    },
  ]);

  return results;
}

export async function getAllTimeLeaderboard() {
  const users = await User.find({ isBanned: false })
    .select("username avatar rank level xp streak totalSolved totalCorrect")
    .sort({ xp: -1 })
    .limit(50);

  return users.map((u) => ({
    userId: u.id,
    username: u.username,
    avatar: u.avatar,
    rank: u.rank,
    level: u.level,
    xp: u.xp,
    streak: u.streak,
    totalSolved: u.totalSolved,
    title: u.title ?? null,
    accuracy:
      u.totalSolved > 0
        ? Math.round((u.totalCorrect / u.totalSolved) * 100)
        : 0,
  }));
}

/**
 * Detective of the Week — recognition board across three categories (all-time):
 * top accuracy (min 5 solved, so 1/1 = 100% doesn't win), longest current
 * streak, and most cases solved. Each returns the top few players.
 */
export async function getDetectiveOfTheWeek(limit = 5) {
  const project = {
    userId: "$_id",
    username: 1,
    avatar: 1,
    streak: 1,
    totalSolved: 1,
    accuracy: {
      $cond: [
        { $gt: ["$totalSolved", 0] },
        {
          $round: [
            { $multiply: [{ $divide: ["$totalCorrect", "$totalSolved"] }, 100] },
            0,
          ],
        },
        0,
      ],
    },
  };

  const [topAccuracy, longestStreak, mostSolved] = await Promise.all([
    User.aggregate([
      { $match: { isBanned: false, totalSolved: { $gte: 5 } } },
      { $project: project },
      { $sort: { accuracy: -1, totalSolved: -1 } },
      { $limit: limit },
    ]),
    User.aggregate([
      { $match: { isBanned: false, streak: { $gt: 0 } } },
      { $project: project },
      { $sort: { streak: -1 } },
      { $limit: limit },
    ]),
    User.aggregate([
      { $match: { isBanned: false, totalSolved: { $gt: 0 } } },
      { $project: project },
      { $sort: { totalSolved: -1 } },
      { $limit: limit },
    ]),
  ]);

  return { topAccuracy, longestStreak, mostSolved };
}

export async function getUserRank(userId: string) {
  const user = await User.findById(userId);
  if (!user) return null;

  const allTimeRank =
    (await User.countDocuments({
      xp: { $gt: user.xp },
      isBanned: false,
    })) + 1;

  return {
    allTime: allTimeRank,
    xp: user.xp,
    streak: user.streak,
    totalSolved: user.totalSolved,
  };
}
