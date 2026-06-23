import type { Request, Response } from "express";
import { verifyAdMobSignature, grantVerifiedReward } from "./ads.service";
import { logger } from "../../utils/logger";

/**
 * AdMob SSV callback. Public (Google calls it) but authenticated by the signed
 * payload, not by our JWT. Always respond 200 on a handled callback so AdMob
 * stops retrying; respond non-2xx only when the signature is invalid.
 */
export async function ssvController(req: Request, res: Response) {
  const rawQuery = req.originalUrl.split("?")[1] ?? "";

  const signature = String(req.query.signature ?? "");
  const keyId = String(req.query.key_id ?? "");
  const userId = String(req.query.user_id ?? "");
  const customData = String(req.query.custom_data ?? "");
  const transactionId = String(req.query.transaction_id ?? "");

  if (!signature || !keyId || !transactionId) {
    return res.status(400).send("Missing SSV parameters");
  }

  let valid = false;
  try {
    valid = await verifyAdMobSignature(rawQuery, signature, keyId);
  } catch (err) {
    logger.error("AdMob SSV: verification error", err);
    return res.status(500).send("Verification error");
  }

  if (!valid) {
    logger.warn("AdMob SSV: invalid signature");
    return res.status(403).send("Invalid signature");
  }

  if (!userId || !customData) {
    // Verified but nothing to grant (shouldn't happen with our SSV options).
    return res.status(200).send("OK");
  }

  try {
    await grantVerifiedReward({ userId, customData, transactionId });
  } catch (err) {
    logger.error("AdMob SSV: grant error", err);
    // 500 so AdMob retries (the transaction wasn't recorded on a throw here).
    return res.status(500).send("Grant error");
  }

  return res.status(200).send("OK");
}
