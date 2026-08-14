# Cresna merchant write-permission model

| Proposed future action | Merchant confirmation | Current Cresna state | Required Shopify capability before execution | Audit result today |
|---|---|---|---|---|
| Publish an approved product-content draft | The merchant approves the draft direction, then records a per-draft publishing approval in AI Studio. | **Unavailable**. Cresna requests read-only scopes and does not call a Shopify write API. | A reviewed `write_products` scope configuration, reauthorization, a product-update implementation, and a server-side execution audit. | `not_configured` approval record; no Shopify mutation. |
| Apply an approved positioning direction | The merchant approves the direction, then records a per-draft publishing approval in AI Studio. | **Unavailable**. Positioning may affect different Shopify resources and must not be guessed. | A specific merchant-selected target resource, the matching approved Shopify write scope, a reviewed execution route, and a server-side execution audit. | `not_configured` approval record; no Shopify mutation. |

## Guardrails

1. A draft must belong to the active merchant workspace.
2. A merchant must approve the draft direction before Cresna records a publishing approval.
3. Recording approval is not publication and never bypasses Shopify OAuth scope consent.
4. Any future executor must transition the audit record only after the Shopify API confirms the write. Until then, all records remain `not_configured`.
