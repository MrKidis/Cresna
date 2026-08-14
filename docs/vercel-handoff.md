# Cresna deployment handoff

Cresna is a React, Express, tRPC, and Drizzle application. The source ZIP intentionally excludes local dependencies, build artifacts, environment files, and platform logs. Install dependencies with `pnpm install`, verify with `pnpm test && pnpm build`, and deploy the generated Node server together with the Vite client build. Do not commit or paste any secret value into the repository.

## Required environment variables

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB application database | Required for persisted users, store data, billing state, beta records, and drafts. |
| `JWT_SECRET` | Session signing | Generate a long random value for every production environment. |
| `OAUTH_SERVER_URL` and `VITE_OAUTH_PORTAL_URL` | Current OAuth implementation | Replace only if the authentication layer is intentionally migrated. |
| `VITE_APP_ID` | Current OAuth client identifier | Preserve with the existing auth setup. |
| `OWNER_OPEN_ID` | Permanent Cresna owner identity | This server value—not a mutable UI role—controls owner access. |
| `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` | Shopify read-only OAuth connection | Keep scopes limited to the read access Cresna actually implements. |
| `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` | Existing Stripe Checkout path | Use test credentials until the live purchase flow is verified. |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | RevenueCat webhook authorization | Must match the authorization configured in RevenueCat. |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Current Cresna server-side AI provider | Replace the AI provider implementation before deploying outside this environment if these are not available. |
| `GMAIL_SMTP_USER` and `GMAIL_SMTP_APP_PASSWORD` | Beta invitation email sender | Optional; only required for the current Gmail invitation flow. |

## Billing and webhook sequence

The Cresna RevenueCat contract is already present in source: offering identifier `cresna_default`; entitlement identifiers `cresna_pro` and `cresna_growth`; and prepared monthly/annual package identifiers in `server/revenueCatContract.ts`. The RevenueCat paywall design exists as an **unpublished** draft. Do not publish or turn on RevenueCat checkout until the following sequence is complete.

1. Create or connect a Stripe account and configure real Stripe Web Billing products for Pro and Growth.
2. Attach the resulting products to the matching RevenueCat packages and entitlements.
3. Configure a RevenueCat webhook for `https://YOUR_DOMAIN/api/revenuecat/webhook` and set the same secret in `REVENUECAT_WEBHOOK_AUTHORIZATION`.
4. Test a Pro purchase, a Growth purchase, expiration/cancellation behavior, and unknown-product rejection in test mode.
5. Only after those tests pass, attach the final package-bearing offering to the RevenueCat paywall draft and publish it.

> The webhook should stay in the source. Removing it would discard verified entitlement updates and makes the RevenueCat handoff less reliable. Its authorization gate is designed to reject unauthenticated events.

## Vercel notes

Vercel can host a Node-compatible web application, but the current Cresna project depends on its existing OAuth and built-in AI environment variables. Before migration, validate a preview deployment with a real database connection and use the same callback domain in the authentication and Shopify configuration. The deployed hostname must be registered with Shopify for its OAuth redirect URL. Confirm server routing keeps `/api/trpc`, `/api/oauth/callback`, and `/api/revenuecat/webhook` available on the same HTTPS hostname.

## GitHub handoff

Import the sanitized ZIP into a private GitHub repository or use the project’s GitHub export control. Keep `.env`, `node_modules`, `dist`, local logs, and generated archives untracked. Before granting collaborators access, rotate any secret that may have been copied outside the deployment platform.

## Archive audit

The final handoff archive excludes `.env` files, `node_modules`, `dist`, `.git`, local logs, generated archives, and `.project-config.json`. The platform configuration file is deliberately excluded because it can contain deployment credentials. The archive manifest and contents were scanned for common Stripe secret, Stripe webhook, RevenueCat billing, Google API key, and bearer-token patterns before delivery. These checks reduce accidental disclosure risk but do not replace rotating credentials before moving a project between deployment environments.
