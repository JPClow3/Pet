# PetHub UI/UX Design Specification

**Status:** Refined product design direction for implementation planning  
**Date:** 15 September 2026  
**Primary market:** Brazil, Portuguese (pt-BR)  
**Platform:** Mobile-first responsive PWA  
**Design intent:** A calm daily care companion for the whole life of a pet

> This document defines the target experience. It preserves the validated product capabilities, four-destination information architecture, and useful foundations already present in the app, while refining hierarchy, visual language, interaction behavior, and component ownership where the current implementation diverges from that target.

---

## 1. Executive direction

### Product promise

**“O cuidado de hoje. A história inteira do seu pet.”**

PetHub should not feel like a pet shop, a social network with a health tab, or a veterinary ERP. It should feel like the one dependable place where a tutor can answer:

1. Which pet am I looking after?
2. What needs attention now?
3. What is the safest next action?
4. Where can I find the history later?

The primary loop is:

**See what needs attention → act or reschedule → receive clear confirmation → preserve the history.**

Identity, health, reminders, diary, and the shareable pet card form the trusted core. Places, community, and products are secondary layers that must never compete with urgent care on the first screen.

### Experience thesis

- Calm before breadth: one clear next action is more valuable than a dashboard of features.
- Pet context is always visible: the user must never wonder which pet a record belongs to.
- Actions create history: completing care should update both the agenda and timeline.
- Trust is visible: source, timestamp, privacy, freshness, and limitations appear where decisions are made.
- Warm, not childish: affection comes from photography, language, and small moments—not cartoon clutter.
- Useful offline: local records remain understandable and editable without pretending network features are available.

### Scope order

1. **P0 — trusted personal care:** onboarding, multi-pet context, Today, care agenda, health history, diary, documents, shareable pet card, privacy, offline/storage states.
2. **P1 — local utility:** places list, structured pet-specific filters, map toggle, weight trend, refined exports.
3. **P2 — network services:** accounts, sync, family roles, push, updateable public identity, live community, moderation, verified reviews.
4. **P3 — commerce and intelligence:** transparent partner recommendations and a non-clinical assistant after trustworthy data exists.

---

## 2. Research basis

### Method

This direction combines:

- analysis of the product brief and domain capabilities, excluding its visual design;
- inspection of the current PetHub repository and rendered Welcome surface;
- a September 2026 benchmark of Brazilian and international pet apps;
- a focused style study of Finn, Luffu, and August Health EHR in Refero Styles;
- a component-fit review of Componentry and React Bits against PetHub's mobile, accessibility, and performance constraints;
- mobile navigation, accessibility, status-message, and permission-request conventions;
- official guidance for Next.js App Router, shadcn/ui, HeroUI (formerly NextUI), and React Bits.

App-store reviews were used only as directional signals. They are not controlled usability research and should be validated through PetHub interviews and task testing.

### Competitor synthesis

| Product       | What it validates                                                                                        | What PetHub should learn                                                     | Gap PetHub can own                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Petlove       | Brazilian demand for profiles, reminders, health, services, subscriptions, and commerce in one ecosystem | Local relevance and connected service status matter                          | Keep care primary and promotions visibly separate                  |
| 11pets        | Deep records, recurring preventive care, measurements, exports, multi-pet support, and caregiver sharing | A complete history is valuable                                               | Make entry and retrieval action-led instead of taxonomic and dense |
| PetDesk       | Provider-connected records, appointments, refills, labs, and reminders                                   | Put provider actions beside the relevant record                              | Always disclose source, freshness, and provider dependency         |
| Pawp          | One prominent “Get care” action, ongoing plans, reminders, and reassurance                               | Urgent experiences need calm language and a single next step                 | Organize owner-provided data without pretending to diagnose        |
| Rover         | Focused search → trust → booking → updates → review journey                                              | Verification, progress, communication, and incident support build confidence | Pet-specific suitability should outrank generic star scores        |
| Tractive / Fi | First-class lost mode, active pet switching, status timelines, and public/family sharing                 | Emergency mode needs a distinct visual state and fast sharing                | Offer a privacy-controlled card without implying GPS tracking      |
| Chewy         | Pet profiles power personalization, recurring purchases, and health services                             | Explain why personalization occurred                                         | Keep commercial logic out of health truth and overdue tasks        |
| Petcube       | Progressive pet profiling, event timelines, reminders, and health services                               | Event-based history is easier to scan than folders                           | Avoid false urgency, intrusive upsells, and opaque automation      |

### Repeated market failure patterns

1. Critical history appears stale, incomplete, or impossible to correct.
2. “All in one” becomes “everything everywhere,” especially on Home.
3. Commercial cards look like care advice.
4. Alert timing and data provenance are unclear.
5. Subscription cadence or cancellation appears too late.
6. Provider participation is hidden, so records look more complete than they are.
7. App migrations and account issues threaten emotionally important history.
8. Marketplace trust is reduced to stars without verification or incident support.

### Strategic opportunity

PetHub can own **the calm daily home for a pet’s life**: private by default, fast on a phone, honest about offline/local data, and unusually clear about what requires attention.

### Reference translation — inspiration, not imitation

The reference pass sharpens PetHub's existing direction instead of replacing it. Each source contributes one useful idea; no source is adopted as a complete skin.

| Reference                    | Useful signal                                                                                                 | PetHub translation                                                                                                 | Deliberately not copied                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Refero — Finn                | Warm near-black type, friendly pet photography, color fields, hairlines, and almost no elevation              | Keep an affectionate pet tone, but separate surfaces primarily with canvas, white, and one quiet tint              | Ecommerce pills on every control, oversized condensed display type, product-color zoning                         |
| Refero — Luffu               | A family almanac feeling, warm paper ground, restrained palette, generous negative space, editorial hierarchy | Make history, diary, and pet identity feel collected and durable rather than dashboard-like                        | Six-pixel rectilinear controls, single-weight UI type, full-bleed marketing photography inside operational flows |
| Refero — August Health EHR   | Warm-clinical cream, serif/sans pairing, a single saturated action color, and layered surfaces                | Let care screens feel trustworthy without becoming sterile; reserve saturated blue/teal for real actions and state | Decorative gradients, many accent categories, pill treatment on every interactive element                        |
| Componentry — Annotated Text | A hand-drawn mark can add human warmth and respects reduced-motion preferences                                | Permit one short, non-essential underline/highlight on Welcome, drawn once and static afterward                    | Cross-outs, arrows, or annotations on clinical copy, dates, warnings, navigation, or form labels                 |
| React Bits — Stepper         | Clear progress, controlled step transitions, completion callback, and owned source                            | Adapt the pattern for onboarding with semantic step text, preserved drafts, and existing `motion`                  | Clickable progress indicators that skip required context or replace native headings                              |
| React Bits — Animated List   | Keyboard navigation and selection can make dense lists feel responsive                                        | Borrow selection/focus behavior for the pet switcher and long pickers; keep native list/button semantics           | A fixed-height novelty list for the agenda or history; care items must remain document content                   |
| React Bits — Count Up        | State-linked number interpolation can acknowledge a completed action                                          | Use only for small, non-critical summary counts after a user action; announce the final value immediately          | Counting dates, doses, warnings, or every metric on page load                                                    |

### Taste decision

The refined direction is **Calm Care Editorial**. PetHub keeps its ivory ground, deep navy ink, cobalt brand anchor, care teal, coral warmth, and sunny highlight, but stops showing all of them at once. The visual hierarchy should come from typography, spacing, pet photography, and surface temperature before decoration.

The operational app is calmer than Welcome. Welcome may carry one memorable editorial gesture; Today, care forms, reminders, lost mode, and public identity prioritize legibility, consequence, and trust.

