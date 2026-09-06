# MARKSMAN UI foundation

## Product promise

Freight Cost Model is the governed costing workspace inside the MARKSMAN product family. The interface should make freight selection and pricing feel structured, measurable, and deliberate rather than generic or transactional.

Canonical visual source: `H:\Mi unidad\Socios\Ventas y Marketing\Branding\Manual de Marca Marksman.pdf`.

## Reuse decision

| Candidate | Decision | Reason |
|---|---|---|
| MARKSMAN Brand Manual and official shared-drive assets | Adopt | Authoritative palette, voice, typography names, logo variants, and promise. |
| Rateware MARKSMAN brand standard | Adapt | Reuses the same operational voice and accessibility guardrails without copying its legacy page structure. |
| Existing Freight Cost Model shell and shadcn components | Retain and retheme | Preserves proven responsive, auth, navigation, table, and human-confirmation behavior while replacing the generic indigo styling. |

All three sources are internal/proprietary; no external template or third-party visual license was introduced.

## Brand tokens

- Charcoal Grey: `#1e1e1e`
- Electric Orange: `#ea5e27`
- Industrial Grey: `#484848`
- Cloud Grey: `#efefef`
- Promise: `Precision Freight Networks`
- Primary voice: short, clear, structured, disciplined, and free of buzzwords.

Electric Orange is the action and focus color. Body text does not use white on orange at small sizes; primary controls use Charcoal text on Electric Orange to preserve contrast.

## Assets and typography

The UI uses the approved `marksman new logo.png` source without redrawing, recoloring, or stretching it. The deployed copy lives at `apps/web/public/brand/marksman-logo.png`.

The manual names `New Black Typeface` as primary and `Lenia Mono` as secondary. No licensed font files were found beside the manual, elsewhere in the shared drive, or in the installed Windows fonts. CSS therefore names the approved families first and uses explicit Geist/Arial and Geist Mono/Courier fallbacks. Replacing those fallbacks requires the approved font files and their web-use license.

## First visual slice

- Global light/dark tokens now derive from the MARKSMAN palette.
- Login uses the official full logo, approved promise, disciplined copy, a Charcoal brand field, and an Electric Orange primary action.
- Authenticated shell uses the official logo, Charcoal navigation, Electric Orange active/action states, sharper geometry, and monospace micro-labels.
- Existing workflows, permissions, Supabase Auth behavior, tables, and confirmation boundaries are unchanged.

This slice does not claim complete brand acceptance for every module. Dashboard, dense tables, loading, empty, error, blocked, approval, desktop, and mobile states still require visual evidence before production promotion.

## Preview acceptance

The branded slice is available as a reversible, non-production Vercel preview at `https://freight-cost-qcpvt06i8-elandopando8892s-projects.vercel.app`.

Google Sign-In was exercised end to end against the shared Rateware Supabase project. The exact preview `/auth/callback` entry was added to the existing allowlist while preserving the production and earlier preview callbacks. The authenticated desktop shell and sign-out path were visually verified at 1280 x 720; evidence is stored in `tmp/brand-audit/06-dashboard-brand-preview.png`.

The first in-app browser did not honor the requested 390 x 844 viewport. A later
clean preview was verified with an explicit Chrome viewport at that exact size:
the login remained legible and had no horizontal overflow. The authenticated
shell still needs mobile acceptance. This preview is not a production deployment
or production-acceptance claim.
