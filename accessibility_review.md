# Cresna Accessibility Basics Review

The review focused on the primary public and authenticated flows rather than making an unsupported claim of full accessibility conformance. Cresna uses semantic button elements for interactive controls, explicit labels for the Shopify-domain, workspace-name, beta-email, and Growth Profile inputs, and visible focus styles through the shared component system and custom controls.

| Flow | Review result |
| --- | --- |
| **Public entry** | The header exposes separate **Sign in** and **Start free trial** actions. The brand button has an accessible label and navigation links use native anchors. |
| **Authenticated workspace** | The sidebar toggle has an explicit label. The account menu exposes a named **Sign out** action. Protected routes show a clear sign-in state instead of a blank view. |
| **Growth Profile** | Goal controls use native checkboxes paired with visible labels; text fields use associated labels; the scan and finding states use readable plain language rather than color alone. |
| **Opportunity Engine** | Approval and completion actions are native buttons. Confidence, effort, and impact are expressed in text and are not conveyed only by color. |
| **Billing and beta forms** | Interval controls are buttons, payment states are written in text, email feedback and rating controls have labels or legends, and all submission controls retain visible disabled states. |
| **Founder Mode** | The beta invitation email input uses an associated label; feature override checkboxes include an accessible label that identifies the feature and beta email. |

The interface has also been reviewed at mobile and desktop viewport sizes. Future production work should include an automated accessibility scanner and manual assistive-technology testing after the real Shopify and Stripe flows are connected to a live public domain.