---

## 3. Users and jobs

### Primary personas

| Persona                       | Core job                                            | Anxiety                                         | Design response                                                     |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Busy preventive caregiver     | “Tell me what each pet needs today.”                | Forgetting a dose or vaccine                    | All-pets attention summary, complete/snooze, controlled reminders   |
| Health-history organizer      | “Help me reconstruct the story before a vet visit.” | Missing or scattered documents                  | Unified chronological timeline, filters, source labels, export      |
| Chronic/senior-care caregiver | “Make repeated care reliable.”                      | Duplicate, late, or ambiguous medication events | Explicit recurrence, dose context, durable history, low-error forms |
| Anxious caregiver during loss | “Help someone identify and contact me now.”         | Sharing too much or wasting time                | Card in two taps, privacy preview, serious lost-mode treatment      |
| Local explorer                | “Find somewhere suitable for this pet.”             | “Pet-friendly” claims lacking detail            | List-first discovery and structured pet-specific attributes         |
| Community participant         | “Get credible local experience safely.”             | Spam, misinformation, or exposure               | Contextual groups, visible safety tools, clinical boundary copy     |

### Future persona

Shared-household caregivers need roles, synchronized completion, attribution, and conflict handling. Do not simulate this with local-only state. It belongs after accounts and server synchronization.

### Top jobs to be done

- Create a useful pet profile without completing a long form.
- Record a vaccine, medication, appointment, exam, weight, or observation quickly.
- Know what is overdue, due today, or coming next.
- Complete, postpone, reschedule, skip, or stop a recurring care item confidently.
- Show a chronological history to a professional.
- Capture a private memory without creating a social post.
- Share only selected identity/contact information through a pet card.
- Find a nearby place that fits this pet’s size, needs, and environment.

---

## 4. Experience principles

1. **Today, not dashboard.** Prioritize decisions and tasks, not feature tiles.
2. **One pet, one context.** Active-pet identity remains visible; forms never silently switch pets.
3. **Fast capture, detailed editing.** Ask only what is needed to save; reveal advanced fields afterward.
4. **History is durable.** Completion adds an event instead of erasing the task that created it.
5. **Private by default.** Diary, health, location, and contact sharing require explicit choices.
6. **Truth over theatre.** Show local, cached, imported, shared, pending, and stale states honestly.
7. **The interface explains the consequence.** “Completing creates the next dose for 14 Oct” is better than a generic confirmation.
8. **Gestures are optional accelerators.** Every swipe action also has a visible button.
9. **Network layers earn attention.** Community and products do not occupy the trusted care surface until useful.
10. **Motion confirms; it does not entertain during care or emergencies.**

---

## 5. Information architecture

### Mobile navigation

Use four persistent bottom destinations. This reduces competition at the smallest width and keeps the product’s core loop obvious.

| Destination   | Purpose                                                        | Default view                 |
| ------------- | -------------------------------------------------------------- | ---------------------------- |
| **Hoje**      | Cross-pet attention and the next useful action                 | All pets, grouped by urgency |
| **Cuidados**  | Agenda, history, diary, documents, and pet profile             | Active pet                   |
| **Descobrir** | Places first; community and partner products as secondary tabs | Locais                       |
| **Perfil**    | Tutor, pets, notifications, privacy, storage, export, account  | Settings overview            |

Persistent global controls:

- **Pet switcher:** avatar + name in the top bar of pet-dependent screens.
- **Inbox:** top-right bell; meaningful unread count only.
- **Adicionar:** contextual floating action on Hoje and Cuidados; a button, never a fifth destination.
- **Lost-mode banner:** persistent across signed-in/local app surfaces while active.

Why Community is not a primary tab: a live community requires accounts, synchronization, moderation, abuse handling, and sufficient local density. Until those exist, it is a secondary discovery surface. If later research proves daily social use, it can earn a fifth destination without restructuring the core.

### App tree

```text
Hoje
├── Todos os pets / pet ativo
├── Atrasados
├── Hoje
├── Próximos
├── Ações rápidas
├── Carteirinha / modo perdido
└── Prévia contextual de Descobrir

Cuidados
├── Agenda
├── Histórico
│   ├── Saúde
│   ├── Peso
│   └── Documentos
├── Diário
└── Perfil do pet
    ├── Identidade
    ├── Carteirinha
    ├── Privacidade
    └── Editar

Descobrir
├── Locais
│   ├── Lista / mapa
│   ├── Filtros
│   └── Detalhe do local
├── Comunidade
│   ├── Feed / grupos
│   ├── Post / comentários
│   └── Criar / denunciar / bloquear
└── Produtos
    ├── Recomendações explicadas
    └── Parceiro externo

Perfil
├── Tutor
├── Gerenciar pets
├── Notificações
├── Cidade e localização
├── Privacidade e compartilhamento
├── Armazenamento e offline
├── Exportar dados
└── Excluir dados / conta
```

### Navigation rules

- Browser/app Back always returns to the previous logical surface and preserves scroll, filters, drafts, and selected pet.
- A deep link must identify the affected pet before content.
- **Todos os pets** exists only on Hoje and Agenda. History, diary, documents, card, and forms always use one pet.
- The floating Add action opens a bottom sheet of relevant record types. It does not navigate to a generic creation hub.
- Notifications deep-link to the affected pet and object.
- Products never appear between overdue/today care tasks.

### Multi-pet switching contract

- The avatar/name control opens a bottom sheet with each pet's photo, name, species, and overdue/today attention count.
- The sheet ends with **Adicionar pet** and **Gerenciar pets**; these are actions, not selectable pet rows.
- **Todos os pets** appears only on Hoje and Agenda. In that mode, Care Halo becomes a labeled cross-pet attention summary without a singular pet photo.
- A singular pet selection persists across sessions and is reused when the user opens Cuidados. If there is no prior selection, Cuidados opens the pet chooser instead of choosing silently.
- A deep link activates the referenced pet before rendering its record and announces the context change.
- Forms lock their pet context. Tapping the switcher with a dirty form offers **Salvar rascunho e trocar**, **Continuar editando**, and a low-emphasis discard action.
- Switching pets preserves the current tab. It resets object-specific selections that do not belong to the new pet and explains the reset when necessary.
- No aggregate health claim is shown for Todos os pets; counts and task labels remain attributable to individual pets.

### Tablet and desktop adaptation

- **768–1023 px:** bottom bar becomes a compact navigation rail; list/detail may appear side by side.
- **1024 px+:** 232px persistent side rail, main content capped at 1200px, optional contextual right pane.
- Desktop adds simultaneous context, not extra destinations or different terminology.
- Forms remain at a readable maximum width of 640px.

---

## 6. Critical journeys

### 6.1 First-run activation — under 90 seconds

Goal: create one pet and one meaningful care item without requesting premature permissions.

1. **Welcome**
   - Headline: “A vida do seu pet, organizada sem complicação.”
   - Support: “Cuidados, lembranças e carteirinha em um lugar só.”
   - Primary CTA: **Começar**.
   - Secondary: **Já uso o PetHub** only after real accounts exist.
   - Trust note: “Você controla o que fica privado e o que é compartilhado.”
2. **Pet essentials**
   - Required: name and species.
   - Optional: photo.
   - CTA: **Continuar**.
3. **Useful detail**
   - Ask one branching question based on species: birthday/approximate age or last vaccine date.
   - Every field is skippable; “Completar depois” is plain text.
4. **First care item**
   - Offer: “Tenho uma data para registrar” or “Agora não.”
   - If chosen, capture one P0 health/routine event and optional reminder inline.
   - Places and Community are introduced only when those later-phase surfaces are available.
