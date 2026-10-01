# Stripe subscriptions setup

TEI uses **Stripe-hosted Checkout inside the native app WebView**. The app
never receives card details or the Stripe secret key. Checkout and the Billing
Portal run in the browser surface; Supabase Edge Functions create their
short-lived URLs and a verified Stripe webhook is the only path that grants or
revokes TEI Basic/Premium access.

## Included implementation

- `app/subscribe.tsx` starts secure Checkout for Basic ($5/month) or Premium
  ($11/month), then opens Stripe's hosted page in a native WebView.
- `create-checkout-session` authenticates the TEI user, chooses the price on
  the server, and attaches the user ID/tier to Stripe subscription metadata.
- `stripe-webhook` validates the unmodified request body against the
  `Stripe-Signature` header, deduplicates events, updates `subscriptions`, and
  updates `profiles.tier` only for `active` or `trialing` subscriptions.
- `create-billing-portal` gives an existing customer a short-lived Stripe
  Billing Portal URL to manage their card, invoices, or cancellation.
- `0009_stripe_subscriptions.sql` removes the prototype self-upgrade RPC and
  adds the server-owned subscription projection and webhook event ledger.

Stripe requires signature verification with the exact raw request body and
webhook endpoint secret; do not parse JSON before verifying.
[Stripe webhook guidance](https://docs.stripe.com/webhooks/signature)

## Local secrets (already created, ignored by Git)

The supplied test publishable key is in the ignored root `.env` as
`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`. It is safe for a client bundle, although
this hosted-Checkout implementation does not need it directly.

The supplied Stripe **secret** key is in the ignored
`supabase/functions/.env`, not the root mobile configuration. That file also
contains the generated test prices and restricts browser return URLs to the
production TEI website:

| Plan | Amount | Test Stripe Price ID |
| --- | ---: | --- |
| TEI Basic | $5/month | `price_1ULsCMKPDVwAYfFdIKsh98Pu` |
| TEI Premium | $11/month | `price_1ULsCNKPDVwAYfFdALN0BXve` |

Never add `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to an
`EXPO_PUBLIC_*` variable, committed file, EAS client environment, or app
binary. Supabase Edge Functions are server code, and its secret store is the
appropriate production location. [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)

## Required one-time owner deployment

The current CLI identity cannot access the TEI Supabase project, so these
commands must be run by a TEI project Owner/Administrator after checking out
this commit. Replace the values only in the ignored function env file.

```bash
cd tei-app
supabase link --project-ref YOUR_TEI_PROJECT_REF
supabase db push

# Push the local function secrets to the Supabase project secret store.
supabase secrets set --env-file supabase/functions/.env

supabase functions deploy create-checkout-session --use-api
supabase functions deploy create-billing-portal --use-api
supabase functions deploy get-subscription --use-api
supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

Then, in Stripe **test mode**:

1. Create a webhook endpoint pointing to
   `https://YOUR_TEI_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`.
2. Select these events: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`.
3. Copy the endpoint's `whsec_...` signing secret into
   `STRIPE_WEBHOOK_SECRET` and run `supabase secrets set --env-file
   supabase/functions/.env` again. Stripe and the CLI use different webhook
   secrets; use the Dashboard endpoint's secret for the deployed endpoint.
4. Enable the Customer Portal in Stripe Dashboard → Settings → Billing →
   Customer portal. Enable cancellation and payment-method updates. Configure
   a product catalog before allowing in-portal plan switches.

The Stripe portal must be configured in both test and live modes independently.
It creates a short-lived URL and expects subscription changes to be handled via
webhooks. [Stripe Customer Portal setup](https://docs.stripe.com/customer-management/integrate-customer-portal)

## Test the complete payment lifecycle

1. Sign in to a fresh Elemental account and select Basic or Premium.
2. Enter Stripe test card `4242 4242 4242 4242`, any future expiry/CVC/postal
   code, then complete Checkout.
3. In Stripe Dashboard, confirm the Checkout Session and subscription are
   created. In Supabase, confirm one `subscriptions` row and that
   `profiles.tier` matches the paid plan.
4. Reopen the app or tap back to Account Type; Basic/Premium features should
   now be available only after the verified webhook has updated the profile.
5. Open **Manage billing**, cancel at period end, and confirm access remains
   until expiry; simulate/deal with a failed renewal and confirm the webhook
   revokes access once status is no longer active/trialing.

For production, create live prices, replace the two test Price IDs in the
Supabase function secret store, create the live webhook endpoint, complete
Stripe business/branding/tax configuration, and test with a live payment.
