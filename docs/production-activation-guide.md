# Cresna production activation guide

This guide turns the GitHub-connected Vercel project into a real production application. The GitHub repository contains source code; **Vercel hosts the frontend and API together**. Do not put passwords, API keys, webhook signing secrets, database URLs, or OAuth client secrets in GitHub issues, commits, screenshots, or chat.

## What you need to create

| Service | What it provides | Why Cresna needs it | Account-owned step |
|---|---|---|---|
| Firebase Authentication | Google and Microsoft provider configuration plus Firebase Web/Admin settings | Browser sign-in and server-verifiable Firebase ID tokens | Enable Google and Microsoft providers in Firebase Authentication and configure the authorized Vercel domain. |
| Managed MySQL/TiDB database | `DATABASE_URL` | Persists Cresna users, workspaces, store data, drafts, access states, and outcomes | Keep the current Drizzle-compatible database until a separately tested Firestore migration is approved. |
| Stripe | Stripe secret key, publishable key, and webhook signing secret | Creates and manages Cresna Pro/Growth subscriptions | Create the Stripe account and products, initially in Test mode. |
| RevenueCat | Web Billing offering, packages, entitlements, and webhook authorization | Maps verified purchases to Cresna Pro/Growth access | Link Stripe Billing products, then attach packages to the offering/paywall. |
| AI provider | Server-only AI key | Runs Cresna’s owner and merchant intelligence from API routes | Create a provider account and project/API key with spending limits. |

## Step 1 — use a database that matches the current Cresna code

The current source uses Drizzle with the `mysql2` driver. The lowest-risk first production database is therefore a **managed MySQL or TiDB-compatible database**, not a Postgres product. Create an empty production database with encrypted/TLS connections, a separate least-privilege application user, and regular backups. Store its complete connection string as `DATABASE_URL` in Vercel.

> Do not choose a database because it is advertised inside a hosting dashboard if it requires a PostgreSQL migration. Vercel’s current database integration path is Neon/Postgres; that is viable only after Cresna’s Drizzle schema, driver, and migration workflow are deliberately converted from MySQL/TiDB. [1]

After adding the database URL to Vercel, apply Cresna’s database migrations against **that production database**. Never point production to the current development database.

## Step 2 — configure Firebase Authentication

In Firebase Console, enable **Google** and **Microsoft** under Authentication → Sign-in method. Add `cresna.vercel.app` and the final production domain to Authentication → Settings → Authorized domains. The deployed Cresna auth page uses Firebase popup providers and sends the resulting ID token to Vercel in the `Authorization: Bearer …` header; there are no Cresna password forms or provider callback routes to register.

Set the Firebase Web configuration variables in Vercel: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`. Keep Firebase Admin credentials server-only: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY`.

## Step 3 — verify the Firebase/Vercel responsibility split

Firebase authenticates the browser identity. Vercel verifies the Firebase ID token, upserts the minimal identity record, enforces owner/admin boundaries, runs Stripe/RevenueCat/Shopify operations, and keeps AI provider secrets server-side. The current Cresna business data layer remains Drizzle over MySQL/TiDB; it is not accurate to claim that Firestore is already the source of truth. A Firestore migration must be designed, migrated, and tested separately before changing this statement.

The configured owner is recognized server-side by `OWNER_OPEN_ID` or the case-insensitive `OWNER_EMAIL`; a client-provided role never grants owner access. Normal users receive the ordinary free/paid access rules.

## Step 5 — activate Stripe, then RevenueCat

Create a Stripe account and start in **Test mode**. Create recurring monthly products for Cresna Pro ($19) and Cresna Growth ($49). In Vercel, set `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` for the matching mode. Then register this endpoint in Stripe and copy the endpoint-specific signing secret into `STRIPE_WEBHOOK_SECRET`:

```text
https://YOUR_VERCEL_DOMAIN/api/stripe/webhook
```

Stripe gives each webhook endpoint its own signing secret; test and live endpoints use different secrets. [4]