5. **First quick win**
   - Land on Today with the new real item already visible.
   - If the user skipped, show the genuine guided empty state and **Registrar primeiro cuidado**.

Completing onboarding does not require the care item, but product activation does: pet created + one real record or reminder.

Do not request notification or precise location during onboarding. Ask for notifications after a reminder is created, and location only after **Usar minha localização** is tapped.

### 6.2 Record care and create a reminder

1. Tap **Adicionar**.
2. Choose from two scannable groups. **Prevenção:** Vacina, Vermífugo, Antiparasitário, Medicamento. **Acompanhamento:** Consulta, Exame, Peso, Observação.
3. Form reveals only relevant fields.
4. Date defaults to today but is visibly editable.
5. “Lembrar novamente?” is optional and off until the user sets a date or recurrence.
6. Review line states the consequence: “Vamos lembrar 30 dias antes, em 20 ago.”
7. Validate, serialize, and durably persist the record before announcing success. The button may show pending feedback, but not a success check while the write can still fail.
8. Inline success: “Vacina registrada para Luna.” Offer **Ver histórico** and a short **Desfazer** toast. If persistence fails, keep the complete draft and isolate any failed attachment.

Medication is not a generic text record. Its data contract requires medication name, dose value/unit, frequency or specific times, start/end dates, instructions, and optional professional/source. If that structure is not implemented, the UI must not promise a reliable medication schedule.

Never fabricate the next dose or infer clinical advice. Suggestions must be labeled and require confirmation.

### 6.3 Complete or postpone care

- Task row exposes **Concluir** and **Adiar**; swipe is optional.
- Conclude changes the row in place, updates counts, and moves it into a collapsed completed group.
- If recurring: “Ao concluir, o próximo cuidado será criado para 14 out.”
- Undo remains available for 6 seconds.
- Adiar opens a sheet with **Mais tarde**, **Amanhã**, **Próxima semana**, and **Escolher data**.
- **Pular esta vez** and **Parar repetição** live under More and explain their effect.
- Copy says “agenda em dia,” never “pet saudável.”

Mutation semantics:

- **Adiar notificação** changes only when the user is reminded; it does not rewrite the clinical/event due date.
- **Reagendar cuidado** changes the due date after showing the old and new date.
- **Pular esta vez** records an exception for the current occurrence and preserves the recurrence series.
- **Parar repetição** closes the series from now on and preserves all history.
- **Desfazer conclusão** atomically removes the completion event and any successor occurrence generated by that completion.

### 6.4 Share the pet card

1. Open pet switcher or card shortcut.
2. Tap **Carteirinha**.
3. Preview the exact public fields.
4. Adjust privacy controls with immediate preview.
5. Show a large QR plus **Compartilhar**, **Copiar dados/link**, and **Baixar QR**.

Truth boundary: with the local payload model, this is a **shareable snapshot card**. A previously printed QR cannot receive changed contact or lost-mode information. A first-time recipient still needs the hosted application shell even when pet data is encoded in the URL, so opening the card is not guaranteed offline. Do not call it an updateable smart tag until a stable server-backed identifier exists.

### 6.5 Activate lost mode

1. Select the pet.
2. Confirm contact method.
3. Add an optional short note.
4. Preview what a stranger will see.
5. Explicitly activate.
6. Show a persistent serious banner: “Modo perdido ativo para Luna” with **Compartilhar** and **Desativar**.

No confetti, playful bounce, ambiguous close icon, or color-only warning. Activation may use one restrained vibration where supported.

### 6.6 Find a suitable place

1. Descobrir opens on a useful list, not an empty map.
2. Search asks: “Onde vocês querem ir?”
3. Category chips: Veterinário, Parque, Café, Banho e tosa, Hospedagem, Passeador.
4. User explicitly taps **Perto de mim** before a location prompt.
5. Permission denial immediately offers city/neighborhood entry.
6. Cards foreground distance, verification, freshness, open status, and pet-specific attributes.
7. Detail shows suitability signals before free-text reviews.
8. Route/contact actions disclose when they open another app.

“Aberto agora” always carries a data source or “atualizado às 14:20.” Stale or seeded data never looks verified.

This trust model requires `sourceName`, optional `sourceUrl`, `updatedAt`, structured opening hours/time zone, phone/website, `verificationMethod`, and `verifiedAt` in addition to coordinates and attributes. Until those fields or integrations exist, render only supported static details and directions from coordinates; do not render “Aberto agora,” current contact, or a verified badge.

### 6.7 Capture a memory

- Diary composer begins with photo or text and can be saved with one meaningful field.
- Date defaults to today; tags, place, and weight are secondary.
- P0 diary entries are private-only. A local `public` flag must not imply that anyone else can see the entry.
- After accounts, synchronization, and moderation ship, a separate **Publicar na comunidade** action may be added with the disclosure: “A publicação não inclui dados de saúde automaticamente.”
- Draft auto-saves locally and survives closing the sheet.

---

## 7. Screen specifications

### 7.1 Welcome

**Goal:** communicate value and trust in one viewport.  
**Anatomy:** compact wordmark, one pet photograph, headline, two-line support, primary CTA, privacy reassurance.  
**Signature moment:** a quiet “care orbit” line draws once around the pet portrait; it becomes static under reduced motion.  
**Avoid:** feature carousel, animated particles, testimonial slider, permission prompt, sign-up wall before value.

### 7.2 Hoje

**First 5 seconds must answer:** pet context, urgency, next action.

Order:

1. Top bar with greeting, active pet/all-pets selector, inbox.
2. **Care Halo** summary: plain status (“2 cuidados hoje”), pet image, nearest due date.
3. Atrasados, then Hoje, then Próximos.
4. Quick actions: Registrar cuidado, Peso, Diário, Carteirinha.
5. One recent memory or local suggestion—not both if tasks are overdue.
6. Add button above the safe-area-adjusted bottom bar.

When there are overdue items, remove promotional/community previews entirely.

### 7.3 Cuidados — Agenda

- Segmented control: Agenda / Histórico / Diário.
- Date groups: Atrasados, Hoje, Próximos 7 dias, Depois.
- Filter by pet only when entered from Todos os pets.
- Month calendar is deferred; a chronological list is easier on mobile and for assistive technology.
- Completed items are collapsed but retrievable.

### 7.4 Cuidados — Histórico

- One timeline combines vaccines, medication, consultation, exam, weight, observation, and documents. Diary remains its own primary Cuidados tab so memories do not compete with the operational record.
- Each event shows type, date, source, attachment indicator, and relevant next date.
- Filters: type, period, attachments.
- Search is added only when histories are large enough to justify it.
- Detail actions: Editar, Compartilhar/exportar, Excluir.
- Weight opens a simple trend chart plus an equivalent data list; no diagnostic ranges unless entered by a professional and clearly sourced.

### 7.5 Pet profile

- Hero: large photo, name, age, species/breed, edit.
- Operational cards: identity, care summary, weight, documents, card/privacy.
- Profile completion is framed as utility: “Adicione um contato para deixar a carteirinha útil,” not a gamified percentage.
- Pet deletion lists the affected local records before confirmation.

### 7.6 Record form

- Single column, visible labels, examples as placeholders only.
- Sticky bottom action with keyboard-safe spacing.
- Advanced details in an expandable section.
- Validate on blur and submit, not every keystroke.
- On submit failure, preserve every field and focus the error summary/first invalid field.
- Attachment failure is isolated; text can still be saved.

### 7.7 Carteirinha and public view

