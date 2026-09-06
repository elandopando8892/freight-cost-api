# Design QA - MARKSMAN UI foundation

## Comparison target

- Source visual truth: `H:\Mi unidad\Socios\Ventas y Marketing\Branding\Manual de Marca Marksman.pdf`
- Source pages used: 6 (promise and voice), 11 (approved logo variants), 12 (palette), and 13 (typography).
- Baseline implementation: `tmp/brand-audit/02-login-current.png`
- Revised implementation: `tmp/brand-audit/03-login-brand-local.png`
- Combined comparison evidence: `tmp/brand-audit/05-brand-comparison.png`
- Authenticated preview evidence: `tmp/brand-audit/06-dashboard-brand-preview.png`
- Non-production preview: `https://freight-cost-qcpvt06i8-elandopando8892s-projects.vercel.app`
- Viewport and state: 1280 x 720, desktop, dark theme, unauthenticated login.
- Source dimensions: PDF pages rendered at 1800 x 1013 pixels from the 1440 x 810 point source.
- Implementation dimensions: native 1280 x 720 screenshot at device density 1.
- Normalization: each dedicated source panel was scaled to 640 x 360 in the combined comparison; the implementation remained at its native 1280 x 720 size.

## Full-view comparison evidence

The revised login uses the approved full logo without recoloring or redrawing, the four-color MARKSMAN foundation, Charcoal/Cloud surface balance, Electric Orange actions and focus, sharper geometry, the `Precision Freight Networks` promise, and the short contrast-driven voice shown in the manual. The previous generic indigo card no longer defines the experience.

The login is a product interpretation of the brand system rather than a pixel clone of a manual slide. The comparison therefore evaluates logo fidelity, palette roles, typography hierarchy, spacing rhythm, surface geometry, voice, and operational legibility.

## Focused-region evidence

A separate crop was not required. Pages 11, 12, and 13 are already dedicated, legible logo, palette, and typography panels in the combined comparison, and the corresponding implementation regions are fully visible at native resolution beneath them.

## Required fidelity surfaces

- Fonts and typography: display and UI hierarchy follow the manual's technical, compact character. `New Black Typeface` and `Lenia Mono` are declared first, but their licensed files were not available; Geist/Arial and Geist Mono/Courier are explicit fallbacks.
- Spacing and layout rhythm: the 1280 x 720 desktop view preserves a clear brand field and a compact auth workspace without overlap, clipping, or collapsed controls.
- Colors and tokens: Charcoal `#1e1e1e`, Electric Orange `#ea5e27`, Industrial Grey `#484848`, and Cloud Grey `#efefef` are mapped into the shared light/dark token layer. Primary button text uses Charcoal on Orange rather than small white text on Orange.
- Image quality and asset fidelity: `apps/web/public/brand/marksman-logo.png` is a byte-for-byte copy of the approved shared-drive PNG. It is rendered at its intrinsic aspect ratio with no CSS recoloring, approximation, custom SVG, or placeholder.
- Copy and content: the visible promise and contrast statement use the manual's disciplined voice. Supabase, organization, role, and evidence language remains explicit.
- Accessibility and behavior: labels remain associated with inputs; the email field received focus successfully; focus uses the branded ring; semantic buttons and the recovery link remain reachable. Credentials were not submitted during visual QA.

## Comparison history

### Pass 1 - blocked

- [P1] Generic visual identity. The deployed login used an indigo primary color, a generic centered card, Geist-only typography, and no MARKSMAN logo or promise.
- [P1] Product-family drift. The authenticated baseline showed a generic waypoints icon and `Rateware family` instead of the official mark and product relationship.

Fixes applied:

- Replaced the generic primary/sidebar tokens with the approved MARKSMAN palette in light and dark themes.
- Added the approved logo asset to login and authenticated shell.
- Rebuilt the login composition around a Charcoal brand field and compact operational form.
- Updated active, focus, card, button, metadata, micro-label, and voice treatments.
- Documented the unavailable licensed-font files and explicit fallback boundary.

### Pass 2 - passed

Post-fix evidence: `tmp/brand-audit/03-login-brand-local.png` and `tmp/brand-audit/05-brand-comparison.png`.

No actionable P0, P1, or P2 visual mismatch remains for the desktop login slice.

## Authenticated preview acceptance

- The Vercel preview completed with `READY` status and the production build passed.
- Google Sign-In completed with the configured MARKSMAN account, returned through `/auth/callback`, and opened the authenticated dashboard at the preview root.
- The authenticated shell rendered the official logo, Charcoal navigation, Electric Orange actions and active state, organization header, account identity, navigation groups, dashboard cards, and sign-out control at 1280 x 720.
- Sign-out returned to the branded login. The temporary authenticated browser session was closed before handoff.
- Supabase keeps its production and prior-preview callback entries; the exact new preview callback was added without changing the Site URL or promoting this build to production.

## Evidence limits and follow-up polish

- [P3] Exact font fidelity remains pending the approved `New Black Typeface` and `Lenia Mono` webfont files and their web-use license.
- The authenticated shell is visually accepted only at the available 1280 x 720 browser surface. Alternate desktop sizes remain a follow-up acceptance gate.
- The clean preview `5mav...` was later exercised with an explicit 390 x 844
  Chrome viewport. The login had `innerWidth=390`, `scrollWidth=375`, no visible
  horizontal overflow, and retained the complete MARKSMAN hierarchy and auth
  actions. The authenticated shell at that viewport remains pending.

## Implementation checklist

- [x] Approved logo copied without transformation.
- [x] Brand tokens applied to shared light/dark themes.
- [x] Login hierarchy and voice aligned with the manual.
- [x] Existing auth actions and human-governed product behavior preserved.
- [x] Lint, typecheck, production build, and desktop browser render completed.
- [x] Non-production Vercel preview deployed and Google Sign-In verified end to end.
- [x] Authenticated desktop shell captured and visually accepted at 1280 x 720.
- [ ] Supply and approve licensed brand webfonts.
- [x] Capture and inspect unauthenticated login at 390 x 844 with a verified viewport.
- [ ] Capture authenticated shell at 1440 x 900, 1280 x 800, and 390 x 844.

final result: passed
