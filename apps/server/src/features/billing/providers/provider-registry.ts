import { env } from '../../../config/env.js';
import type { BillingProvider } from './billing-provider.js';
import { LocalBillingProvider } from './local-billing.provider.js';
import { StripeBillingProvider } from './stripe-billing.provider.js';

export class BillingProviderRegistry {
  public getProvider(providerId = env.BILLING_PROVIDER): BillingProvider {
    if (providerId === 'stripe') return new StripeBillingProvider();
    return new LocalBillingProvider();
  }
}
