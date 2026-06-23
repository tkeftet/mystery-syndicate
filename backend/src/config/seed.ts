import { Case } from "../modules/cases/case.model";
import { seedCases } from "../modules/cases/cases.seed";
import { logger } from "../utils/logger";

export async function seedDatabase() {
  const count = await Case.countDocuments();

  if (count > 0) {
    logger.info("Database already seeded, skipping.");
    return;
  }

  await Case.insertMany(seedCases);
  logger.info(`Seeded ${seedCases.length} cases.`);
}
