"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySubscription = verifySubscription;
exports.validateSystemJwt = validateSystemJwt;
const admin = __importStar(require("firebase-admin"));
const jwt = __importStar(require("jsonwebtoken"));
admin.initializeApp();
const db = admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || "OMEGA-ROOT-KEY-9912";
async function verifySubscription(licenseKey, deviceUuid) {
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
    return jwt.sign({ uid: doc.id, tier: data.tier || 1, deviceUuid }, JWT_SECRET, { expiresIn: '30d' });
}
function validateSystemJwt(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (err) {
        throw new Error("JWT integrity compromise detected.");
    }
}