- Card preview and privacy controls appear together.
- Every toggle describes the actual exposed field.
- Public view emphasizes pet name, lost status, contact action, and optional owner-approved details.
- Invalid or unsupported-version payload reveals no raw data and offers a safe explanation. Expiry is not shown unless an explicit `expiresAt` contract is added.
- QR always has a copyable and downloadable alternative.

### 7.8 Descobrir — Locais

- Sticky search and category filters.
- List/Map toggle; list is always available.
- Cards: name, category, distance, verified/freshness, open state, 2–3 matching attributes.
- Map pins use the same selection state as the list.
- Empty result preserves filters and offers a clear reset or wider radius.
- Offline shows saved/seeded places with freshness and disables fresh route/open-status claims.

### 7.9 Descobrir — Comunidade

- Secondary tabs: Para você, Perto, Seguindo.
- Post types are explicit: Pergunta, Recomendação, Perdido/encontrado, Evento, Dica.
- Exact location is private by default.
- Health threads display: “Experiência da comunidade, não orientação veterinária.”
- Report, block, mute, and helpful-answer actions are visible and accessible.
- Lost/found posts use a serious high-contrast format.
- Until a real backend/moderation system exists, label the area as preview/demo and do not present seeded activity as live people.

### 7.10 Descobrir — Produtos

- Recommendations explain their basis: species, size, life stage, routine, or nearby partner.
- “Parceiro” or “Patrocinado” is adjacent to the CTA, not hidden below.
- External purchase is explicit.
- No checkout, stock, or delivery promises in the MVP.
- Users can disable commercial personalization and notifications independently.

### 7.11 Inbox

- Groups: Hoje and Anteriores.
- Types: prevenção, rotina, social, local, comercial.
- Commercial messages are visually labeled and opt-in.
- Each item deep-links to the affected object.
- Mark all read is available; dismissal offers Undo.
- In-app reminders must not be described as reliable background push until the platform can actually deliver them.
- Notification settings distinguish: in-app available; system notifications unsupported; permission not requested; permission denied; enabled; and PWA installation required where the platform imposes it.

### 7.12 Perfil and settings

Order by user concern:

1. Tutor and pets.
2. Notification preferences.
3. City and location.
4. Privacy and public-card defaults.
5. Storage/offline status.
6. Export data.
7. Appearance and accessibility.
8. Help, clinical disclaimer, terms, privacy.
9. Delete local data/account in a separated danger zone.

---

## 8. Visual system

### Direction: Calm Care Editorial

The interface combines health-product clarity with the warmth and permanence of a family almanac. Ivory, white, and quiet neutral surfaces do most of the structural work. Cobalt, care teal, coral, sunny yellow, and fresh green remain memorable domain cues, but a screen normally exposes one dominant accent plus semantic status colors. Emotional surfaces use natural pet photography and one editorial type accent; operational surfaces rely on calm spacing, strong labels, and explicit consequences.

The system should feel tactile without looking like a stack of stickers. Color fields, hairlines, and whitespace separate layers first. Soft elevation is reserved for floating navigation, sheets, menus, and the object currently being manipulated.

**Signature device — Care Halo:** a thin, segmented ring around the active pet image. It summarizes schedule state, not health diagnosis. Segments are always paired with nearby icon/text. On Today it can animate once when state changes; elsewhere it is static.

### Anti-directions

- No generic purple gradient SaaS dashboard.
- No cartoon paw pattern behind clinical content.
- No glassmorphism behind text or forms.
- No heavy claymorphism, deep blur, or inflated shadows.
- No dashboard grid of equal cards.
- No muted mint-and-beige blanket palette or interchangeable pastel cards.
- No decorative gradient blobs; prefer flat color fields, bold rails, and varied corner geometry.
- No repeated hard-offset shadows, rotated labels, or irregular corners across operational cards; one such gesture may appear on Welcome or a shareable keepsake.
- No screen that uses cobalt, coral, yellow, green, and violet as equal accents; choose one dominant accent and let semantic colors retain meaning.
- No emoji as navigation or structural icons.
- No decorative continuous animation in operational screens.

### Color tokens — light

| Token              | Value     | Use                                      |
| ------------------ | --------- | ---------------------------------------- |
| `background`       | `#FFF9EF` | Warm ivory app canvas                    |
| `surface`          | `#FFFFFF` | Cards, sheets, form surfaces             |
| `surface-subtle`   | `#F1F3F7` | Quiet neutral grouping                   |
| `foreground`       | `#17213A` | Deep navy primary text                   |
| `muted-foreground` | `#65708A` | Secondary text; verify AA at final sizes |
| `primary`          | `#006B5B` | Care actions and success-oriented flows  |
| `primary-hover`    | `#005447` | Hover/pressed darkening                  |
| `primary-soft`     | `#D7F7EB` | Selected/positive surfaces               |
| `brand`            | `#3457D5` | Navigation, onboarding, and brand anchor |
| `brand-soft`       | `#DFE6FF` | Discovery and account surfaces           |
| `accent`           | `#F2553F` | Emotional highlight and diary cues       |
| `accent-soft`      | `#FFE1D9` | Warm memory/identity surfaces            |
| `sun`              | `#FFD45C` | Today, emphasis, and friendly callouts   |
| `lime`             | `#AEE46D` | Positive momentum and community cues     |
| `info`             | `#3457D5` | Informational status                     |
| `success`          | `#247A4D` | Completed/saved status                   |
| `warning`          | `#8A5A00` | Due-soon text/icon                       |
| `warning-soft`     | `#FFF1CF` | Due-soon surface                         |
| `danger`           | `#B42318` | Overdue, destructive, lost mode          |
| `danger-soft`      | `#FDE7E5` | Error/lost-mode surface                  |
| `border`           | `#DCE1EA` | Dividers and controls                    |
| `focus`            | `#3457D5` | 3px focus ring with offset               |

`accent` is not used as small white-text button fill until contrast is verified; use dark foreground on `accent-soft` instead.

### Surface hierarchy and color budget

| Layer           | Default                    | Role                                                             |
| --------------- | -------------------------- | ---------------------------------------------------------------- |
| Ground          | `background`               | Warm paper-like app canvas; uninterrupted around major groups    |
| Reading surface | `surface`                  | Forms, task rows, sheets, and content that needs maximum clarity |
| Quiet group     | `surface-subtle`           | Secondary grouping, empty placeholders, and low-priority context |
| Domain wash     | one `*-soft` token         | One bounded section or selection state, never the page default   |
| Floating layer  | `surface` + `shadow-float` | Sheets, menus, floating action, and temporary navigation only    |

Per-screen rules:

- Use no more than one non-semantic accent family in the main content viewport.
- Status colors are not decoration. `success`, `warning`, and `danger` appear only when their meaning is present and always pair with text or iconography.
- Use tinted cards to group one concept, not to make every adjacent tile a different color.
- Brand cobalt owns navigation, onboarding, and the primary visual identity. Care teal owns care actions. When both appear, only one may be the filled primary action.
- Coral is emotional and personal: diary, identity, and selected moments. Yellow is a highlight, not a background default. Lime is a rare positive accent, not a fourth navigation color.

### Color tokens — dark

| Token                | Value     |
| -------------------- | --------- |
| `background`         | `#111729` |
| `surface`            | `#192137` |
| `surface-subtle`     | `#20283E` |
| `foreground`         | `#FFF8ED` |
| `muted-foreground`   | `#ABB3C8` |
| `primary`            | `#70E2C9` |
| `primary-foreground` | `#062A23` |
| `brand`              | `#9EB1FF` |
| `accent`             | `#FF826D` |
| `border`             | `#39415A` |
| `warning`            | `#FFD45C` |
| `danger`             | `#FF8A80` |
| `focus`              | `#9EB1FF` |

