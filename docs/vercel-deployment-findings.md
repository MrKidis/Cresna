# Vercel deployment findings

As of the latest verification, GitHub API reports `MrKidis/Cresna` main at commit `cd449ba94b4311ac012b770716101ea3779476eb`, titled `Connect Firebase auth and OpenRouter AI`. The Vercel project `cresna` is connected to `MrKidis/Cresna`, but its deployment list still shows the older `3ca1e4c` revision as latest. The live domain has served the public landing page, while `/auth` was previously observed as a 404 on an older deployment. A Vercel deploy-hook form was opened for `cresna-main-deploy` on branch `main`; the form visually displayed `main` but returned a validation error saying the branch name was empty. No deploy-hook URL has been copied or shared.

## Runtime finding — 2026-08-15

The `3bf0c30` deployment built successfully but `/api/health` and `/api/trpc/auth.me` still returned `FUNCTION_INVOCATION_FAILED`. Vercel runtime logs showed `ERR_REQUIRE_ESM`: `jwks-rsa` attempted to require the ESM `jose` package during eager Firebase Admin initialization. The API entrypoint itself loads under Node strip-only mode. The current fix defers `firebase-admin/app` and `firebase-admin/auth` imports until a Bearer token is present, so public health requests do not initialize the Firebase auth stack.
