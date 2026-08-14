# Cresna RevenueCat Web Billing Readiness

## Current boundary

Cresna has an enabled RevenueCat connector and an existing RevenueCat project, but that project currently has **no Web app or Stripe configuration**. The Cresna application therefore continues to use its configured Stripe checkout path and must describe RevenueCat as **pending activation**, not live.

RevenueCat’s documented Stripe web purchase flow requires the RevenueCat project owner to connect the correct Stripe account, create a Stripe Web configuration, create/import products, group them into an offering, and only then use a hosted purchase link, web paywall, or Web SDK.[1] [2]

## Intended Cresna commercial mapping

| Cresna state | RevenueCat entitlement identifier | Offering/package intent | Customer-facing price |
|---|---|---|---|
| Free | None | No purchase package | $0; 10 reviewable AI actions/month |
| Pro monthly | `cresna_pro` | `pro_monthly` | $19/month; 500 reviewable AI actions/month |
| Pro annual | `cresna_pro` | `pro_annual` | $190/year; 500 reviewable AI actions/month |
| Growth monthly | `cresna_growth` | `growth_monthly` | $49/month; 2,500 reviewable AI actions/month |
| Growth annual | `cresna_growth` | `growth_annual` | $490/year; 2,500 reviewable AI actions/month |
| Owner | Not represented in RevenueCat | Server-side configured permanent owner rule | Full Growth access forever |
| Beta | Not represented in RevenueCat | Server-side invited-email record | One-time two-day access, then feedback and paid/free choice |

## Required owner actions before activation

1. In the RevenueCat project, connect the correct Stripe sandbox first, then the live Stripe account when Cresna is ready. RevenueCat documents that the project owner must do this connection and that each separate Stripe sandbox requires its own connection/configuration.[1] [2]
2. Create a Stripe Web configuration and configure the Stripe Customer Portal destination for management and cancellation.
3. Create or import the four recurring Stripe products/prices listed above. Use flat recurring prices; RevenueCat documents that tiered and usage-based Stripe pricing is not supported in its purchase flows.[1]
4. Create the Pro and Growth entitlements, attach the matching products, then create a `cresna_default` offering with four packages.
5. Add the RevenueCat webhook secret to Cresna, then enable and verify the server-side webhook handler before replacing the current Stripe checkout call.
6. Build an unpublished RevenueCat paywall or purchase link from the configured offering, verify sandbox entitlement activation and cancellation behavior, and publish only after the owner approves the preview.

## Deliberate product decisions

The standard Cresna paid purchase has **no automatic free trial**. Its separate email-bound beta program provides the limited two-day temporary access path. This is intentional: RevenueCat’s Stripe Billing purchase flows currently do not support free trials, even though externally created Stripe trials may be reflected in RevenueCat reporting.[1]

## References

[1]: https://www.revenuecat.com/docs/web/integrations/stripe "RevenueCat: Stripe Billing"
[2]: https://www.revenuecat.com/docs/web/connect-stripe-account "RevenueCat: Connect to your Stripe account"
[3]: https://www.revenuecat.com/docs/web/web-billing/product-setup "RevenueCat: Configure RevenueCat Billing products & prices"
