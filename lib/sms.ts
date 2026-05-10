import "server-only";

/**
 * SMS — Orange Côte d'Ivoire API.
 *
 * Doc: https://developer.orange.com/apis/sms-ci/
 * Auth flow: OAuth2 client_credentials → access_token → POST /smsmessaging
 *
 * Needs these env vars to actually send:
 *   ORANGE_SMS_CLIENT_ID
 *   ORANGE_SMS_CLIENT_SECRET
 *   ORANGE_SMS_SENDER       (your registered sender ID, e.g. "tel:+22507XXXXXXXX")
 *
 * Without those, the function logs the message and returns — useful in dev
 * and when Orange access is still being provisioned.
 */

const CLIENT_ID = process.env.ORANGE_SMS_CLIENT_ID;
const CLIENT_SECRET = process.env.ORANGE_SMS_CLIENT_SECRET;
const SENDER = process.env.ORANGE_SMS_SENDER;
const ENDPOINT = "https://api.orange.com/smsmessaging/v1/outbound";
const TOKEN_ENDPOINT = "https://api.orange.com/oauth/v3/token";

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null;

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[sms] token fetch failed", res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

function normalizePhone(raw: string): string {
  // Ivorian numbers: keep + and digits
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("225")) return "+" + digits;
  if (digits.length === 10) return "+225" + digits;
  return "+" + digits;
}

/** Send a transactional SMS. Returns true on success, false on failure or no-op. */
export async function sendSms(toRaw: string, text: string): Promise<boolean> {
  const to = normalizePhone(toRaw);

  if (!CLIENT_ID || !CLIENT_SECRET || !SENDER) {
    // eslint-disable-next-line no-console
    console.log(`[sms/dev] would send to ${to}: "${text}"`);
    return false;
  }

  const token = await getAccessToken();
  if (!token) return false;

  const path = `${ENDPOINT}/${encodeURIComponent(SENDER)}/requests`;
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: `tel:${to}`,
          senderAddress: SENDER,
          outboundSMSTextMessage: { message: text.slice(0, 459) },
        },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[sms] send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sms] send error", e);
    return false;
  }
}

export function bookingConfirmedSms(opts: {
  fullName: string;
  reference: string;
  checkInLabel: string;
}) {
  const firstName = opts.fullName.split(" ")[0] || "";
  return `Bahia: ${firstName}, votre sejour ${opts.reference} est confirme. Arrivee ${opts.checkInLabel}. A bientot a Assinie !`;
}
