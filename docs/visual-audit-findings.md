# Cresna visual audit findings

The current desktop captures cover the public home page, Firebase authentication, workspace overview, Growth Profile, AI Action Studio, Owner Panel, Billing, Settings, Connect Store, Orders, Drafts, Shipping, Products, and Customers. The routes retain visible Cresna branding, the Owner Panel is separated from normal workspace navigation, and unsupported Shopify capabilities display explicit unavailable or connect-first states rather than simulated controls.

The second capture batch covered Billing, Settings, Connect Store, Orders, Drafts, Shipping, Products, and Customers at desktop and 375px mobile widths. The mobile layouts keep headings, permission boundaries, cards, and unavailable-state explanations within the viewport without visible clipping.

A true dark-theme matrix was then captured with the supported `?theme=dark` query for Billing, Settings, Connect Store, Orders, Drafts, Shipping, Products, and Customers at 1280px and 375px widths. The rendered routes preserve high-contrast headings and body copy, readable controls and inputs, visible active navigation, lime accent actions, explicit unavailable states, and mobile-safe wrapping without visible clipping. Billing and Settings retain the owner-workspace label and account navigation without overlap.

The merchant draft component is route-owned and has realistic evidence/unknown-impact render coverage. Live connected-store generation still requires a real Shopify catalog. Remaining hardcoded colors are limited to intentional brand illustration/compatibility surfaces and are being audited separately from contrast-bearing text and controls.