Next, connect Stripe Billing in RevenueCat, attach the real Pro/Growth products to the matching packages in `cresna_default`, attach that offering to the unpublished Cresna paywall, and only then publish the paywall. RevenueCat Web’s Stripe integration is designed to sell Stripe subscriptions through RevenueCat’s web purchase flow. [5]

Finally, set the same random value in RevenueCat’s webhook configuration and Vercel’s `REVENUECAT_WEBHOOK_AUTHORIZATION` variable, using:

```text
https://YOUR_VERCEL_DOMAIN/api/revenuecat/webhook
```

Test Pro, Growth, expiration, cancellation, duplicate delivery, and unknown-product rejection before using live-mode products.

## Step 6 — use a server-side AI provider responsibly

Use the validated OpenRouter project for Cresna, set an appropriate spending limit, and store its server-only key in Vercel as `AI_PROVIDER_API_KEY`. The deployed app calls OpenRouter from the backend only; never embed the key in the Vite client bundle. The optional Ollama adapter is documented separately and is disabled unless a private persistent endpoint is explicitly configured.

Cresna’s AI may use merchant-authorized store data to answer an individual request, cite the fields used, create a reviewable draft, and record an approved outcome. It must not send private merchant data into a shared training set, claim hidden tool actions, or retain user conversations in function memory. Durable user preferences, consent, draft history, and summarized outcomes belong in the database.

## Vercel environment checklist

Add these under **Vercel Project → Settings → Environment Variables**. Select Production, and select Preview only for values safe to use in preview environments. Vercel environment variables are configured outside the repository. [6]

| Variable | Add now? | Source |
|---|---:|---|
| `DATABASE_URL` | Yes | Managed MySQL/TiDB provider |
| `JWT_SECRET` | Yes | Generate a long random secret; never reuse development values |
| `OWNER_OPEN_ID` | Yes | Existing owner identity, retained for compatibility |
| `OWNER_EMAIL` | Yes | Exact owner email used for Firebase identity mapping |
| Firebase Web variables | Yes | Firebase project settings |
| Firebase Admin variables | Yes | Firebase service-account credentials, server-only |
| `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | After Stripe setup | Stripe Dashboard |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | After RevenueCat webhook setup | New random value stored in both places |
| AI provider key | After provider selection | Provider project dashboard |
| Shopify credentials | When Shopify OAuth is ready for production | Shopify Partners / app configuration |

## Safe order of operations

1. Confirm the Vercel deployment and final authorized Firebase domain.
2. Add a production MySQL/TiDB database, `DATABASE_URL`, and a new `JWT_SECRET`.
3. Enable Google and Microsoft in Firebase, add the Firebase Web/Admin variables, and verify token-authenticated API calls.
4. Confirm `OWNER_EMAIL` and `OWNER_OPEN_ID` are correct before inviting any staff account.
5. Create Stripe Test-mode products and verify Stripe webhooks.
6. Attach real Stripe products to RevenueCat packages, offering, and paywall; verify RevenueCat webhooks.
7. Add the server-only OpenRouter key as `AI_PROVIDER_API_KEY`, apply privacy/retention controls, and test evidence-backed responses. Leave `AI_PROVIDER` unset or set to `openrouter` for the default Vercel path.
8. RevenueCat will show “Select an offering” until real Stripe Web Billing products are attached to Cresna Pro/Growth packages and a default offering. This is an expected unpublished draft state, not a runtime failure. Attach the products, then verify the paid user journey and webhook events before switching providers from test to production.

## References

[1] [Vercel Postgres migration to Neon](https://vercel.com/docs/postgres)

[2] [Google OAuth 2.0 for server-side web applications](https://developers.google.com/identity/protocols/oauth2/web-server)

[3] [Microsoft Entra application registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)

[4] [Stripe webhook documentation](https://docs.stripe.com/webhooks)

[5] [RevenueCat Stripe Billing integration](https://www.revenuecat.com/docs/web/integrations/stripe)

[6] [Vercel environment variables](https://vercel.com/docs/environment-variables)
