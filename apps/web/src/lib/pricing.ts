/**
 * Prices and products (FR-PAY-01). Loaded from src/config/pricing.json and validated, so a typo in
 * the config fails the build instead of charging the wrong amount. Safe to use on client and server.
 */
import { z } from 'zod';
import raw from '@/config/pricing.json';

export const CURRENCIES = ['USD', 'NGN'] as const;
export type Currency = (typeof CURRENCIES)[number];
export type Provider = 'stripe' | 'paystack';

const Prices = z.object({
  USD: z.number().int().positive(),
  NGN: z.number().int().positive(),
});
const Product = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('pass'),
    name: z.string(),
    interval: z.enum(['month', 'year']),
    trialDays: z
      .object({
        USD: z.number().int().min(1).max(30).optional(),
        NGN: z.number().int().min(1).max(30).optional(),
      })
      .optional(),
    prices: Prices,
  }),
  z.object({ kind: z.literal('case'), name: z.string(), prices: Prices }),
]);
const Pricing = z.object({
  graceDays: z.number().int().min(0).max(7),
  currencies: z.object({
    USD: z.object({
      provider: z.enum(['stripe', 'paystack']),
      label: z.string(),
    }),
    NGN: z.object({
      provider: z.enum(['stripe', 'paystack']),
      label: z.string(),
    }),
  }),
  products: z.object({
    'pass-monthly': Product,
    'pass-annual': Product,
    'case-standard': Product,
    'case-premium': Product,
  }),
});

export const PRICING = Pricing.parse(raw);
export type ProductId = keyof typeof PRICING.products;
export const PRODUCT_IDS = Object.keys(PRICING.products) as ProductId[];
export const PASS_PRODUCTS = [
  'pass-monthly',
  'pass-annual',
] as const satisfies readonly ProductId[];
export type CaseProductId = 'case-standard' | 'case-premium';

export const product = (id: ProductId) => PRICING.products[id];
export const priceOf = (id: ProductId, currency: Currency) =>
  PRICING.products[id].prices[currency];
export const providerFor = (currency: Currency): Provider =>
  PRICING.currencies[currency].provider;
export const isProductId = (value: unknown): value is ProductId =>
  typeof value === 'string' && Object.hasOwn(PRICING.products, value);
export const isCurrency = (value: unknown): value is Currency =>
  typeof value === 'string' &&
  (CURRENCIES as readonly string[]).includes(value);

/** Free-trial days. Only Stripe checkouts support trials here; Paystack charges on day one. */
export function trialDays(id: ProductId, currency: Currency): number {
  const productConfig = PRICING.products[id];
  if (productConfig.kind !== 'pass' || providerFor(currency) !== 'stripe')
    return 0;
  return productConfig.trialDays?.[currency] ?? 0;
}

/** "$4.99", "₦2,000". Whole Naira amounts drop the kobo. */
export function formatPrice(minor: number, currency: Currency): string {
  const major = minor / 100;
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits:
      Number.isInteger(major) && currency === 'NGN' ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

/** Default currency from the visitor's country (FR-PAY-02); the player can switch. */
export const currencyForCountry = (
  country: string | null | undefined,
): Currency => (country?.toUpperCase() === 'NG' ? 'NGN' : 'USD');
