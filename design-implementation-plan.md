# PetHub Design Implementation Plan

**Source of truth:** [`design.md`](./design.md)  
**Prepared:** 15 September 2026  
**Scope:** Apply the Calm Care Editorial refinement to the current Next.js 16.3.5 PWA without changing product truth, persistence semantics, or the four-destination information architecture.

---

## Implementation snapshot — 16 September 2026

The first production pass is now applied to the Today experience. The hero uses a single cobalt accent on a quiet editorial surface, quick actions share one flat operational-card treatment, urgency is carried by a restrained left rail in reminder rows, and “Concluir cuidado” is a direct action while “Adiar ou reagendar” remains secondary. The store provider also guards the hydration completion path so a hard reload can recover from the existing loading stall instead of remaining indefinitely on the shell skeleton.

The remaining phases below are still the source-of-truth backlog: shared primitive tokens, onboarding and shell refinement, cross-page visual consistency, and a root-cause investigation of the hydration and lockfile issues.

---

## 1. Outcome

The implementation should make PetHub feel calmer, more trustworthy, and more consistent while preserving the warmth already visible in Welcome.

Success means:

- Today and Care read as operational tools, not promotional card galleries;
- the pet remains the emotional anchor without competing with urgency and action;
- one accent family leads each screen and semantic colors retain fixed meaning;
- operational cards use consistent radii, flat surface separation, and little or no elevation;
- motion explains state change and never becomes ambient decoration;
- every refactor preserves local-first behavior, drafts, focus, announcements, and reduced-motion behavior.

---

## 2. Current-state evidence and constraints

### What is already strong

- The app already implements the intended four destinations in `src/components/app-shell.tsx`.
- `src/app/globals.css` contains the core ivory, navy, teal, cobalt, coral, yellow, and semantic tokens described in the design specification.
- Fraunces and Manrope are already loaded through `next/font` in `src/app/layout.tsx`.
- Base UI Dialog powers the owned bottom sheet, and `components.json` is already aligned with the Base UI-compatible shadcn style.
- `motion` is installed and globally honors the user's reduced-motion preference through `MotionConfig reducedMotion="user"`.
- The rendered Welcome screen has a distinctive editorial headline, clear trust copy, and a credible warm palette.

### What needs refinement

- Hard-offset shadows, rotated labels, asymmetric radii, and different tinted cards appear repeatedly across Welcome, Today, onboarding, empty states, shell branding, and the public card. Repetition turns the signature gesture into visual noise.
- Many operational cards combine tint, border, radius, shadow, and hover lift. This weakens hierarchy because every object asks for attention.
- Today exposes several accent families together. Urgency, brand, shortcuts, diary, and discovery compete within one viewport.
- Several page and section headings use the editorial face at semibold weight. The refined system needs lighter Fraunces display and quieter Manrope hierarchy.
- The codebase contains an OGL `AuroraBackground` implementation even though it is not currently imported. The implementation plan must keep WebGL out of the production experience and remove the unused module once dependency usage is verified.
- The current local preview rendered Welcome, but `/onboarding` remained at the store-hydration skeleton. This is a verification blocker for the onboarding redesign and must be resolved before visual work on that flow is accepted.
- Running the package-manager dev script currently encounters a broken `pnpm-lock.yaml` entry for `@ast-grep/napi-darwin-arm64@0.40.5`. Dependency repair is a separate prerequisite and must be handled as a scoped change, not hidden inside design edits.

### Non-goals

- No new navigation destinations.
- No account, sync, push, server-backed public identity, moderation, or marketplace claims.
- No GSAP, second component foundation, WebGL effect package, or React Bits theme layer.
- No visual refactor that changes record, reminder, privacy, sharing, or lost-mode semantics without a separate product decision.

---

## 3. Implementation order

### Phase 0 — restore a trustworthy visual baseline

**Files:** `pnpm-lock.yaml`, `package.json`, `src/components/store-provider.tsx`, `src/lib/store/app-store.ts`, existing hydration tests, preview tooling.

