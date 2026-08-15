# RevenueCat activation state

The connected RevenueCat account currently exposes one project, `project-tWSZ5BsZ`, with no apps registered. Because the project has no app, it has no store-backed product catalog, entitlements, packages, or offering that can safely receive a Cresna paywall. The source repository contains the Cresna Free/Pro/Growth paywall contract and an explicit unlinked-products state, but no live RevenueCat offering is claimed.

The next activation sequence is to register the real iOS, Android, or RevenueCat Test Store app, create or import the actual Pro and Growth products, attach them to `cresna_pro` and `cresna_growth` entitlements, create monthly and annual packages, create a default offering, then attach an unpublished paywall. Publishing remains intentionally blocked until real products and a verified purchase flow exist. This prevents the UI from displaying fake prices or implying a payment path that cannot complete.
