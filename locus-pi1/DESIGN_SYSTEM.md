# Design system

The renderer uses a small Material-inspired system built on CSS custom properties. Keep values shared across screens in `src/renderer/design-tokens.css`; component-specific layout rules belong in `src/renderer/index.css` or the component stylesheet.

## Tokens

- **Color roles:** use `--color-primary`, `--color-surface`, `--color-on-surface`, `--color-outline`, and the `success`, `warning`, `error`, and `info` roles. Container colors should be paired with their matching `--color-on-*-container` text role.
- **Text hierarchy:** use `--color-on-surface` for headings, body copy, input values, and table content; use `--color-on-surface-variant` for labels, secondary copy, and placeholders. Reserve primary blue for primary actions, focus indicators, explicit links, highlighted icons, and active navigation.
- **Typography:** use the `--font-*` scale from display through label. Reading copy uses `--font-body-lg` (16px); functional text must not be smaller than `--font-body-sm` (12px).
- **Spacing and shape:** use `--space-1` through `--space-12`, `--radius-xs` through `--radius-full`, and `--elevation-1` through `--elevation-5`.
- **Motion and layout:** use `--motion-*`, `--ease-*`, and the documented `--breakpoint-*` values.
- **Theme:** light is the default. The header switch persists the selection under `locus:theme`; the saved value is applied before the first render. Dark mode uses slate 950 for the app background, slate 900 for cards, slate 800 for controls, and slate 700 for subtle borders. Primary blues shift by theme to preserve contrast.

## Shared patterns

Use the shared `ui-*` classes for controls, cards, badges, skeletons, and motion. Existing React components such as `Button`, `Input`, `Campo`, and `Badge` should be preferred over hand-written equivalents.

```jsx
<section className="ui-card">
  <label className="ui-label">
    Nome
    <input className="ui-input" />
  </label>
  <button className="ui-button ui-button--filled">Salvar</button>
</section>
```

For feedback, use inline or snackbar-style action feedback; reserve the notification center and native notifications for events. Always provide visible `:focus-visible` styling, label form controls, and keep interactive targets at least 44px tall.

## Responsive layout and motion

Breakpoints are `37.5rem` (600px), `52.5rem` (840px), and `75rem` (1200px). Prefer fluid grids with `minmax()` and allow content containers to shrink rather than introducing page-level horizontal scrolling.

Transitions should use the motion tokens and focus on `transform` and `opacity`. The global stylesheet reduces transitions and animations for `prefers-reduced-motion: reduce`.
