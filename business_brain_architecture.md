# Cresna Business Brain Architecture

## Evidence boundary

Cresna uses two sources of truth. **Merchant-provided context** contains goals, positioning, values, differentiators, target buyer, and approved voice. **Connected-store evidence** contains the fields granted through Shopify: product content, SEO metadata, media counts, collections, pricing and inventory signals, orders, refunds, discounts, and aggregate checkout data. Shopify’s current Admin GraphQL product and collection objects make this catalog information available with `read_products` access.[1] [2]

No component may represent unavailable data as a finding. Homepage structure, customer-review content, external competitors, social presence, organic rankings, and answer-engine visibility remain explicitly **unavailable** until Cresna has a permitted, verifiable source.

## Data model

| Record | Purpose | Stored inputs |
| --- | --- | --- |
| **Business Brain profile** | Merchant-provided durable context. | Goals, positioning, values, differentiators, customer, voice. |
| **Store scan snapshot** | Explains exactly what was analyzed and the resulting coverage. | Store, catalog, collection, sales, checkout, and Business Brain coverage flags. |
| **Growth Score snapshot** | A transparent score calculated from component scores and coverage. | Component scores, coverage percentage, score status, explanations, calculation version. |
| **Opportunity** | A ranked explanation of a real problem worth acting on. | What, why, evidence, impact range, confidence, effort, source fields, status. |
| **AI action draft** | Reviewable proposed work, never an automatic storefront mutation. | Selected product/positioning source, original text, generated draft, status, approval timestamp. |
| **Business Brain event** | Durable learning record. | Scan completion, accepted/rejected recommendation, generated/approved/rejected draft, completed action, observed outcome. |

## Growth Score v1

The score is a **readiness indicator**, not a sales prediction. Its component scores are calculated only when the relevant evidence is present.

| Component | Evidence | Score behavior |
| --- | --- | --- |
| **Catalog clarity** | Active-product descriptions, SEO descriptions, and media counts. | Measures content completeness; marks partial data when fields are missing. |
| **Commerce health** | Seven or more daily store records, refunds, discounts, and checkout data when granted. | Calculates only with enough reporting days. |
| **Offer readiness** | Current product status, inventory, prices, and collections. | Identifies missing catalog context rather than assigning a false penalty. |
| **Brand context** | Positioning, customer, differentiators, goals, and voice. | Rewards completed merchant context; never guesses brand strategy. |

The overall score is a weighted average of **available** components. Cresna displays the coverage percentage and reports **“Needs more data”** when fewer than two components can be calculated.

## AI action contract

1. A recommendation must cite current store evidence.
2. A merchant chooses an eligible recommendation or product.
3. Cresna creates a structured draft using Business Brain context and the original content.
4. The merchant compares original and proposed content, approves or rejects it, and the decision enters the Business Brain.
5. No automatic Shopify mutation occurs in this release. A future publish step requires a separate confirmed write action and a correct write scope.

## References

[1] [Shopify Developers, *Product object*](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product)

[2] [Shopify Developers, *Collection object*](https://shopify.dev/docs/api/admin-graphql/latest/objects/Collection)
