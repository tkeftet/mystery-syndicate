import crypto from "crypto";
import {
  adEliminateSuspect,
  adRevealRedHerring,
  claimDoubleReward,
} from "../investigations/investigations.service";
import { applyStreakSave } from "../dailyLogin";
import { ProcessedAdReward } from "./processedReward.model";
import { logger } from "../../utils/logger";

/**
 * AdMob server-side verification (SSV).
 *
 * When a user earns a rewarded ad, Google's servers send a GET request to our
 * callback URL with the reward details plus a `signature` + `key_id`. We verify
 * the ECDSA signature against Google's public keys, dedupe by `transaction_id`,
 * then grant the reward server-side. This is the ONLY way ad rewards are granted
 * — there is no client-callable grant endpoint — so a reward cannot be claimed
 * without Google confirming the ad was actually watched.
 *
 * Docs: https://developers.google.com/admob/android/rewarded-server-side-verification
 */

const VERIFIER_KEYS_URL =
  "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type VerifierKey = { keyId: number; pem: string; base64: string };
let keyCache: { fetchedAt: number; keys: Map<string, string> } | null = null;

async function fetchVerifierKeys(): Promise<Map<string, string>> {
  const res = await fetch(VERIFIER_KEYS_URL);
  if (!res.ok) throw new Error(`Verifier keys fetch failed: ${res.status}`);
  const json = (await res.json()) as { keys: VerifierKey[] };
  const keys = new Map<string, string>();
  for (const k of json.keys) keys.set(String(k.keyId), k.pem);
  return keys;
}

async function getVerifierKey(keyId: string): Promise<string | null> {
  const fresh = keyCache && Date.now() - keyCache.fetchedAt < KEY_CACHE_TTL_MS;
  if (!fresh) {
    keyCache = { fetchedAt: Date.now(), keys: await fetchVerifierKeys() };
  }
  // Keys rotate — if the requested key_id is unknown, refetch once.
  if (!keyCache!.keys.has(keyId)) {
    keyCache = { fetchedAt: Date.now(), keys: await fetchVerifierKeys() };
  }
  return keyCache!.keys.get(keyId) ?? null;
}

/**
 * Verify the AdMob signature. `rawQuery` MUST be the exact, un-decoded query
 * string as received (the signature is computed over the bytes before
 * `&signature=`). `signature` is base64url-encoded DER ECDSA.
 */
export async function verifyAdMobSignature(
  rawQuery: string,
  signature: string,
  keyId: string,
): Promise<boolean> {
  const marker = "&signature=";
  const idx = rawQuery.indexOf(marker);
  if (idx === -1) return false;
  const content = rawQuery.substring(0, idx);

  const pem = await getVerifierKey(keyId);
  if (!pem) {
    logger.warn(`AdMob SSV: no verifier key for key_id=${keyId}`);
    return false;
  }

  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(content, "utf8");
    verifier.end();
    return verifier.verify(pem, Buffer.from(signature, "base64url"));
  } catch (err) {
    logger.warn("AdMob SSV: signature verify threw", err);
    return false;
  }
}

export interface SsvParams {
  userId: string; // the app user id we set as SSV userId
  customData: string; // JSON: { caseId, type }
  transactionId: string;
}

/**
 * Grant the reward for a verified callback, deduped by transaction_id. Throwing
 * is avoided for "business" outcomes (already doubled, nothing left) so AdMob
 * doesn't keep retrying — the transaction is considered handled either way.
 */
export async function grantVerifiedReward(params: SsvParams): Promise<void> {
  const { userId, customData, transactionId } = params;

  let parsed: { caseId?: string; type?: string };
  try {
    parsed = JSON.parse(customData);
  } catch {
    logger.warn("AdMob SSV: unparseable custom_data", customData);
    return;
  }
  const { caseId, type } = parsed;
  if (!type) {
    logger.warn("AdMob SSV: missing type in custom_data");
    return;
  }
  // Case-scoped rewards need a caseId; the account-scoped streak save does not.
  if (type !== "streaksave" && !caseId) {
    logger.warn("AdMob SSV: missing caseId in custom_data");
    return;
  }

  // Dedupe first: record the transaction; a duplicate key means we've already
  // granted it (AdMob retry) and we must not grant again.
  try {
    await ProcessedAdReward.create({ transactionId, userId, caseId, type });
  } catch (err: any) {
    if (err?.code === 11000) {
      logger.info(`AdMob SSV: duplicate transaction ${transactionId}, skipping`);
      return;
    }
    throw err;
  }

  try {
    if (type === "eliminate") await adEliminateSuspect(userId, caseId!);
    else if (type === "reveal") await adRevealRedHerring(userId, caseId!);
    else if (type === "double") await claimDoubleReward(userId, caseId!);
    else if (type === "streaksave") await applyStreakSave(userId);
    else logger.warn(`AdMob SSV: unknown reward type "${type}"`);
  } catch (err) {
    // Business errors (e.g. already doubled, no suspects left) are expected and
    // fine to swallow — the ad was watched, the reward just couldn't apply.
    logger.warn(`AdMob SSV: grant for type=${type} did not apply`, err);
  }
}
