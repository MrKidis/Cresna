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

### Unified GitHub-to-Vercel deployment

Use **GitHub as Cresna’s source control** and **Vercel as the live application host**. GitHub Pages is appropriate only for a static export because it cannot run Cresna’s secure API, webhook, OAuth, database, or server-side AI work. Vercel can deploy an Express application from the connected GitHub repository and run it as a Vercel Function; the Vite client and the API should use the same Vercel hostname. This keeps `https://YOUR_VERCEL_DOMAIN/api/trpc`, `https://YOUR_VERCEL_DOMAIN/api/oauth/callback`, `https://YOUR_VERCEL_DOMAIN/api/stripe/webhook`, and `https://YOUR_VERCEL_DOMAIN/api/revenuecat/webhook` on one origin.

> Configure secrets in Vercel Project Settings, never in GitHub or `vercel.json`. Vercel Functions scale with demand, so durable user state, entitlement state, memory summaries, and outcome history must be stored in the database rather than process memory.

### Vercel runtime constraints to keep in the source

Vercel can serve the unified Cresna application when its Express app is exposed as a default export. The deployed function must retain the existing API routes before the SPA fallback so webhook and tRPC paths are never served the client HTML. Vercel does not use `express.static()` for public assets, so the production configuration must publish the Vite output as Vercel-served static files and leave Express responsible for API handling and the final application fallback. Long AI work must remain request-bounded and persist its outcomes; a function’s process memory cannot be used as durable customer memory or a permanent background agent.

### Host Cresna on Vercel

1. Create a **private** GitHub repository, then add the contents of the sanitized Cresna source package. Do not add `.env` files or the excluded `.project-config.json` file.
2. In Vercel, choose **Add New → Project**, select the Cresna repository, and select its production branch. Keep the repository connected so each production-branch push deploys the same application and each pull request receives a preview deployment.
3. Vercel reads `vercel.json`. It installs with `pnpm install --frozen-lockfile`, runs `pnpm build`, serves the Vite output from `dist/public`, and sends every `/api/*` request to `api/[...path].ts`, which imports the same Express routes used locally.
4. In **Project Settings → Environment Variables**, add the variable names from the table above for **Production** and, where safe, **Preview**. Generate a new `JWT_SECRET`; do not reuse or expose values from the prior environment. Point `DATABASE_URL` to a managed MySQL/TiDB-compatible production database and run migrations against that database before allowing user sign-in.
5. Deploy once, copy the resulting Vercel domain, then set the external callback and webhook settings to that exact HTTPS host: Shopify OAuth redirect, the future Google/Microsoft OAuth redirect, Stripe `https://YOUR_VERCEL_DOMAIN/api/stripe/webhook`, and RevenueCat `https://YOUR_VERCEL_DOMAIN/api/revenuecat/webhook`.
6. Test one sign-in, one Shopify read-only connection, one Pro test purchase, one Growth test purchase, a cancellation/expiration event, and a rejected webhook authorization before enabling live products or publishing the RevenueCat paywall.

> **Authentication migration required:** the current source uses the existing Manus OAuth environment. For a non-Manus Vercel deployment, first create real Google and Microsoft OAuth applications, add their client IDs/secrets only in Vercel environment settings, and replace the current OAuth adapter. Cresna should not display non-working provider buttons. Email/password authentication remains intentionally out of scope for this migration.

### Durable AI boundary

Cresna’s production AI should run from server-side API routes with provider credentials stored in Vercel environment variables. It should read only merchant-authorized data, cite the fields used, save approved drafts and outcome summaries to the database, and apply retention/deletion controls. Do not train a shared model on private merchant records or store user conversations in function memory. Vercel can execute bounded AI requests, but a persistent background worker or long-running agent requires a separate queue/worker design; GitHub and Vercel source control do not make an AI “run forever” by themselves.

## GitHub handoff

Import the sanitized ZIP into a private GitHub repository or use the project’s GitHub export control. Keep `.env`, `node_modules`, `dist`, local logs, and generated archives untracked. Before granting collaborators access, rotate any secret that may have been copied outside the deployment platform.

## Archive audit

The final handoff archive excludes `.env` files, `node_modules`, `dist`, `.git`, local logs, generated archives, and `.project-config.json`. The platform configuration file is deliberately excluded because it can contain deployment credentials. The archive manifest and contents were scanned for common Stripe secret, Stripe webhook, RevenueCat billing, Google API key, and bearer-token patterns before delivery. These checks reduce accidental disclosure risk but do not replace rotating credentials before moving a project between deployment environments.
