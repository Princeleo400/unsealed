import { z } from 'zod';
import rawLegal from '@/config/legal.json';

/** Publisher details for the legal pages; one file to edit (src/config/legal.json). */
export const LEGAL = z
  .object({
    publisher: z.string().min(1),
    supportEmail: z.string().min(1),
    country: z.string().min(1),
    minimumAge: z.number().int().min(13).max(21),
    lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .parse(rawLegal);

export const isPlaceholder = (value: string) => /^\[.*\]$/.test(value.trim());

/** Fields still holding a [PLACEHOLDER]; must be empty before launch. */
export function legalPlaceholders(): string[] {
  return (['publisher', 'supportEmail'] as const).filter((field) =>
    isPlaceholder(LEGAL[field]),
  );
}

export const lastUpdatedLabel = () =>
  new Date(`${LEGAL.lastUpdated}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