Test each text/background and state pair independently. Never assume light-mode semantics remain distinguishable in dark mode.

### Typography

- **Display/editorial:** Fraunces, used at regular or medium weight for the Welcome headline, pet names, history/diary section openings, and shareable keepsakes. It is never used for task metadata, dates, doses, controls, or long body copy.
- **UI/body:** Manrope, used for every operational label, form, task, number, and long text.
- Load through `next/font` with Portuguese glyph coverage and swap behavior.
- Use tabular numerals for dates, time, weight, and medication counts.

| Role    | Mobile                         | Desktop | Notes                                        |
| ------- | ------------------------------ | ------- | -------------------------------------------- |
| Display | 36/40, 500                     | 56/58   | Welcome/keepsake only                        |
| H1      | 30/34, 500 editorial or 700 UI | 38/42   | One per screen; choose one family by surface |
| H2      | 22/28, 600                     | 28/34   | Major sections                               |
| H3      | 18/24, 600                     | 20/26   | Cards/groups                                 |
| Body    | 16/24, 400                     | 16/25   | Default reading size                         |
| Label   | 14/20, 600                     | 14/20   | Controls and metadata                        |
| Caption | 12/17, 550                     | 13/18   | Never essential alone                        |

Editorial display copy uses tight optical tracking between `-0.035em` and `-0.02em`; operational Manrope remains between `-0.01em` and `0`. Uppercase eyebrows are limited to short section labels and use `0.08em–0.12em`, never the current poster-like treatment on every group.

### Spacing and geometry

- Base rhythm: 4px; common steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Mobile gutters: 16px at 320px, 20px from 375px.
- Tablet gutters: 24–32px. Desktop gutters: 32–48px.
- Touch targets: 48×48px preferred, 44×44px absolute minimum, 8px between adjacent targets.
- Standard card radius: 18px; featured/emotional card: 24px; controls: 14px; small chips: 999px; sheets: 28px top corners.
- Use pills only for compact selection/status, not every button and container.
- Standard cards are flat: a 1px hairline or a single surface shift, not both plus a shadow. Hover may change the border or surface but must not lift every card.
- Shadows are warm and quiet: `shadow-soft` for the current interactive object and `shadow-float` for overlays. Hard-offset sticker shadows are a Welcome/share-card exception, not a system token.
- Asymmetric radii, rotation, and offset outlines are restricted to a single signature composition per emotional surface. They do not appear on reminder rows, forms, settings, navigation, or health history.
- Z-index scale: content 0, sticky 10, bottom navigation 20, scrim 30, sheet/dialog 40, toast 50.

### Icons and imagery

- Use one Lucide icon family at 16, 20, and 24px with consistent 1.75–2px stroke.
- Active bottom-nav icons may use a filled container, not a different icon family.
- Meaningful icons have accessible names; decorative icons are hidden from assistive technology.
- Pet photography is natural, close, and specific. Avoid studio-perfect stock-photo grids.
- Prefer candid daylight, familiar home/outdoor settings, and eye-level crops. Marketing-style cutouts on saturated backdrops are reserved for Welcome, not records or identity.
- User photos keep a stable aspect ratio and never shift layout during load.

---

## 9. Component and library strategy

### Ownership rule

Do not run three overlapping component systems. Use one behavioral foundation and treat the others as pattern/source inspiration.

1. **Base UI is the behavioral foundation already present in the app.** Components remain owned in the repository. `components.json` stays on its Base UI-compatible style; never mix Base UI, Radix, and React Aria variants inside one primitive family.
2. **shadcn/ui is the source and composition convention.** Generate only missing primitives that use the project's configured base. Do not overwrite owned domain components or install parallel Button, Dialog, Tabs, Select, or Toast systems.
3. **Componentry is a narrow expressive reference.** Its Annotated Text pattern may inform one Welcome-only owned component after license/source review. Do not install its broader visual-effects stack.
4. **React Bits is a selective interaction/source reference.** Adapt Stepper, Animated List, and Count Up ideas into PetHub-owned components only where they improve a real task. Do not copy the library's dark demo styling.
5. **Motion is the single JavaScript animation engine.** It is already installed and wrapped in `MotionConfig reducedMotion="user"`. CSS and primitive-owned transitions handle simple color, opacity, and pressed feedback. Motion handles state-linked, interruptible, layout, and sequenced animation. Do not add GSAP or another animation engine.

### Recommended shadcn primitives

| Need                     | Primitive/composition                                             |
| ------------------------ | ----------------------------------------------------------------- |
| Mobile action/filter     | shadcn Drawer using the pinned Base UI primitive base             |
| Desktop equivalent       | Dialog or Popover selected by breakpoint                          |
| Destructive confirmation | AlertDialog                                                       |
| Forms                    | Native `<form>` or Next.js `<Form>` plus shadcn fields and inputs |
| Agenda/history modes     | Tabs or segmented control with roving focus                       |
| Feedback                 | Alert, Sonner toast, Progress, Skeleton                           |
| Pet switcher/search      | Command composition in a Drawer                                   |
| Overflow actions         | DropdownMenu                                                      |
| Long optional details    | Accordion/Collapsible                                             |
| Tooltip                  | Desktop hover/focus help only; never required on touch            |

### Domain components

- `AppShell`
- `BottomNavigation` / `NavigationRail`
- `PetContextSwitcher`
- `CareHalo`
- `AttentionSummary`
- `CareTaskRow`
- `TimelineEvent`
- `QuickAddSheet`
- `RecordForm`
- `PetIdentityCard`
- `PrivacyPreview`
- `LostModeBanner`
- `PlaceResultCard`
- `PetSuitabilityList`
- `CommunityPost`
- `RecommendationCard`
- `OfflineStatus`
- `EmptyState`
- `ErrorState`
- `SkeletonBlueprint`

Every domain component owns its normal, loading, empty/absent, error, disabled, focus, pressed, selected, and reduced-motion behavior where applicable.

### Componentry and React Bits adoption matrix

| Pattern                                                             | Decision                    | PetHub-owned use                                                       | Requirements                                                                                                                                                                          |
| ------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Componentry Annotated Text                                          | Trial                       | One short underline or highlight in the Welcome value proposition      | Decorative mark is `aria-hidden`; one draw only; final state renders immediately under reduced motion; verify source license before copying any code                                  |
| React Bits Stepper                                                  | Adopt the interaction model | Onboarding progress and step transitions                               | Real headings and step text remain in the DOM; required context cannot be skipped; Back preserves fields; focus moves to the new `h1`; use existing `motion` only                     |
| React Bits Animated List                                            | Borrow selectively          | Pet switcher and other bounded option pickers                          | Keep semantic `<ul>`/`button` structure, visible focus, Home/End/arrow behavior only when it does not conflict with native scrolling; do not use for the agenda/history document flow |
| React Bits Count Up                                                 | Trial                       | Today/Agenda summary count after completion, undo, or filter change    | Maximum 180ms; final accessible text is immediate; no mount-time theatre; disabled under reduced motion; never animate dates, doses, or danger copy                                   |
| Fade/Animated Content                                               | Recreate minimally          | 4px + opacity entrance for a newly inserted row or first-success panel | Existing `motion`; no GSAP; no blur on operational content; no scroll-triggered reveal for ordinary reading                                                                           |
| Spotlight, tilt, glare, magnetic, cursor, shader, aurora, particles | Reject                      | None                                                                   | These make a care tool feel promotional, are pointer-biased, add motion cost, and compete with urgency/status hierarchy                                                               |

### Delight budget

