import { eComConfig } from '@/ecom.config';
import { Resend } from 'resend';

if (!eComConfig.env.RESEND_API_KEY) {
    throw new Error("Resend plugin requires an API key. Set RESEND_API_KEY env.")
}

export const resend = new Resend(eComConfig.env.RESEND_API_KEY);