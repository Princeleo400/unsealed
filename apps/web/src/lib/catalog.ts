import type { CaseProductId } from './pricing';

/** Public, spoiler-free catalogue of cases for the library and landing page. */
export type CatalogEntry = {
  slug: string;
  number: string;
  title: string;
  city: string;
  hook: string;
  minutes: string;
  difficulty: number;
  /** null = free for everyone; otherwise the product that unlocks it (also included in Case Pass). */
  productId: CaseProductId | null;
  status: 'playable' | 'coming-soon';
};

export const CATALOG: CatalogEntry[] = [
  {
    slug: '001-dead-air',
    number: '#001',
    title: 'Dead Air',
    city: 'Cape Town',
    hook: 'She was dead by 00:40. So who was talking on air at 01:10?',
    minutes: '45–75 min',
    difficulty: 3,
    productId: null,
    status: 'playable',
  },
  {
    slug: '002-the-last-toast',
    number: '#002',
    title: 'The Last Toast',
    city: 'Lagos',
    hook: 'A wedding reception. Four hundred guests. One glass that should never have been poured.',
    minutes: '60–90 min',
    difficulty: 4,
    productId: 'case-standard',
    status: 'coming-soon',
  },
  {
    slug: '003-checkout-at-room-9',
    number: '#003',
    title: 'Checkout at Room 9',
    city: 'Lisbon',
    hook: 'A boutique hotel during a tech conference. The key card says nobody went in.',
    minutes: '45–75 min',
    difficulty: 3,
    productId: 'case-standard',
    status: 'coming-soon',
  },
];

export const catalogEntry = (slug: string) => CATALOG.find((c) => c.slug === slug);