- Welcome may use one expressive device: either the annotated underline or one static organic composition, not both plus a shader.
- Onboarding may animate the step container and progress indicator; no decorative background animation.
- Operational screens may animate only the object whose state changed, its summary count, and the transient confirmation.
- A viewport may contain at most one autonomous animation. Loading indicators and user-triggered transitions do not count, but they still honor reduced motion.
- Remove or leave unused any WebGL/aurora background from production bundles. PetHub does not need OGL for its core experience.

---

## 10. Interaction and motion

### Motion tokens

| Token      | Duration  | Use                           |
| ---------- | --------- | ----------------------------- |
| `instant`  | 80–120ms  | Pressed opacity/color         |
| `fast`     | 140–180ms | Chips, checkmarks, count swap |
| `standard` | 180–240ms | Pet crossfade, list insertion |
| `sheet`    | 220–280ms | Drawer/sheet open and close   |
| `delight`  | 320–420ms | First-success moment only     |

- Standard ease: `cubic-bezier(0.2, 0, 0, 1)`.
- Exit is 15–20% faster than entry.
- Press feedback never shifts surrounding layout.
- Loading shimmer is static or removed under reduced motion.
- Reduced-motion mode uses instant opacity/state swaps and preserves all feedback.
- Blur is not an operational transition. Use opacity plus at most 4px of movement.
- Page-load entrances are not repeated on Back navigation or restored scroll positions.
- Motion never delays when a button becomes usable or when final state text becomes available to assistive technology.

### Microinteractions

| Event              | Visual response                                                                  | Semantic response                                    |
| ------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Button press       | Immediate fill/opacity change                                                    | Native button state                                  |
| Switch pet         | 180ms crossfade + 4px slide                                                      | Polite announcement: “Exibindo cuidados de Luna”     |
| Complete care      | Check resolves, row settles into completed group, count swaps over at most 180ms | Polite “Cuidado concluído”; Undo available           |
| Add timeline event | New row receives a 1.2s soft highlight                                           | Focus/scroll only if user requested “Ver histórico”  |
| Change filter      | Result count fades between values                                                | “12 locais encontrados” status message               |
| Save locally       | Small persistent check beside title                                              | “Salvo neste aparelho”                               |
| Lose connection    | Announce once, then collapse to a compact status indicator                       | Expand on a network surface or failed network action |
| Activate lost mode | Serious color/state transition; optional 20ms vibration                          | Assertive confirmation and persistent banner         |
| Error              | Field/surface highlights without shake                                           | Error summary and associated descriptions            |

Haptics/vibration are progressive enhancement only. Use them for completion and lost-mode activation, never every tap.

### Motion implementation boundary

- Use CSS transitions for hover, focus, pressed, and simple disclosure affordances.
- Use `motion/react` only for onboarding step replacement, keyed pet-context crossfade, list insertion/removal after a mutation, and the optional count interpolation.
- `AnimatePresence` wraps the smallest changing region, never the entire page shell.
- Layout animation is disabled for long agenda/history lists to avoid unexpected content travel; animate the changed row and let the rest reflow instantly.
- Every owned motion component exposes a static rendering path and is covered with a reduced-motion test.

---

## 11. Feedback model

### Choose feedback by consequence

- **Inline status:** durable state attached to the object, such as saved locally, uploaded, stale, overdue.
- **Toast:** brief confirmation for a reversible action; include Undo when possible.
- **Banner:** cross-screen condition such as offline, lost mode, storage pressure, or degraded service.
- **Alert:** section-specific explanation that requires attention but not interruption.
- **Dialog:** destructive or irreversible action with meaningful consequence.
- **Progress:** user-initiated work that takes measurable time, such as export or media processing.
- **Skeleton:** initial or sectional read loading where final geometry is known.
- **Spinner:** compact indeterminate action inside a control; never a whole blank page.

### Save-state vocabulary

| State                 | Copy                                                       |
| --------------------- | ---------------------------------------------------------- |
| Local save            | “Salvo neste aparelho”                                     |
| Draft                 | “Rascunho salvo”                                           |
| Network pending (P2+) | “Aguardando conexão”                                       |
| Media upload (P2+)    | “Enviando foto… 45%”                                       |
| Success               | “Registro adicionado ao histórico de Luna”                 |
| Stale external data   | “Atualizado há 2 dias”                                     |
| Failure               | “Não foi possível salvar a foto. Seu texto continua aqui.” |

Avoid “Sucesso!”, “Algo deu errado,” and unexplained error codes.

### Optimistic action rules

- Safe, reversible local actions may render an immediate pending state, but announce success only after durable persistence; then offer Undo.
- Destructive, financial, privacy-expanding, or network-ambiguous actions wait for confirmation.
- If an optimistic action fails, restore the prior state and explain what was not saved.

---

## 12. State contract

| State                   | Required treatment                                                              |
| ----------------------- | ------------------------------------------------------------------------------- |
| Client-store hydration  | Bounded hydration gate restores persisted pets, then resolves to ready or empty |
| Section loading         | Skeleton only in that section; surrounding controls stay interactive            |
| Action pending          | Disable only the submitted action, preserve label width, show compact progress  |
| Empty                   | Explain value, one primary action, optional example; never a mascot alone       |
| Search has no results   | Keep query/filters, show why, offer reset or wider area                         |
| Error                   | Human cause, retry, alternative path, preserved input                           |
| Partial failure         | Render healthy sections; isolate failed section and retry                       |
| Offline                 | Announce once, then compact status; expand on network surfaces or failed action |
| Permission not asked    | Contextual benefit copy before browser prompt                                   |
| Permission denied       | Manual fallback plus settings recovery path                                     |
| Success                 | Inline durable confirmation; toast only when useful                             |
| Disabled                | Visible reason near the control; native disabled semantics                      |
| New account/pet         | Guided first action inside the real destination                                 |
| Storage pressure        | Usage explanation, media cleanup options, export path                           |
| Storage quota failure   | Preserve text/metadata, identify failed media, offer retry/compression          |
| Corrupt local data      | Stop writes, offer non-destructive raw export/recovery before any reset         |
| Schema migration failed | Keep original data untouched, explain recovery/export, never silently reset     |
| Invalid QR              | Safe invalid-card page; never echo raw payload                                  |
| Unsupported share       | Copy and download alternatives                                                  |
| Stale place data        | Timestamp and neutral uncertainty; no “open now” claim                          |
| Community unavailable   | Explain network/server requirement; preserve drafted post                       |
| Removed/blocked content | Plain safety message and path back; do not leave a broken card                  |
| Lost mode active        | Persistent icon + text + contrast and two clear actions                         |

### Empty-state copy examples

| Context              | Heading                                           | Action                       |
| -------------------- | ------------------------------------------------- | ---------------------------- |
| No care yet          | “Comece pelo cuidado mais recente”                | **Registrar cuidado**        |
| Nothing today        | “Tudo organizado por hoje”                        | **Ver próximos cuidados**    |
| No diary             | “A história de Luna começa aqui”                  | **Guardar um momento**       |
| No documents         | “Exames e carteirinhas ficam fáceis de encontrar” | **Adicionar documento**      |
| No places            | “Não encontramos locais com esses filtros”        | **Limpar filtros**           |
| No community density | “Ainda há pouca atividade nesta região”           | **Ver grupos por interesse** |

---

## 13. Skeleton blueprints

Skeletons mirror the final geometry. Render them immediately whenever their loading boundary is active; never delay a fallback or add a fake minimum wait. The rough 300ms threshold is only a product decision about whether an operation deserves a skeleton at all. Very fast fixed-size action or link feedback should avoid flicker.

### Hoje skeleton

- In pet mode: 40px avatar circle + two text lines and one 160px-wide Care Halo block.
- In Todos os pets mode: compact avatar row and aggregate attention-summary geometry, never a singular pet placeholder.
- Two task rows with stable icon, text, date, and action positions.
- Bottom navigation remains real and interactive.

