# Cresna theme and control audit

Cresna uses the shared Button, Input, Label, Card, and semantic token components for primary actions and text inputs. A small number of native controls remain deliberate: the Shopify product selector is a native `<select>` because it exposes a keyboard-native option list, and beta feature toggles are native checkboxes because they map directly to boolean settings and preserve assistive-technology semantics.

Those native controls retain visible `border-border`, `bg-background`, `text-foreground`, `focus:ring-ring`, and disabled-state styling. They are not used for navigation or destructive actions. Unsupported Shopify capabilities remain rendered as unavailable states rather than disabled controls that imply functionality.

The full route audit covers the public shell, authentication, workspace overview, Growth Profile, Connect Store, Opportunity Engine, AI Action Studio, Owner Panel, Billing, Settings, and the commerce subroutes at desktop and mobile widths. Both light and dark captures were run using Cresna’s supported `?theme=dark` switch; route-level semantic assertions, render tests, and procedure tests supplement the screenshots. Remaining raw hex values are confined to intentional illustration/brand-compatibility surfaces rather than contrast-bearing active controls.
