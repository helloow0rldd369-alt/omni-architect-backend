import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';

admin.initializeApp();
const db = admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || "OMEGA-ROOT-KEY-9912";

export interface DecodedToken {
  uid: string;
  tier: number;
  deviceUuid: string;
}

export async function verifySubscription(licenseKey: string, deviceUuid: string): Promise<string> {
  const licenseRef = db.collection('users/licenses').doc(licenseKey);
  const doc = await licenseRef.get();

  if (!doc.exists) {
    throw new Error("Invalid license structural footprint.");
  }

  const data = doc.data();
  if (!data || data.active !== true) {
    throw new Error("License key has expired or been revoked.");
  }

  // Cross reference active hardware assignment
  if (data.assignedDevice && data.assignedDevice !== deviceUuid) {
    throw new Error("Device binding mismatch.");
  }

  if (!data.assignedDevice) {
    await licenseRef.update({ assignedDevice: deviceUuid });
  }

  // Mint strategic operational credential JWT (valid 30 days)
  return jwt.sign(
    { uid: doc.id, tier: data.tier || 1, deviceUuid },
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