### History skeleton

- Keep active tab and filters real.
- Render three timeline rows with a fixed 24px marker column and variable text widths.
- Do not shimmer the entire viewport; use a subtle surface pulse.

### Explore skeleton

- Search and category chips remain interactive.
- Three place-card shells preserve image ratio, two text rows, and attribute chips.
- Map view uses a neutral map placeholder plus a textual loading label.

### Image loading

- Reserve aspect ratio before request.
- Show dominant-color/neutral placeholder, then crossfade in 160ms.
- On failure show a stable fallback with pet initials or category icon and an accessible label.

---

## 14. Forms and input behavior

- Labels remain visible above fields; placeholder is an example, never the label.
- Use correct `type`, `inputmode`, `autocomplete`, and enter-key intent.
- Use pt-BR dates and 24-hour time; store canonical values separately.
- Weight accepts decimal comma and decimal point, then displays `kg` without altering the input during typing.
- Mark required and optional explicitly; do not use unexplained asterisks.
- Validate on blur and submit. Avoid red errors while the user is still typing.
- Error copy names the fix: “Informe uma data igual ou posterior ao registro.”
- Long forms auto-save drafts locally.
- Closing a dirty sheet asks **Continuar editando** or **Salvar rascunho e sair**; discard is the least prominent option.
- Date and recurrence controls state their consequence in natural language.
- Sticky CTA clears the software keyboard and bottom safe area.
- Forms work at 200% zoom without two-column compression.

---

## 15. Accessibility baseline

Target WCAG 2.2 AA and validate the critical journeys with keyboard and NVDA, not only automated scores.

- Semantic landmarks and a skip link.
- One `h1` per screen and sequential heading levels.
- 48×48px preferred targets; 44×44px minimum.
- Visible 3px focus ring with contrast and offset.
- Bottom navigation has persistent text labels and current-page semantics.
- Inputs have visible labels, hints, errors, and correct associations.
- Dialogs/sheets trap focus and return it to the trigger.
- Dynamic loading, result, success, and error messages use restrained live regions.
- Color is never the only signal; status always has icon and text.
- All gestures have visible alternatives.
- Map has a complete equivalent list.
- QR has copyable/shareable/downloadable alternatives.
- Charts have a data summary/list and do not encode series by color alone.
- Support reduced motion, dark mode, high contrast, landscape, 200% zoom, and large text.
- Do not let sticky navigation obscure focused content; use scroll padding.
- Avoid chatty live regions on countdowns, skeletons, and repeated status rerenders.

---

## 16. Responsive rules

### Phone — 320–767px

- Single column.
- 16px gutter at 320px; 20px at 375px+.
- Bottom navigation respects `safe-area-inset-bottom`.
- Bottom sheets for filters, quick add, and supporting choices.
- Sticky form CTA; never hide content behind it.
- No mandatory side-by-side actions.
- Test 320, 360, 375, 390, and 430px plus landscape.

### Tablet — 768–1023px

- Navigation rail.
- Two-column Today where hierarchy permits: main agenda + secondary context.
- Dialog may replace sheet.
- List/detail split views for history and places.
- Long text remains constrained.

### Desktop — 1024px+

- Persistent 232px side rail.
- Content container max 1200px.
- Optional 320px context pane for upcoming care or selected detail.
- Main operational column remains 640–760px.
- Hover enhances but never reveals the only affordance.

### Layout acceptance

- No horizontal overflow at 320px.
- No fixed-height text containers.
- Every sticky element has equivalent scroll padding/inset.
- Browser zoom to 200% remains functional.
- Orientation change preserves active pet, draft, filter, and scroll intent.

---

## 17. Privacy, safety, and clinical trust

### Per-surface rules

- Health and diary are private by default.
- Exact location is never attached to community content by default.
- Public-card preview shows exactly what a stranger receives.
- Contact changes warn that old snapshot QR copies do not update.
- Sharing a record lets the user select the included date range and fields.
- Product recommendations disclose reason, partner relationship, and external destination.
- Community health content is labeled as lived experience, not veterinary advice.
- Seeded/demo people, places, reviews, and activity are visibly labeled.
- Delete/export flows state what is local, synced, public, or irreversible.

### Lost-mode safety

- Treat as an emergency state, not a campaign theme.
- Never expose exact home address by default.
- Offer a contact method that can later be mediated by a backend.
- Show when the card was generated and whether it is a snapshot.
- Deactivation changes the app banner and future generated cards. It cannot detect or revoke copied snapshot QR data, and the confirmation explains that limitation.

### Clinical language

Use:

- “Seu registro indica que a vacina vence em 14 dias.”
- “Sua agenda de cuidados está em dia.”
- “Procure um médico-veterinário se houver sintomas ou dúvida.”

Avoid:

- “Luna está saudável.”
- “Esta dose é segura.”
- “Você deve usar este produto.”
- “Diagnóstico” or prescriptive language generated from owner-entered data.

---

## 18. Content design

### Voice

- Warm, direct, adult, and calm.
- Sentence case; one idea per sentence.
- Use the pet’s name when it reduces ambiguity, not in every line.
- Buttons use verbs and name the outcome.
- Errors accept responsibility and preserve confidence.
- Urgency is proportional; avoid exclamation marks in care warnings.

### Preferred microcopy

| Context                | Copy                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Today summary          | “Luna tem 2 cuidados hoje.”                                                             |
| Nothing due            | “Tudo organizado por hoje.”                                                             |
| Quick add              | “O que aconteceu com Luna?”                                                             |
| Vaccine date           | “Quando foi aplicada?”                                                                  |
| Recurrence             | “Quando você quer lembrar de novo?”                                                     |
| Saved                  | “Salvo neste aparelho.”                                                                 |
| Offline                | “Sem internet. Seus registros locais continuam disponíveis.”                            |
| Location prompt        | “Use sua localização para ordenar locais próximos. Você também pode informar o bairro.” |
| Community disclaimer   | “Experiência da comunidade, não orientação veterinária.”                                |
| Partner recommendation | “Apareceu porque combina com o porte e a rotina de Luna.”                               |
| Lost mode              | “Modo perdido ativo para Luna.”                                                         |

---

## 19. Next.js/PWA state architecture

- Treat persisted-store hydration and route loading as separate mechanisms. A client hydration gate restores Zustand/local data; `loading.tsx` and Suspense represent server, route, or lazy-module waits.
- Provide route-level `loading.tsx` skeletons for meaningful dynamic transitions.
- Add narrower Suspense boundaries so one slow section does not blank the whole screen.
- Shared layouts and navigation remain interactive during loading.
- Use `useLinkStatus` only for demonstrably slow transitions. Place it inside a descendant of the relevant `<Link>`, reserve fixed space, and delay display about 100ms to avoid flicker. Prefetched navigations may skip the pending state.
- Use route-level `error.tsx` Client Component boundaries for unexpected render-time exceptions, with a retry action and safe way home.
- Route error boundaries do not catch event-handler or later async failures. Save, media, export, share, and permission handlers must catch failures and transition their owning UI explicitly.
- Handle expected form/network errors as normal UI state with `aria-live`, not thrown exceptions.
- Reserve `not-found.tsx`/`notFound()` for unmatched routes or resources validated during server rendering. Client-local missing pets or records use a normal `MissingEntityState` with contextual recovery navigation.
- Give every route a unique descriptive title; route announcements rely on title, then `h1`, then pathname.
- Test both direct loads and client navigation because their initial shells can differ.
- Lazy-load map, QR export, charts, and decorative React Bits effects.
- Keep the operational shell usable when decorative or network modules fail.
- Service-worker update state must say **Atualizar agora** and never discard an active draft.
- Offline fallback distinguishes “this page was not saved” from “the app has no data.”