1. Repair the lockfile with the repository's configured pnpm version and review the resulting diff before accepting it.
2. Reproduce the onboarding hydration stall in a clean browser context and a context with existing persisted state.
3. Fix the hydration gate only after identifying whether the cause is storage parsing, the persist callback, service-worker/cache state, or a client exception.
4. Capture baseline screenshots and DOM/console evidence for Welcome, onboarding, Today, Agenda, record form, pet profile, card preview, Explore, Profile, loading, empty, error, offline, and lost mode.

**Gate:** the app starts from the documented command; Welcome → onboarding → Today completes in a clean session; direct loads and client navigation both settle; no persistent skeleton remains without an explicit timeout/recovery state.

### Phase 1 — codify the Calm Care Editorial foundation

**Primary files:** `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/chip.tsx`, `src/components/ui/field.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/empty-state.tsx`, `src/components/ui/skeleton.tsx`.

1. Add named surface, radius, and elevation tokens rather than repeating arbitrary values.
2. Define `radius-control`, `radius-card`, `radius-feature`, `shadow-soft`, and `shadow-float`; keep the hard-offset shadow as a private Welcome/share-card utility, not a general token.
3. Update typography utilities so Fraunces defaults to regular/medium and operational headings use Manrope unless the surface is explicitly emotional.
4. Normalize Button, Card, Chip, Field, Sheet, EmptyState, and Skeleton states: normal, hover, pressed, focus, disabled, invalid, loading, dark, and reduced motion.
5. Make standard Card flat by default. Provide explicit `quiet`, `tinted`, `raised`, and `danger` compositions instead of arbitrary class stacks at call sites.
6. Verify the light/dark semantic palette before changing any hue. If a value changes, update the viewport/theme colors and manifest consistently.

**Gate:** primitive story fixtures or focused tests cover each state; no primitive requires color alone to communicate state; all interactive targets remain at least 44px, preferably 48px.

### Phase 2 — calm the shell and navigation

**Primary files:** `src/components/app-shell.tsx`, `src/components/page-header.tsx`, `src/components/offline-banner.tsx`, `src/components/theme-provider.tsx`, `src/app/(app)/layout.tsx`.

1. Remove decorative offset shadow/rotation from the persistent brand mark; keep the recognizable cobalt paw and wordmark.
2. Use one active-navigation treatment across mobile rail, tablet rail, and desktop rail. Color identifies the destination, but the active state also uses shape, text, and `aria-current`.
3. Reduce the desktop sidebar callout to a quiet privacy/help surface or remove it if it competes with task navigation.
4. Keep the header and bottom navigation visually stable during route loading and store hydration.
5. Ensure lost mode visually overrides the calm shell without using motion or color alone.

**Gate:** keyboard order starts with Skip Link, navigation, then page content; active state is clear in light/dark and forced colors; bottom navigation and floating Add never overlap at 320px or with safe-area insets.

### Phase 3 — make Today and Agenda the reference operational surfaces

**Primary files:** `src/app/(app)/page.tsx`, `src/app/(app)/reminders/page.tsx`, `src/components/reminder-card.tsx`, `src/components/pet-header.tsx`, `src/components/pet-avatar.tsx`, `src/components/quick-add-button.tsx`, `src/components/health-status-card.tsx`, `src/components/care-tabs.tsx`.

1. Restyle Today's hero as a warm reading surface with one cobalt or teal accent, not blue tint + yellow block + coral label + offset shadow.
2. Keep Care Halo as the unique visual signature, but pair every segment with nearby text and prevent it from implying health diagnosis.
3. Flatten reminder rows and let urgency use a slim rail, icon, chip, and explicit copy rather than a fully tinted card for every state.
4. Make **Concluir cuidado** perform the direct action described in `design.md`; keep **Adiar ou reagendar** as the sheet entry. Do not make both buttons open the same intermediate sheet.
5. Reduce the four quick-action tiles to a compact action list or two-by-two group with one surface family and icon accents.
6. Keep diary/discovery previews visually subordinate to the agenda and place them below the care decision path.
7. Adapt the React Bits Count Up idea only for counts changed by completion, undo, or a filter change. Render and announce the final number immediately; interpolate only the visual layer for at most 180ms.
8. Animate only the changed reminder row on complete/undo. The rest of the agenda reflows without layout animation.

