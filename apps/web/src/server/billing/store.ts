import 'server-only';
import type { ProductId } from '@/lib/pricing';
import { adminSupabase } from '../supabase';

export type Source = 'stripe' | 'paystack' | 'promo' | 'admin';

export type Grant = {
  userId: string;
  kind: 'pass' | 'case';
  caseId?: string | null;
  source: Source;
  ref: string;
  productId: ProductId;
  /** null = never expires */
  expiresAt: Date | null;
  mode: 'extend' | 'set';
};

export type PaymentRecord = {
  userId: string;
  provider: 'stripe' | 'paystack';
  ref: string;
  productId: ProductId;
  amountMinor: number;
  currency: string;
};

export type EntitlementRow = {
  kind: 'pass' | 'case';
  caseId: string | null;
  productId: string;
  source: Source;
  expiresAt: Date | null;
};

/** Everything billing writes or reads. Swappable so fulfilment rules can be unit-tested without a database. */
export interface BillingStore {
  grant(entitlementGrant: Grant): Promise<void>;
  recordPayment(paymentRecord: PaymentRecord): Promise<void>;
  /** A refund: the entitlement bought with this payment stops working. */
  revoke(source: Source, ref: string): Promise<void>;
  /** Active (unexpired, unrevoked) entitlements. */
  active(userId: string, now?: Date): Promise<EntitlementRow[]>;
  /** True if the player has ever had a Case Pass (used to offer the free trial only once). */
  everHadPass(userId: string): Promise<boolean>;
  getCustomer(
    userId: string,
  ): Promise<{ stripe: string | null; paystack: string | null }>;
  setCustomer(
    userId: string,
    ids: { stripe?: string; paystack?: string },
  ): Promise<void>;
  userForCustomer(
    provider: 'stripe' | 'paystack',
    customerId: string,
  ): Promise<string | null>;
}