---

## 20. Measurement and validation

### Product metrics

- Activation: pet created + one real record or reminder.
- Time to first pet: median and 90th percentile.
- Time to first useful record.
- Weekly active pets with at least one relevant action.
- Reminder completion, postponement, skip, and stop-recurrence rates.
- History retrieval/export before a care event.
- Card preview → share completion.
- Explore result → detail → route/contact intent.
- Draft recovery and storage/media failure rate.
- Undo rate after completion/deletion as an error signal.

Do not optimize notification volume, card impressions, or partner CTR at the expense of care completion and trust.

### Prototype task test

Recruit 8–12 Brazilian pet tutors across one/multiple pets, different ages, and at least two chronic/senior-care contexts.

1. Create Luna without help and skip unknown details.
2. Record a vaccine and set a reminder.
3. Complete then undo a care item.
4. Find the latest exam and share it.
5. Preview and share the pet card without exposing an unwanted field.
6. Activate and deactivate lost mode.
7. Find a place with shade that accepts a large dog after denying location.
8. Recover from offline and attachment-failure states.

Success gates:

- ≥90% complete core tasks without facilitator help.
- Median first-pet creation ≤90 seconds.
- No participant confuses schedule status with clinical health.
- No participant believes the local snapshot QR updates remotely.
- All participants can identify which pet a task belongs to.
- System Usability Scale target ≥80 after iteration.

### Accessibility QA matrix

- Keyboard only at 320px-equivalent responsive viewport and desktop.
- NVDA + Chrome for Today, record creation, reminder completion, card sharing, and errors.
- 200% browser zoom.
- Reduced motion and forced/high contrast.
- Light and dark theme contrast.
- Android TalkBack/iOS VoiceOver spot checks when device access exists.

---

## 21. Delivery sequence

The repository-mapped execution plan, file ownership, dependencies, and acceptance gates live in [`design-implementation-plan.md`](./design-implementation-plan.md). The phases below remain the product-level sequence.

### Phase 0 — design foundation

- Confirm four-destination IA with tree testing.
- Build tokens, type scale, icon rules, and motion primitives.
- Prototype Today, quick add, pet switcher, and global states.
- Run contrast and 320px geometry checks before feature screens.

### Phase 1 — trusted core

- Onboarding and pet management.
- Today and care agenda.
- Record forms, history, diary, documents.
- Shareable snapshot card and lost mode.
- Offline, storage, export/delete, and in-app notification states.

### Phase 2 — local discovery

- List-first places, filters, manual location, map toggle.
- Suitability attributes, source/freshness, and accessible place detail.

### Phase 3 — backend-dependent experience

- Accounts, synchronization, household roles.
- Real push delivery.
- Stable updateable public identity.
- Live community, moderation, reporting, and verified reviews.

### Phase 4 — responsible monetization

- Explained recommendations and partner disclosures.
- Billing cadence and cancellation path before purchase.
- Commercial opt-in and frequency controls.

---

## 22. Definition of done

A surface is not complete until:

- normal, loading, empty, error, offline, permission, partial-data, success, and disabled states are defined where relevant;
- every async action has immediate feedback and a recoverable failure path;
- pet context is visible and preserved;
- form data survives validation, network, media, and accidental-close failures;
- touch targets, focus, keyboard order, live announcements, and reduced motion are verified;
- 320px, 375px, tablet, desktop, landscape, and 200% zoom are checked;
- light and dark themes pass contrast independently;
- fixed/sticky elements do not cover content;
- the screen uses one dominant accent, operational cards use the standard geometry, and decorative hard-offset shadows/rotation do not leak out of approved emotional surfaces;
- sources, timestamps, sponsorship, privacy effects, and clinical limits are visible;
- performance remains acceptable on a mid-range Android device and slow network;
- usability task criteria are met with real users.

---

## 23. Research sources

### Pet market and competitor references

- [Petlove app](https://lp-app.petlove.com.br/)
- [Petlove 2026 App Store release history](https://apps.apple.com/br/app/petlove-petshop-e-sa%C3%BAde-pet/id828960201)
- [11pets features](https://www.11pets.com/en/feature)
- [PetDesk veterinary mobile app](https://petdesk.com/products/veterinary-mobile-app)
- [PetDesk pet-parent benefits](https://petdesk.zendesk.com/hc/en-us/articles/360052077794-Benefits-to-Using-the-PetDesk-Mobile-App)
- [Pawp care model](https://help.pawp.com/en/articles/7153880-what-is-pawp)
- [Rover safety model](https://support.rover.com/hc/en-us/articles/205882216-What-does-Rover-do-to-support-safety)
- [Tractive features and public sharing](https://help.tractive.com/hc/en-us/articles/360001234789-What-features-does-Tractive-offer)
- [Chewy pet ecosystem and Autoship](https://www.chewy.com/app/content/about-us)
- [Petcube camera and care ecosystem](https://petcube.com/en-gb/cam/)

### Interaction, accessibility, and framework references

- [Refero Styles — Finn](https://styles.refero.design/style/07546cf0-b9df-49dd-9da9-319d7a654703)
- [Refero Styles — Luffu](https://styles.refero.design/style/3da7b444-ded8-406b-90b7-96851604b92b)
- [Refero Styles — August Health EHR](https://styles.refero.design/style/81bd6ad6-b02b-4fb3-a600-91ecf8324171)
- [Componentry — Annotated Text](https://componentry.dev/docs/components/annotated-text)
- [React Bits — Stepper](https://www.reactbits.dev/components/stepper)
- [React Bits — Animated List](https://www.reactbits.dev/components/animated-list)
- [React Bits — Count Up](https://www.reactbits.dev/text-animations/count-up)
- [WCAG 2.2 status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [Android navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- [Chrome notification permission guidance](https://developer.chrome.com/docs/lighthouse/best-practices/notification-on-start)
- [shadcn/ui component bases](https://ui.shadcn.com/docs/components)
- [shadcn Base UI Drawer](https://ui.shadcn.com/docs/components/base/drawer)
- [shadcn forms with Next.js](https://ui.shadcn.com/docs/forms/next)
- [HeroUI v3 introduction](https://heroui.com/en/docs/react/getting-started)
- [NextUI to HeroUI migration](https://v2.heroui.com/docs/guide/nextui-to-heroui)
- [HeroUI animation and reduced motion](https://heroui.com/en/docs/react/getting-started/animation)
- [React Bits installation and dependencies](https://www.reactbits.dev/get-started/installation)
- [Next.js loading and navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating)
- [Next.js error handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js `useLinkStatus`](https://nextjs.org/docs/app/api-reference/functions/use-link-status)
- [Next.js `notFound`](https://nextjs.org/docs/app/api-reference/functions/not-found)

---

## 24. Open product decisions

Validate these before high-fidelity implementation:

1. Is PetHub a local-first personal tool at launch, or will real accounts/sync ship with P0?
2. Will the public card remain a snapshot or move to a revocable server-backed identity?
3. Which Brazilian city supplies the first genuinely curated place dataset?
4. Who owns freshness, verification, and disputes for place attributes?
5. Will community ship only after moderation and identity infrastructure?
6. What reminder delivery guarantees can the chosen PWA/backend architecture honestly make?
7. What is the legal/review process for clinical copy and health-related products?
8. Does user research support four primary destinations, or does Community earn a fifth after launch?

Until answered, the interface must choose the more private, less clinical, less commercial, and less network-dependent interpretation.
