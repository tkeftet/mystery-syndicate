import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { track, AnalyticsEvent } from "./analytics";

/**
 * react-native-google-mobile-ads is a native module absent from Expo Go. Under
 * the new architecture, even `require()`-ing it evaluates a TurboModule spec
 * that throws an uncatchable "RNGoogleMobileAdsModule could not be found"
 * invariant. So in Expo Go we skip loading it entirely (ads simply no-op).
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Best-effort placement label parsed from customData ({type:"..."}). */
function adPlacement(customData?: string): string {
  if (!customData) return "unknown";
  try {
    return JSON.parse(customData)?.type ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Rewarded-ad helper (Google AdMob via react-native-google-mobile-ads).
 *
 * Only opt-in rewarded ads are used — no banners/interstitials. Requires a
 * development/production build that includes the native module; in Expo Go or a
 * build made before this package was added, the helpers no-op (resolve false)
 * instead of crashing, thanks to the lazy require below.
 *
 * Uses Google TEST ad units in dev. For production, set the real AdMob rewarded
 * ad unit IDs in REWARDED_AD_UNIT_ID and the app IDs in app.json.
 */

declare const __DEV__: boolean;

function loadAdsModule(): any | null {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}

// Real AdMob rewarded ad unit IDs (used only in production builds; dev always
// uses Google's TestIds below). iOS not set up yet → falls back to a test ad.
const REWARDED_AD_UNIT_ID: string | undefined = Platform.select({
  android: "ca-app-pub-4852018051700634/3163139947",
  ios: undefined,
});

let initialized = false;

/**
 * Google UMP (User Messaging Platform) consent — GDPR/EEA requirement.
 *
 * Requests the latest consent info and shows the consent form only when required
 * (EEA users with a form configured in the AdMob "Privacy & messaging" console).
 * Best-effort: any failure is swallowed so the app never blocks on it. Returns
 * whether ads may be requested (true outside the EEA / after consent).
 */
async function gatherConsent(ads: any): Promise<boolean> {
  try {
    const { AdsConsent } = ads;
    if (!AdsConsent?.requestInfoUpdate) return true;
    await AdsConsent.requestInfoUpdate();
    // Shows the form if required; resolves immediately otherwise.
    await AdsConsent.loadAndShowConsentFormIfRequired?.();
    const info = await AdsConsent.getConsentInfo?.();
    // `canRequestAds` is undefined on older lib versions → default to allowed.
    return info?.canRequestAds ?? true;
  } catch (err) {
    console.warn("UMP consent flow failed:", err);
    return true; // never block ads/app on a consent error
  }
}

export async function initializeAds(): Promise<void> {
  if (initialized) return;
  const ads = loadAdsModule();
  if (!ads) return;
  try {
    // 1) Gather GDPR consent BEFORE initializing the SDK.
    await gatherConsent(ads);
    // 2) Initialize the Mobile Ads SDK (serves personalized or non-personalized
    //    ads per the consent the user gave).
    await ads.default().initialize();
    initialized = true;
  } catch (err) {
    console.warn("Ads init failed:", err);
  }
}

/**
 * Re-open the consent / privacy options form so users can change their choice.
 * Wire this to a "Manage ad privacy" button in Settings — Google requires an
 * always-available way to revisit consent for EEA users.
 */
export async function showAdPrivacyOptions(): Promise<void> {
  const ads = loadAdsModule();
  if (!ads) return;
  try {
    await ads.AdsConsent?.showPrivacyOptionsForm?.();
  } catch (err) {
    console.warn("Privacy options form failed:", err);
  }
}

export interface RewardedAdOptions {
  /** App user id, forwarded to the AdMob SSV callback as `user_id`. */
  userId?: string;
  /** Arbitrary string (we send JSON), forwarded to SSV as `custom_data`. */
  customData?: string;
}

/**
 * Loads and shows a rewarded ad. Resolves `true` only if the user watched it
 * through and earned the reward, `false` otherwise (closed early, error, or no
 * native module).
 *
 * The actual in-game reward is NOT granted here — it is granted server-side when
 * AdMob calls our SSV endpoint (verified). `userId`/`customData` are attached so
 * the backend knows who to reward and for what. The caller should, on `true`,
 * reconcile state from the server (the reward arrives asynchronously).
 */
export function showRewardedAd(
  options: RewardedAdOptions = {},
): Promise<boolean> {
  const ads = loadAdsModule();
  if (!ads) {
    console.warn(
      "Ads unavailable — rebuild the dev client to include the ads module.",
    );
    return Promise.resolve(false);
  }

  const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = ads;
  const unitId = __DEV__
    ? TestIds.REWARDED
    : REWARDED_AD_UNIT_ID ?? TestIds.REWARDED;

  const placement = adPlacement(options.customData);
  track(AnalyticsEvent.AD_REQUESTED, { placement });

  return new Promise((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(unitId, {
      // Personalization is governed by the UMP consent gathered at init — the
      // SDK auto-serves non-personalized ads when the user hasn't consented.
      serverSideVerificationOptions: {
        userId: options.userId,
        customData: options.customData,
      },
    });

    let earned = false;
    const subs: Array<() => void> = [];
    const cleanup = () => subs.forEach((unsub) => unsub());

    subs.push(
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewarded.show().catch(() => {
          cleanup();
          resolve(false);
        });
      }),
    );
    subs.push(
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
    );
    subs.push(
      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        track(
          earned ? AnalyticsEvent.AD_COMPLETED : AnalyticsEvent.AD_FAILED,
          { placement, reason: earned ? undefined : "closed_early" },
        );
        cleanup();
        resolve(earned);
      }),
    );
    subs.push(
      rewarded.addAdEventListener(AdEventType.ERROR, (err: unknown) => {
        console.warn("Rewarded ad error:", err);
        track(AnalyticsEvent.AD_FAILED, { placement, reason: "error" });
        cleanup();
        resolve(false);
      }),
    );

    rewarded.load();
  });
}
