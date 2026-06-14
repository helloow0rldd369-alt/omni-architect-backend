import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "OMEGA-ROOT-KEY-9912";

export interface DecodedToken {
  uid: string;
  tier: number;
  deviceUuid: string;
}

export async function verifySubscription(licenseKey: string, deviceUuid: string): Promise<string> {
  let tier = 1;

  if (licenseKey === "LICENSE_KEY_HEX_AAA_888" || licenseKey === "VIP_HIVE_1497") {
    tier = 3;
  } else if (licenseKey === "CALIBRATION_497") {
    tier = 2;
  } else if (licenseKey === "GATEWAY_97") {
    tier = 1;
  } else {
    throw new Error("Invalid license structural footprint.");
  }

  // Mint strategic operational credential JWT (valid 30 days)
  return jwt.sign(
    { uid: licenseKey, tier, deviceUuid },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function validateSystemJwt(token: string): DecodedToken {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (err) {
    throw new Error("JWT integrity compromise detected.");
  }
}