**Gate:** completing, undoing, postponing, and rescheduling preserve history semantics; focus and live announcements are correct; reduced motion swaps state instantly; no hover-only action or pointer-only behavior.

### Phase 4 — refine Welcome and onboarding

**Primary files:** `src/app/welcome/page.tsx`, `src/app/onboarding/page.tsx`, new owned components under `src/components/motion/` only if reuse is proven.

1. Keep the Welcome editorial headline and warm canvas, but choose one signature composition. Remove extra rotated badges, hard shadows, and decorative shapes until the headline and CTA lead.
2. Trial a Componentry-inspired annotated underline on one short phrase. Implement it as an owned, decorative component only after source/license review. The unannotated phrase must remain fully understandable.
3. Replace the onboarding's repeated poster/sticker treatment with a calm progress header and consistent form surfaces.
4. Adapt the React Bits Stepper interaction model using existing `motion`: keyed step content, forward/back direction, 180–240ms opacity + 4px transition, preserved form state, semantic step label, and focus on the new heading.
5. Prevent step indicators from skipping required context. Back must not clear photo, name, species, optional details, or the care draft.
6. Use one short first-pet success reveal only after durable persistence succeeds.

**Gate:** onboarding completes in under 90 seconds in task testing; keyboard and screen-reader users receive the step name and error summary; 320px has no horizontal overflow; reduced motion is instant and complete.

### Phase 5 — extend the system to care history, profile, and identity

**Primary files:** `src/app/(app)/pets/**`, `src/components/record-form.tsx`, `src/components/pet-form.tsx`, `src/components/photo-picker.tsx`, `src/components/pet-share-studio.tsx`, `src/components/qr-code.tsx`.

1. Treat health history as an editorial timeline on the warm ground: strong date anchors, flat events, quiet metadata, and clear source/freshness labels.
2. Use the record form as the reference form composition, with progressive disclosure and consequence copy adjacent to the relevant control.
3. Let the pet profile and diary carry more photography and Fraunces than health forms, but reuse the same surface and spacing tokens.
4. Keep one expressive hard-offset or asymmetric treatment on the generated/shareable keepsake, not on the settings surrounding it.
5. Make privacy controls update the preview immediately and preserve a text equivalent of every visible shared field.
6. Keep lost mode serious, flat, and explicit; no annotated text, count animation, decorative success motion, or playful geometry.

**Gate:** direct record retrieval, edit, export, share, copy, download, lost-mode activation/deactivation, and all failure paths work in local/offline conditions supported by the product.

### Phase 6 — align discovery and secondary surfaces

**Primary files:** `src/app/(app)/explore/**`, `src/app/(app)/community/**`, `src/app/(app)/products/page.tsx`, `src/components/place-card.tsx`, `src/components/place-map.tsx`, `src/components/post-card.tsx`, `src/components/product-card.tsx`.

1. Consolidate the repeated Discovery tabs into one owned component with roving focus and shared responsive behavior.
2. Remove default card lift from places, posts, and products; reserve elevation for the currently selected map result or an open overlay.
3. Keep places list-first and make suitability, source, and freshness easier to scan than photography.
4. Keep community and products visually separated from care. Partner surfaces must never reuse health success or warning color language.
5. Use hover enhancement only as an optional desktop affordance; touch and keyboard states must be complete without it.

**Gate:** filters, list/map toggle, selection, source/freshness, sponsorship, report/block, and external-link boundaries are visible and accessible; no secondary content appears between urgent care tasks.

### Phase 7 — remove residue and verify the complete system

**Primary files:** all touched routes/components, tests, `src/components/aurora-background.tsx`, `package.json`, `pnpm-lock.yaml`.

1. Remove unused WebGL/aurora code and the `ogl` dependency only after proving no remaining import or runtime use.
2. Replace one-off radius, shadow, rotation, and color stacks with the approved primitives or document the intentional exception.
3. Audit bundle impact and lazy boundaries; no decorative component may enter the operational shell's initial bundle.
4. Run the full interaction, accessibility, responsive, theme, offline, and performance matrix.

**Gate:** `rg` finds no unapproved hard-offset shadows, arbitrary operational radii, WebGL/aurora imports, or second animation engine; full local gates pass with captured exit status.