/** Supabase store using the service role (server only). Null when the service role key isn't set. */
export function supabaseBillingStore(): BillingStore | null {
  const db = adminSupabase();
  if (!db) return null;
  const fail = (what: string, error: unknown) => {
    throw new Error(
      `billing store: ${what} failed: ${(error as { message?: string })?.message ?? String(error)}`,
    );
  };
  return {
    async grant(entitlementGrant) {
      const { error } = await db.rpc('grant_entitlement', {
        p_user: entitlementGrant.userId,
        p_kind: entitlementGrant.kind,
        p_case: entitlementGrant.caseId ?? null,
        p_source: entitlementGrant.source,
        p_ref: entitlementGrant.ref,
        p_product: entitlementGrant.productId,
        p_expires: entitlementGrant.expiresAt
          ? entitlementGrant.expiresAt.toISOString()
          : null,
        p_mode: entitlementGrant.mode,
      });
      if (error) fail('grant', error);
    },
    async recordPayment(paymentRecord) {
      const { error } = await db.from('payments').upsert(
        {
          user_id: paymentRecord.userId,
          provider: paymentRecord.provider,
          provider_ref: paymentRecord.ref,
          product_id: paymentRecord.productId,
          amount_minor: paymentRecord.amountMinor,
          currency: paymentRecord.currency.toUpperCase(),
        },
        { onConflict: 'provider,provider_ref', ignoreDuplicates: true },
      );
      if (error) fail('recordPayment', error);
    },
    async revoke(source, ref) {
      const now = new Date().toISOString();
      const entitlementUpdate = await db
        .from('entitlements')
        .update({ revoked_at: now, updated_at: now })
        .eq('source', source)
        .eq('source_ref', ref)
        .is('revoked_at', null);
      if (entitlementUpdate.error) fail('revoke', entitlementUpdate.error);
      if (source === 'stripe' || source === 'paystack') {
        const paymentUpdate = await db
          .from('payments')
          .update({ status: 'refunded' })
          .eq('provider', source)
          .eq('provider_ref', ref);
        if (paymentUpdate.error) fail('revoke payment', paymentUpdate.error);
      }
    },
    async active(userId, now = new Date()) {
      const { data, error } = await db
        .from('entitlements')
        .select('kind, case_id, product_id, source, expires_at')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`);
      if (error) fail('active', error);
      return (data ?? []).map((row) => ({
        kind: row.kind as 'pass' | 'case',
        caseId: (row.case_id as string | null) ?? null,
        productId: row.product_id as string,
        source: row.source as Source,
        expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      }));
    },
    async everHadPass(userId) {
      const { count, error } = await db
        .from('entitlements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('kind', 'pass');
      if (error) fail('everHadPass', error);
      return (count ?? 0) > 0;
    },
    async getCustomer(userId) {
      const { data, error } = await db
        .from('billing_customers')
        .select('stripe_customer_id, paystack_customer_code')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) fail('getCustomer', error);
      return {
        stripe: (data?.stripe_customer_id as string | null) ?? null,
        paystack: (data?.paystack_customer_code as string | null) ?? null,
      };
    },
    async setCustomer(userId, ids) {
      const row: Record<string, string> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      if (ids.stripe) row.stripe_customer_id = ids.stripe;
      if (ids.paystack) row.paystack_customer_code = ids.paystack;
      const { error } = await db
        .from('billing_customers')
        .upsert(row, { onConflict: 'user_id' });
      if (error) fail('setCustomer', error);
    },
    async userForCustomer(provider, customerId) {
      const col =
        provider === 'stripe' ? 'stripe_customer_id' : 'paystack_customer_code';
      const { data, error } = await db
        .from('billing_customers')
        .select('user_id')
        .eq(col, customerId)
        .maybeSingle();
      if (error) fail('userForCustomer', error);
      return (data?.user_id as string | undefined) ?? null;
    },
  };
}

/** In-memory store for tests; mirrors the SQL rules in grant_entitlement. */
export class MemoryBillingStore implements BillingStore {
  ents = new Map<string, Grant & { revoked: boolean }>();
  payments = new Map<string, PaymentRecord & { status: 'paid' | 'refunded' }>();
  customers = new Map<
    string,
    { stripe: string | null; paystack: string | null }
  >();
  failing = false;
  private check() {
    if (this.failing) throw new Error('db down');
  }
  async grant(entitlementGrant: Grant) {
    this.check();
    const key = `${entitlementGrant.source}|${entitlementGrant.ref}`;
    const prev = this.ents.get(key);
    if (!prev)
      return void this.ents.set(key, { ...entitlementGrant, revoked: false });
    if (prev.userId !== entitlementGrant.userId) return; // never move an entitlement to someone else
    let expiresAt: Date | null;
    if (entitlementGrant.mode === 'set') expiresAt = entitlementGrant.expiresAt;
    else if (!prev.expiresAt || !entitlementGrant.expiresAt) expiresAt = null;
    else
      expiresAt =
        prev.expiresAt > entitlementGrant.expiresAt
          ? prev.expiresAt
          : entitlementGrant.expiresAt;
    this.ents.set(key, { ...prev, expiresAt });
  }
  async recordPayment(paymentRecord: PaymentRecord) {
    this.check();
    const key = `${paymentRecord.provider}|${paymentRecord.ref}`;
    if (!this.payments.has(key))
      this.payments.set(key, { ...paymentRecord, status: 'paid' });
  }
  async revoke(source: Source, ref: string) {
    this.check();
    const entitlement = this.ents.get(`${source}|${ref}`);
    if (entitlement) entitlement.revoked = true;
    const payment = this.payments.get(`${source}|${ref}`);
    if (payment) payment.status = 'refunded';
  }
  async active(userId: string, now = new Date()) {
    this.check();
    return [...this.ents.values()]
      .filter(
        (entitlement) =>
          entitlement.userId === userId &&
          !entitlement.revoked &&
          (!entitlement.expiresAt || entitlement.expiresAt > now),
      )
      .map((entitlement) => ({
        kind: entitlement.kind,
        caseId: entitlement.caseId ?? null,
        productId: entitlement.productId,
        source: entitlement.source,
        expiresAt: entitlement.expiresAt,
      }));
  }
  async everHadPass(userId: string) {
    return [...this.ents.values()].some(
      (entitlement) =>
        entitlement.userId === userId && entitlement.kind === 'pass',
    );
  }
  async getCustomer(userId: string) {
    return this.customers.get(userId) ?? { stripe: null, paystack: null };
  }
  async setCustomer(
    userId: string,
    ids: { stripe?: string; paystack?: string },
  ) {
    const prev = await this.getCustomer(userId);
    this.customers.set(userId, {
      stripe: ids.stripe ?? prev.stripe,
      paystack: ids.paystack ?? prev.paystack,
    });
  }
  async userForCustomer(provider: 'stripe' | 'paystack', id: string) {
    for (const [userId, customerIds] of this.customers)
      if (customerIds[provider] === id) return userId;
    return null;
  }
}
