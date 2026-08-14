# Shopify Design and Data Boundaries Research

## Navigation principles to adapt

Shopify’s public app-design guidance recommends using the fewest useful navigation categories, making the current location and next step clear, and providing an in-product return path for linked pages. Cresna will use those task-flow and accessibility principles while preserving its own name, forest-and-lime visual system, layout, and interaction design.

Source: [Shopify app navigation guidance](https://shopify.dev/docs/apps/design/navigation).

## Supported Admin API permission families relevant to Cresna

Shopify documents distinct read and write scopes for commerce data. Relevant scope pairs include orders (`read_orders` and `write_orders`), products and collections (`read_products` and `write_products`), customers (`read_customers` and `write_customers`), discounts (`read_discounts` and `write_discounts`), markets (`read_markets` and `write_markets`), fulfillment (`read_fulfillments` and `write_fulfillments`), content (`read_content` and `write_content`), and marketing events (`read_marketing_events` and `write_marketing_events`). Cresna currently requests only the data it has an implemented, merchant-consented purpose to use; any write workflow must remain unavailable until the corresponding scope and supported mutation are configured.

Source: [Shopify API access scopes](https://shopify.dev/docs/api/usage/access-scopes).

## Product implication

Cresna can provide deeper analysis, explanations, approval queues, and outcome measurement over permitted data. It must not represent Shopify-native functions such as label purchasing, fulfillment actions, or market changes as active Cresna functionality until the required Shopify scope, API path, consent language, and server-side verification are implemented.