---

## 4. Component adoption details

| Owned component        | Inspiration                | Proposed API boundary                                                                                 | Initial consumer                                  |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `OnboardingStepper`    | React Bits Stepper         | `step`, `total`, `direction`, `titleId`, `children`; no business data inside                          | `src/app/onboarding/page.tsx`                     |
| `AccessibleCountSwap`  | React Bits Count Up        | current/previous number, formatter, duration capped at 180ms; separate visually hidden final value    | Today and Agenda summaries                        |
| `SelectableOptionList` | React Bits Animated List   | semantic items, active id, onSelect, optional keyboard navigation; no fixed-height requirement        | Pet switcher after list-size threshold is defined |
| `AnnotatedPhrase`      | Componentry Annotated Text | inline phrase, one approved variant, token color, `animateOnce`; decorative SVG/canvas hidden from AT | Welcome only                                      |
| `StatefulListItem`     | React Bits motion pattern  | keyed enter/exit for one mutated item; static reduced-motion path                                     | Reminder completion/undo                          |

Do not create these abstractions before the first consumer is implemented. If the first use remains one-off, keep the code local and extract only after a second proven use.

---

## 5. Dependency policy

- Reuse `motion`, `@base-ui/react`, `lucide-react`, Sonner, Tailwind, and existing owned primitives.
- Do not run the Componentry or React Bits installer as a default step. Inspect the exact source and license, then copy only the minimum implementation if it is materially better than a small owned component.
- Do not add GSAP for Fade Content. Recreate the approved 4px/opacity transition with `motion`.
- Do not add a new component library for tabs, drawers, fields, or buttons.
- Do not add WebGL or cursor-effect dependencies.
- Any dependency change is a separate reviewed diff with bundle evidence and lockfile validation.

---

## 6. Verification matrix

### Automated gates

Run serially on Windows and capture the final exit code for each:

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
git diff --check
```

Add focused component tests for:

- Stepper focus, Back preservation, validation, final completion, and reduced motion;
- direct reminder completion, undo, postpone, reschedule, and failure recovery;
- count swap final accessible value and reduced-motion behavior;
- pet switcher keyboard selection and announcement;
- bottom sheet focus trap, return focus, Escape, scroll bounds, and safe-area padding;
- light/dark token roles and theme toggling without animated color flashes.

### Rendered QA

Check at 320, 375, 768, 1024, and 1440px, plus landscape and 200% zoom:

1. Welcome.
2. Every onboarding step, including errors and Back.
3. Today with overdue/today/upcoming/empty/all-pets/single-pet states.
4. Agenda filters, completion, undo, and postpone sheet.
5. Record creation with simple and expanded fields.
6. History, diary, documents, and missing-entity recovery.
7. Pet card privacy preview, share/download failure, and lost mode.
8. Explore list/map/filter/detail and permission denial.
9. Community empty/moderation states and product sponsorship boundaries.
10. Loading, hydration, offline, service-worker update, storage failure, not-found, and unexpected error.

For each important flow, verify keyboard order, focus visibility, live regions, screen-reader labels, reduced motion, forced colors, console errors, `scrollWidth`, fixed-element overlap, and touch target geometry.

### Visual acceptance rule

A screen is ready only when the task hierarchy remains clear in grayscale. Color, photography, motion, and decorative geometry may strengthen meaning but cannot create it.

---

## 7. Recommended pull-request sequence

1. **Prerequisites:** lockfile and hydration reliability, with no visual changes.
2. **Foundation:** tokens and owned primitives, with fixture coverage.
3. **Shell:** navigation, headers, overlays, global states.
4. **Core care:** Today, Agenda, reminder actions, pet switcher, Care Halo.
5. **Activation:** Welcome and onboarding stepper/annotation trial.
6. **History and identity:** records, profile, diary, documents, card, lost mode.
7. **Discovery:** places, community, products, shared tabs/cards.
8. **Cleanup and QA:** remove unused visual code/dependencies, responsive/accessibility/performance sweep.

Each PR should include before/after screenshots for the affected states, the relevant automated gates, and a note separating source/configuration, rendered UI, local behavior, and anything not yet proven in deployment.
