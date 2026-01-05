import Stripe from 'stripe';

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Platform commission rate (20%)
export const PLATFORM_COMMISSION_RATE = parseFloat(
  process.env.PLATFORM_COMMISSION_RATE || '0.20'
);

// Calculate platform fees
export function calculateFees(grossAmountInCents: number) {
  const platformFee = Math.round(grossAmountInCents * PLATFORM_COMMISSION_RATE);
  const netAmount = grossAmountInCents - platformFee;
  return {
    grossAmount: grossAmountInCents,
    platformFee,
    netAmount
  };
}

// Convert decimal price to cents/pence
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// Convert cents/pence to decimal
export function fromCents(amountInCents: number): number {
  return amountInCents / 100;
}
