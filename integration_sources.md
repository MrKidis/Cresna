# Cresna Integration Sources

The implementation uses Shopify’s GraphQL Admin API, OAuth authorization, and webhook delivery model. Shopify confirms that authenticated scopes are required for store data access, that `read_orders` grants order and abandoned-checkout access, and that the default order-history window is 60 days. The app requests only `read_orders`, `read_products`, and `read_customers`; it stores aggregate metrics rather than customer-level personal data.

- Shopify access scopes: https://shopify.dev/docs/api/usage/access-scopes
- Shopify authentication and authorization: https://shopify.dev/docs/apps/build/authentication-authorization
- Shopify webhooks: https://shopify.dev/docs/api/webhooks/latest
- Shopify abandoned checkouts: https://shopify.dev/docs/api/admin-graphql/latest/queries/abandonedCheckouts
- Shopify Order GraphQL object: https://shopify.dev/docs/api/admin-graphql/latest/objects/Order
- Shopify InventoryItem GraphQL object: https://shopify.dev/docs/api/admin-graphql/latest/objects/InventoryItem

Stripe Checkout is used for recurring subscription checkout and its webhook model is used to react to completed checkout sessions and future subscription lifecycle changes. Stripe states that subscription state changes and trial transitions should be handled with verified webhooks.

- Stripe free trials in Checkout: https://docs.stripe.com/payments/checkout/free-trials
- Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe webhook handling and verification: https://docs.stripe.com/webhooks
