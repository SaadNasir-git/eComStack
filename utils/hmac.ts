import { eComConfig } from "@/ecom.config";
import { createHmac, timingSafeEqual } from "crypto";

export const hmac = (code: string) =>
    createHmac('sha256', eComConfig.env.SECRET_KEY).update(code).digest('hex');

export const verifyHmac = (plainText: string, hashedText: string): boolean => {
    const newHash = hmac(plainText);

    const bufferA = Buffer.from(newHash, 'hex');
    const bufferB = Buffer.from(hashedText, 'hex');

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return timingSafeEqual(bufferA, bufferB);
};