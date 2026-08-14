# Cresna production activation guide

This guide turns the GitHub-connected Vercel project into a real production application. The GitHub repository contains source code; **Vercel hosts the frontend and API together**. Do not put passwords, API keys, webhook signing secrets, database URLs, or OAuth client secrets in GitHub issues, commits, screenshots, or chat.

## What you need to create

| Service | What it provides | Why Cresna needs it | Account-owned step |
|---|---|---|---|
| Managed MySQL/TiDB database | `DATABASE_URL` | Persists users, workspace data, Shopify data, drafts, consent history, access states, and outcomes | Create a production database and copy its TLS-enabled connection string into Vercel only. |
| Google Cloud | Google OAuth client ID and secret | Lets users choose **Continue with Google** after the external-auth migration is implemented | Create a Web application OAuth client. |
| Microsoft Entra | Microsoft OAuth client ID, tenant ID, and secret | Lets users choose **Continue with Microsoft** after the external-auth migration is implemented | Register a web application and create a client secret. |
| Stripe | Stripe secret key, publishable key, and webhook signing secret | Creates and manages Cresna Pro/Growth subscriptions | Create the Stripe account and products, initially in Test mode. |
| RevenueCat | Web Billing offering, packages, entitlements, and webhook authorization | Maps verified purchases to Cresna Pro/Growth access | Link Stripe Billing products, then attach packages to the offering/paywall. |
| AI provider | Server-only AI key | Runs Cresna’s owner and merchant intelligence from API routes | Create a provider account and project/API key with spending limits. |

## Step 1 — use a database that matches the current Cresna code

The current source uses Drizzle with the `mysql2` driver. The lowest-risk first production database is therefore a **managed MySQL or TiDB-compatible database**, not a Postgres product. Create an empty production database with encrypted/TLS connections, a separate least-privilege application user, and regular backups. Store its complete connection string as `DATABASE_URL` in Vercel.

> Do not choose a database because it is advertised inside a hosting dashboard if it requires a PostgreSQL migration. Vercel’s current database integration path is Neon/Postgres; that is viable only after Cresna’s Drizzle schema, driver, and migration workflow are deliberately converted from MySQL/TiDB. [1]

After adding the database URL to Vercel, apply Cresna’s database migrations against **that production database**. Never point production to the current development database.

## Step 2 — create Google sign-in

In Google Cloud Console, create a project for Cresna, configure the OAuth consent screen with Cresna’s support contact and privacy-policy URL, then create an OAuth **Web application** client. Add the final Vercel domain as an authorized origin and add this future callback URL:

```text
https://YOUR_VERCEL_DOMAIN/api/auth/google/callback
```

Save the resulting credentials only as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel. Google’s server-side flow requires a confidential web client and an exact authorized redirect URI; its client secret must stay outside the source tree. [2]

## Step 3 — create Microsoft sign-in

Sign in to the Microsoft Entra admin center, go to **Entra ID → App registrations → New registration**, create a Cresna web application, then record its **Application (client) ID**. In **Authentication**, add:

```text
https://YOUR_VERCEL_DOMAIN/api/auth/microsoft/callback
```

In **Certificates & secrets**, create a new client secret and immediately store it in Vercel as `MICROSOFT_CLIENT_SECRET`; store the client ID as `MICROSOFT_CLIENT_ID` and the selected tenant as `MICROSOFT_TENANT_ID`. Microsoft’s documentation calls for registering the web app, adding a redirect URI, and creating credentials through the app registration. [3]

## Step 4 — implement the external authentication migration

The current Cresna repository still uses its existing platform-specific OAuth adapter. After Google and Microsoft credentials exist, replace that adapter with server-side OAuth routes that issue Cresna sessions and persist only the minimal identity data needed for the account. The user interface should then show only **Continue with Google** and **Continue with Microsoft**—not a fake email/password form.

The two callback paths above are planned external-auth endpoints. Do not register them with providers until the corresponding routes are implemented and deployed. Keep the existing `OWNER_OPEN_ID` rule only after mapping the owner’s new provider identity server-side; normal users must never obtain owner access from a client-side role.

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

Create a separate provider project for Cresna, set a spending limit, and create a server-only API key. Store it in Vercel as the provider-specific secret, for example `OPENAI_API_KEY`. The deployed app should call the provider from the backend only; never embed the key in the Vite client bundle.

Cresna’s AI may use merchant-authorized store data to answer an individual request, cite the fields used, create a reviewable draft, and record an approved outcome. It must not send private merchant data into a shared training set, claim hidden tool actions, or retain user conversations in function memory. Durable user preferences, consent, draft history, and summarized outcomes belong in the database.

## Vercel environment checklist

Add these under **Vercel Project → Settings → Environment Variables**. Select Production, and select Preview only for values safe to use in preview environments. Vercel environment variables are configured outside the repository. [6]

| Variable | Add now? | Source |
|---|---:|---|
| `DATABASE_URL` | Yes | Managed MySQL/TiDB provider |
| `JWT_SECRET` | Yes | Generate a long random secret; never reuse development values |
| `OWNER_OPEN_ID` | After external auth migration | New server-side owner identity mapping |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | After Google app setup | Google Cloud Console |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` | After Microsoft app setup | Microsoft Entra admin center |
| `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | After Stripe setup | Stripe Dashboard |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | After RevenueCat webhook setup | New random value stored in both places |
| AI provider key | After provider selection | Provider project dashboard |
| Shopify credentials | When Shopify OAuth is ready for production | Shopify Partners / app configuration |

## Safe order of operations

1. Finish this initial Vercel deployment and note the final domain.
2. Create the managed MySQL/TiDB database and add `DATABASE_URL` and a new `JWT_SECRET`.
3. Build and deploy the external Google/Microsoft OAuth migration.
4. Create Stripe Test-mode products and verify Stripe webhooks.
5. Attach the real Stripe products to RevenueCat packages, offering, and paywall; verify RevenueCat webhooks.
6. Add the AI provider key, apply privacy/retention controls, and test evidence-backed responses.
7. Switch each provider from test to production only after the complete paid user journey succeeds.

## References

[1] [Vercel Postgres migration to Neon](https://vercel.com/docs/postgres)

[2] [Google OAuth 2.0 for server-side web applications](https://developers.google.com/identity/protocols/oauth2/web-server)

[3] [Microsoft Entra application registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)

[4] [Stripe webhook documentation](https://docs.stripe.com/webhooks)

[5] [RevenueCat Stripe Billing integration](https://www.revenuecat.com/docs/web/integrations/stripe)

[6] [Vercel environment variables](https://vercel.com/docs/environment-variables)
