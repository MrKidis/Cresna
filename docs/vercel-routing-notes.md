# Cresna Vercel routing notes

## Verified deployment findings

Cresna’s GitHub-connected Vercel project serves the Vite frontend at `https://cresna.vercel.app`. Vercel also emitted one Node.js function at `/api/[...path]` for the unified backend.

The first deployed configuration let the frontend resolve but returned a platform `404` for `/api/revenuecat/webhook`. The repair adds an explicit same-application rewrite from `/api/:path*` to `/api/[...path]`, followed by a static SPA fallback for all remaining paths. Vercel documents named wildcard capture and forwarding in same-application rewrites. [1]

After that rewrite, the API function was reached but returned `FUNCTION_INVOCATION_FAILED` at initialization. Vercel’s Node runtime documentation states that TypeScript path mappings are not supported for server entrypoints/functions, so Cresna’s core server imports were changed from `@shared/*` aliases to portable relative paths. [2]

## Required verification after the portable-import deployment

Run this command from any terminal after Vercel marks the current `main` deployment ready:

```bash
curl -i https://cresna.vercel.app/api/health
```

The expected result is `HTTP 200` and this JSON response:

```json
{"service":"cresna-api","status":"ok"}
```

Only after this health endpoint succeeds should production database credentials, OAuth callbacks, Stripe webhooks, or RevenueCat webhooks be configured against the Vercel domain.

## References

[1] [Vercel rewrites documentation](https://vercel.com/docs/routing/rewrites)

[2] [Vercel Node.js runtime documentation](https://vercel.com/docs/functions/runtimes/node-js)
