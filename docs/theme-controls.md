# Cresna theme and control audit

Cresna uses the shared Button, Input, Label, Card, and semantic token components for primary actions and text inputs. A small number of native controls remain deliberate: the Shopify product selector is a native `<select>` because it exposes a keyboard-native option list, and beta feature toggles are native checkboxes because they map directly to boolean settings and preserve assistive-technology semantics.

Those native controls must retain visible `border-border`, `bg-background`, `text-foreground`, `focus:ring-ring`, and disabled-state styling. They are not used for navigation or destructive actions. Unsupported Shopify capabilities remain rendered as unavailable states rather than disabled controls that imply functionality.

The visual audit covers the public shell, authentication, workspace overview, Growth Profile, Connect Store, Opportunity Engine, AI Action Studio, and Owner Panel at desktop and mobile widths. Remaining work is a full light/dark capture matrix for every commerce subroute and removal of non-semantic decorative hex colors where they affect contrast rather than brand illustration.
