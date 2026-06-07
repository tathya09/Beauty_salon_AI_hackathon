# Implementation Plan: GlowCity Beauty Salon Marketplace

## Overview

Incremental build of the GlowCity platform — Next.js 14 + TypeScript + Firebase + Gemini AI. Each task produces working, integrated code. Tasks build on each other; no step leaves orphaned code. Property-based tests (fast-check + Vitest) validate slot generation and booking total invariants.

---

## Tasks

- [x] 1. Project scaffolding
  - [x] 1.1 Bootstrap Next.js 14 app with TypeScript and Tailwind CSS
    - Run `npx create-next-app@14 glowcity --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
    - Verify `tsconfig.json`, `tailwind.config.ts`, and `app/layout.tsx` are generated correctly
    - _Requirements: NFR — tech stack_

  - [x] 1.2 Install and configure shadcn/ui
    - Run `npx shadcn-ui@latest init` selecting Tailwind CSS + TypeScript
    - Add base components: `button`, `card`, `dialog`, `input`, `select`, `badge`, `toast`, `avatar`, `skeleton`, `tabs`
    - Verify `components/ui/` is populated and `globals.css` includes CSS variables
    - _Requirements: NFR — UI framework_

  - [x] 1.3 Install all project dependencies
    - Install: `firebase`, `firebase-admin`, `@google/generative-ai`, `leaflet`, `react-leaflet`, `@types/leaflet`, `razorpay`, `framer-motion`, `react-hook-form`, `zod`, `@hookform/resolvers`, `fast-check`, `vitest`, `@vitejs/plugin-react`, `geohash-js`, `filepond`, `react-filepond`, `filepond-plugin-image-preview`, `filepond-plugin-file-validate-type`, `filepond-plugin-file-validate-size`, `date-fns`, `zustand`
    - Pin exact versions in `package.json`
    - _Requirements: NFR — dependencies_

  - [x] 1.4 Set up folder structure and path aliases
    - Create directory tree: `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/types/`, `src/store/`, `src/utils/`
    - Verify `@/*` import alias resolves from `src/`
    - _Requirements: NFR — project structure_

  - [x] 1.5 Configure Vitest
    - Create `vitest.config.ts` with `@vitejs/plugin-react`, configure `globals: true`, `environment: 'jsdom'`, and `setupFiles`
    - Add `test` script to `package.json`: `"test": "vitest --run"`, `"test:watch": "vitest"`
    - Confirm a trivial test passes: `expect(1 + 1).toBe(2)`
    - _Requirements: NFR — testing_

- [x] 2. Core TypeScript types and shared utilities
  - [x] 2.1 Define all domain type interfaces
    - Create `src/types/index.ts` with `Salon`, `Service`, `Booking`, `TimeSlot`, `User`, `StyleProfile`, `ChatMessage`, `ChatSession`, `BookingIntent`, `SalonCard`, `StyleMatchResult`, `WeeklyHours`, `GeoPoint`, `PaginatedResult`
    - Create supporting union types: `ServiceCategory`, `PriceRange`, `BookingStatus`, `PaymentStatus`, `UserRole`
    - Create Firestore document shapes: `SalonDoc`, `ServiceDoc`, `BookingDoc`, `SlotDoc`
    - _Requirements: all functional requirements — type safety_

  - [x] 2.2 Implement `generateSlots()` utility
    - Create `src/utils/slots.ts` — implement `generateSlots(salonId, date, serviceDuration)` producing non-overlapping `TimeSlot[]` sorted chronologically using `openingHours`
    - Implement `computeTotal(services: Pick<Service, 'price'>[])` in `src/utils/booking.ts`
    - _Requirements: Booking Flow — slot availability_

  - [ ]* 2.3 Write property test for `generateSlots()`
    - **Property 1: Non-overlapping slots** — for any valid `serviceDuration` (15–120 min), no two generated slots overlap: `slots[i].endTime <= slots[i+1].startTime` for all consecutive pairs
    - **Property 2: Chronological ordering** — slots are always sorted by `startTime` ascending
    - **Validates: Design §5 — `generateSlots()` Postconditions and Loop Invariants**
    - Create `src/utils/__tests__/slots.test.ts` using `fast-check` + Vitest

  - [ ]* 2.4 Write property test for `computeTotal()`
    - **Property 3: Booking total equals sum of service prices** — for any array of services with positive prices, `computeTotal(services) === services.reduce((sum, s) => sum + s.price, 0)`
    - **Property 4: Total is always non-negative** — result never goes below 0
    - **Validates: Design §5 — `createBooking()` Step 2**
    - Create `src/utils/__tests__/booking.test.ts` using `fast-check` + Vitest

  - [x] 2.5 Implement shared helper utilities
    - Create `src/utils/geohash.ts` — wrap `geohash-js` encode/decode with typed helpers
    - Create `src/utils/format.ts` — `formatINR(amount)`, `formatTime(time)`, `formatDate(date)` using `date-fns`
    - Create `src/utils/errors.ts` — `BookingError`, `AuthError`, `AIError` typed error classes
    - _Requirements: NFR — utilities_

- [x] 3. Firebase setup and configuration
  - [x] 3.1 Create Firebase project configuration
    - Create `src/lib/firebase/client.ts` — initialize Firebase app (client SDK) using env vars; export `auth`, `db`, `storage`
    - Create `src/lib/firebase/admin.ts` — initialize Firebase Admin SDK for server-side use; export `adminDb`, `adminAuth`
    - Create `.env.local.example` listing all required env vars: `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*`, `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
    - _Requirements: NFR — Firebase configuration_

  - [x] 3.2 Write Firestore security rules
    - Create `firestore.rules` enforcing:
      - Customers read/write only their own `/users/{uid}` and `/bookings/{bookingId}` (where `userId == request.auth.uid`)
      - `/salons/*` readable by all; writable only by authenticated owner (`ownerId == request.auth.uid`)
      - `/slots/*` readable by authenticated users; `isAvailable` field writable only via server-side transaction
      - `/chatSessions/*` readable/writable only by session owner or unauthenticated (anonymous sessions allowed)
    - _Requirements: Security — Firestore Rules_

  - [x] 3.3 Write Firebase Storage security rules
    - Create `storage.rules` allowing authenticated users to upload to `uploads/{userId}/*` (max 5MB, image MIME types only)
    - Allow public read of `salons/*` gallery images
    - _Requirements: Security — Storage Rules_

  - [x] 3.4 Create Firestore indexes configuration
    - Create `firestore.indexes.json` with composite indexes:
      - `bookings`: (`userId` ASC, `status` ASC, `createdAt` DESC)
      - `bookings`: (`salonId` ASC, `slot.date` ASC)
      - `salons`: (`city` ASC, `rating` DESC)
      - `salons`: (`city` ASC, `area` ASC, `rating` DESC)
      - `salons`: (`tags` ARRAY, `rating` DESC)
    - _Requirements: Performance — query efficiency_

  - [x] 3.5 Create Firestore seed data script
    - Create `scripts/seed.ts` populating:
      - 10 Mumbai salon documents across 5 areas (Bandra, Andheri, Juhu, Colaba, Powai) with varied `priceRange`, `tags`, `rating`, `services`
      - Each salon gets 3–5 `services` subcollection documents
      - Pre-generate 7 days of slots for each salon (slot docs under `/slots/{salonId_date}/slots/`)
      - 2 test user documents (`customer` + `salon_owner` roles)
    - Run with `npx ts-node scripts/seed.ts`
    - _Requirements: Data — seed data for demo_

- [x] 4. Authentication
  - [x] 4.1 Implement Firebase Auth context and hooks
    - Create `src/lib/firebase/auth.ts` with `signInWithGoogle()`, `signInWithPhoneOTP(phone)`, `verifyOTP(verificationId, code)`, `signOut()`, `getCurrentUser()`
    - Create `src/hooks/useAuth.ts` React hook exposing `user`, `loading`, `signInWithGoogle`, `signInWithPhone`, `signOut`
    - Create `src/store/authStore.ts` (Zustand) holding `user: User | null`, `loading: boolean`
    - _Requirements: Authentication — Google + Phone OTP_

  - [x] 4.2 Build Auth provider and session handling
    - Create `src/components/providers/AuthProvider.tsx` wrapping `onAuthStateChanged`; syncs Firebase user to Zustand store and creates/updates `/users/{uid}` Firestore doc on first sign-in
    - Add `AuthProvider` to `src/app/layout.tsx`
    - Implement server-side auth middleware in `src/middleware.ts` — protect `/dashboard/*` routes; redirect unauthenticated users to `/login`
    - _Requirements: Authentication — session management_

  - [x] 4.3 Build login and registration pages
    - Create `src/app/(auth)/login/page.tsx` with Google sign-in button (shadcn `Button`) and phone OTP form (react-hook-form + zod: phone regex validation)
    - Create `src/app/(auth)/register/page.tsx` for new user role selection (customer vs. salon owner)
    - Handle OTP send + verify two-step flow with loading states and error toasts
    - _Requirements: Authentication — login/register UI_

- [x] 5. Salon data layer and Firestore CRUD
  - [x] 5.1 Implement Firestore salon repository
    - Create `src/lib/repositories/salonRepository.ts` with:
      - `getSalonById(salonId)` → `Salon | null`
      - `getSalonsByArea(city, area, filters, pagination)` → `PaginatedResult<Salon>`
      - `searchSalonsByTags(tags, city)` → `Salon[]`
      - `updateSalon(salonId, data)` (owner-only, server-side)
    - All reads use typed Firestore converters
    - _Requirements: Salon Discovery — data access_

  - [x] 5.2 Implement Firestore booking repository
    - Create `src/lib/repositories/bookingRepository.ts` with:
      - `createBooking(userId, salonId, serviceIds, slot)` — Firestore transaction (atomic slot lock + booking creation as per design algorithm)
      - `getBookingsByUser(userId, status?)` → `PaginatedResult<Booking>`
      - `getBookingsBySalon(salonId, date?)` → `Booking[]`
      - `updateBookingStatus(bookingId, status)` (server-side only)
    - Implement full atomic transaction matching the pseudocode in design §Algorithmic Pseudocode
    - _Requirements: Booking Flow — atomic reservation_

  - [x] 5.3 Implement slot repository
    - Create `src/lib/repositories/slotRepository.ts` with:
      - `getAvailableSlots(salonId, date)` → `TimeSlot[]`
      - `lockSlot(salonId, date, startTime, bookingId)` (used inside transaction)
      - `releaseExpiredLocks()` — release slots where `lockedUntil < now()`
    - _Requirements: Booking Flow — slot management_

- [x] 6. Salon discovery page
  - [x] 6.1 Build `SearchBar` and `FilterPanel` components
    - Create `src/components/discovery/SearchBar.tsx` with debounced text input (500ms), area autocomplete from static Mumbai areas list, and submit handler
    - Create `src/components/discovery/FilterPanel.tsx` with `priceRange` multi-select (shadcn `Select`), `serviceCategory` checkbox group, `rating` minimum slider
    - Wire filter state to Zustand `discoveryStore`
    - _Requirements: Salon Discovery — search and filter_

  - [x] 6.2 Build `SalonCard` and `SalonGrid` components
    - Create `src/components/discovery/SalonCard.tsx` — display `coverImage` (Next.js `<Image>`), name, area, rating (star badge), `priceRange` pill, top tags
    - Create `src/components/discovery/SalonGrid.tsx` — responsive grid (2 cols mobile / 3 cols tablet / 4 cols desktop), infinite scroll using Firestore cursor pagination, `Skeleton` loading state
    - _Requirements: Salon Discovery — salon listing_

  - [x] 6.3 Integrate Leaflet map
    - Create `src/components/discovery/SalonMap.tsx` — dynamically imported (no SSR) `react-leaflet` `MapContainer` centered on Mumbai; render `Marker` per salon with custom pin icon; clicking marker highlights corresponding `SalonCard`
    - Add split-view layout to `src/app/(public)/salons/page.tsx` — map left, grid right on desktop; tabs (List / Map) on mobile
    - _Requirements: Salon Discovery — map view_

  - [x] 6.4 Implement semantic embed-search API route
    - Create `src/app/api/ai/embed-search/route.ts` — POST endpoint: accept `{ query, filters }`; call Gemini `embedding-001` to embed query; query Firestore salons by `tags` + `area` filters; rank by tag overlap and `rating`; return `PaginatedResult<Salon>`
    - Wire `SearchBar` submit to call this endpoint
    - Implement graceful fallback: if Gemini embedding fails, perform keyword-based Firestore query on `tags`
    - _Requirements: Salon Discovery — semantic search_

- [x] 7. Salon detail page and booking flow
  - [x] 7.1 Build salon detail page
    - Create `src/app/(public)/salons/[salonId]/page.tsx` — fetch salon by ID (server component); render: cover image hero, gallery grid, services list (name, duration, price), rating + review count, opening hours table, map pin
    - Implement `generateStaticParams` for ISR; `revalidate = 3600`
    - _Requirements: Salon Detail — information display_

  - [x] 7.2 Build `ServiceSelector` component
    - Create `src/components/booking/ServiceSelector.tsx` — display services as selectable cards; allow multi-select; show running total in INR using `computeTotal()`; validate at least one service selected before proceeding
    - _Requirements: Booking Flow — service selection_

  - [x] 7.3 Build `BookingCalendar` and slot picker
    - Create `src/components/booking/BookingCalendar.tsx` — date picker (next 7 days, disabled past dates); on date select, fetch available slots via `slotRepository.getAvailableSlots()`; render time slot grid with available (clickable) vs. unavailable (greyed) slots
    - _Requirements: Booking Flow — slot selection_

  - [x] 7.4 Build booking confirmation and Razorpay payment
    - Create `src/app/(public)/salons/[salonId]/book/page.tsx` — multi-step form (Service → Date/Slot → Confirm → Payment) with step indicator
    - Create `src/app/api/payments/create-order/route.ts` — verify Firebase ID token; call `createBooking()` transaction; create Razorpay order (`amount * 100` paise); return `{ orderId, currency, amount }`
    - Create `src/app/api/payments/verify/route.ts` — HMAC-SHA256 signature verification; on success update `bookingStatus = 'confirmed'`, `paymentStatus = 'paid'`
    - Integrate Razorpay checkout script on client; handle success/failure callbacks
    - _Requirements: Booking Flow — payment_

  - [x] 7.5 Build booking confirmation page
    - Create `src/components/booking/BookingConfirmation.tsx` — show booking ID, salon name, service, date/time, total amount; "Add to Calendar" button; "Back to Home" CTA
    - Handle slot unavailability 409 error — show "This slot just got taken, pick another" with redirect back to slot picker
    - _Requirements: Booking Flow — confirmation and error handling_

- [ ] 8. Checkpoint — core booking flow
  - Ensure all tests pass (`npm run test`). Verify the atomic booking transaction works against Firebase emulator. Ask the user if questions arise before proceeding.

- [x] 9. Glow AI chat assistant
  - [x] 9.1 Implement `/api/ai/chat` route
    - Create `src/app/api/ai/chat/route.ts` — POST endpoint implementing `glowAIChat()` algorithm from design:
      - Build system prompt as Glow AI booking assistant for Mumbai
      - Trim `sessionHistory` to last 10 messages
      - Call `gemini-1.5-flash` with `responseMimeType: "application/json"` and `ChatResponseSchema` (zod schema for `{ intent, reply, salonCards }`)
      - Query salons via `searchSalonsByTags()` if intent has service/area
      - Return `{ reply, salonCards, intent }`
    - Implement error fallback: if Gemini fails, return static top-rated salons with friendly message
    - Apply rate limiting header check (Vercel Edge Middleware handles IP limiting)
    - _Requirements: Glow AI Chat — API_

  - [x] 9.2 Build `ChatWidget` component
    - Create `src/components/ai/ChatWidget.tsx` — floating button (bottom-right), slide-up panel with message thread, input box, send button
    - Manage local `messages: ChatMessage[]` state; append user message, call `/api/ai/chat`, append assistant reply
    - Render inline `SalonCard` components when `salonCards` present in response
    - Show typing indicator (animated dots) while awaiting response
    - Debounce send button (500ms) to prevent double submission
    - _Requirements: Glow AI Chat — UI_

  - [x] 9.3 Build dedicated AI assistant page
    - Create `src/app/(public)/ai-assistant/page.tsx` — full-page chat interface using `ChatWidget` logic; persist `sessionHistory` to Firestore `/chatSessions/{sessionId}` for authenticated users
    - _Requirements: Glow AI Chat — dedicated page_

- [x] 10. AI Style Matcher
  - [x] 10.1 Implement `/api/ai/style-match` route
    - Create `src/app/api/ai/style-match/route.ts` — POST endpoint implementing `matchStyleFromImage()` algorithm:
      - Accept `{ imageUrl }` (must be a Firebase Storage URL)
      - Fetch image as base64, call Gemini Vision with style extraction prompt
      - Parse `{ tags, description, confidence }` from response
      - Query Firestore salons via `array-contains-any` on `tags`, `orderBy rating desc`, `limit 5`
      - Score salons by tag overlap; return `StyleMatchResult`
      - Persist to `/users/{uid}.stylePreferences` if authenticated
    - _Requirements: Style Matcher — API_

  - [x] 10.2 Build `StyleMatchUpload` component
    - Create `src/components/ai/StyleMatchUpload.tsx` — FilePond uploader configured for JPEG/PNG only, max 5MB; uploads to Firebase Storage `uploads/{userId}/{uuid}`; returns Storage URL on success
    - Show client-side validation error toast for wrong file type or oversized file
    - _Requirements: Style Matcher — image upload_

  - [x] 10.3 Build style matcher results UI and page
    - Create `src/app/(public)/style-match/page.tsx` — upload section + results section
    - After upload + API response: display extracted tags as pills, `description` sentence, ranked `SalonCard` list with `matchScore` percentage badge
    - Loading skeleton while API processes
    - _Requirements: Style Matcher — results display_

- [x] 11. Customer dashboard
  - [x] 11.1 Build bookings list page
    - Create `src/app/dashboard/(customer)/bookings/page.tsx` (server component, auth-protected via middleware)
    - Fetch bookings via `bookingRepository.getBookingsByUser(uid)` with status filter tabs (All / Upcoming / Past / Cancelled)
    - Render booking cards: salon name, service, date/time, status badge, total amount; "Cancel" button for upcoming bookings (calls `updateBookingStatus` → `cancelled`)
    - _Requirements: Customer Dashboard — bookings_

  - [x] 11.2 Build customer profile page
    - Create `src/app/dashboard/(customer)/profile/page.tsx` — display/edit display name, email, phone; show `stylePreferences.extractedTags` as style profile pills; "Update Style Profile" link to style matcher
    - Form uses react-hook-form + zod; PATCH `/users/{uid}` on submit
    - _Requirements: Customer Dashboard — profile_

- [ ] 12. Salon owner dashboard
  - [ ] 12.1 Build owner overview page
    - Create `src/app/dashboard/(salon-owner)/overview/page.tsx` — stats cards: today's bookings count, this-week revenue (sum of `totalAmount` where `paymentStatus == 'paid'`), pending confirmations count
    - Recent bookings table (last 10) with customer name, service, slot, status
    - _Requirements: Salon Owner Dashboard — overview_

  - [ ] 12.2 Build slot management page
    - Create `src/app/dashboard/(salon-owner)/slots/page.tsx` — 7-day calendar view; for each day show slot grid (available green / booked orange / past grey); owner can block slots (set `isAvailable = false` without booking)
    - Create server action `blockSlot(salonId, date, startTime)` — verifies `ownerId == request.auth.uid` before updating
    - _Requirements: Salon Owner Dashboard — slot management_

  - [ ] 12.3 Implement `/api/ai/generate-promo-copy` route
    - Create `src/app/api/ai/generate-promo-copy/route.ts` — POST endpoint:
      - Verify Firebase ID token; check caller is salon owner of `salonId`
      - Fetch salon data; build prompt with salon name, services, rating, area
      - Call `gemini-1.5-flash` requesting JSON `{ copy, hashtags }` for requested `promotionType` (`instagram` | `whatsapp` | `website`)
      - Return generated copy + hashtags array
    - _Requirements: Salon Owner Dashboard — AI promo copy_

  - [ ] 12.4 Build AI promo copy page
    - Create `src/app/dashboard/(salon-owner)/ai-copy/page.tsx` — promotion type selector (tabs: Instagram / WhatsApp / Website); "Generate" button calls API route; display generated copy in a card with copy-to-clipboard button and character count
    - _Requirements: Salon Owner Dashboard — AI promo copy UI_

- [ ] 13. Landing page
  - [ ] 13.1 Build hero section
    - Create `src/components/landing/Hero.tsx` — full-viewport hero with headline ("Book Mumbai's Best Salons in 60 Seconds"), sub-headline, search bar (`SearchBar` component pre-wired to `/salons`), background gradient with `framer-motion` entrance animation
    - _Requirements: Landing Page — hero_

  - [ ] 13.2 Build featured salons section
    - Create `src/components/landing/FeaturedSalons.tsx` — horizontally scrollable row of top-rated salon cards (static ISR fetch of top 6 salons by rating); "View All" CTA → `/salons`
    - _Requirements: Landing Page — featured salons_

  - [ ] 13.3 Build AI features highlight section
    - Create `src/components/landing/AIFeatures.tsx` — three feature cards: Glow AI Chat (→ `/ai-assistant`), Style Matcher (→ `/style-match`), Smart Slots; icon + title + description + CTA button per card; `framer-motion` stagger animation on scroll
    - _Requirements: Landing Page — AI feature showcase_

  - [ ] 13.4 Assemble landing page
    - Create `src/app/(public)/page.tsx` — compose `Hero`, `FeaturedSalons`, `AIFeatures` sections; add `ChatWidget` floating button; configure `export const revalidate = 3600` for ISR
    - _Requirements: Landing Page — composition_

- [ ] 14. Checkpoint — full UI integration
  - Ensure all tests pass. Smoke-test the end-to-end flow (landing → discover → detail → booking → dashboard). Ask the user if questions arise before proceeding.

- [ ] 15. Firebase Cloud Function — booking notification trigger
  - [ ] 15.1 Create `onBookingCreated` Cloud Function
    - Create `functions/src/index.ts` — Firestore `onCreate` trigger on `/bookings/{bookingId}`
    - On creation with `status == 'pending'`: send email confirmation via Firebase Extensions (Trigger Email) to `userEmail` (denormalized on booking doc)
    - On `status == 'confirmed'` update: send SMS via Firebase Extensions if `phone` on user profile
    - _Requirements: Booking Flow — notifications_

- [ ] 16. Vercel deployment configuration
  - [ ] 16.1 Create Vercel project config and environment variables
    - Create `vercel.json` with `framework: "nextjs"`, region `bom1` (Mumbai), and function timeout `maxDuration: 30` for AI routes
    - Create `.env.production.example` mapping all env var names (no values) for handoff
    - Document all required Vercel environment variables in `README.md`: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
    - _Requirements: Deployment — Vercel config_

  - [ ] 16.2 Configure Next.js for production
    - Update `next.config.js`: add `images.domains` for Firebase Storage URL, enable `output: 'standalone'` for Docker compatibility, add `headers()` for `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
    - Add `.gitignore` entries: `.env.local`, `functions/node_modules/`, `.firebase/`
    - _Requirements: Deployment — production config_

  - [ ] 16.3 Add Vercel Edge Middleware for rate limiting
    - Create `src/middleware.ts` (extend existing) — add IP-based rate limiting on `/api/ai/*` routes: 10 requests/minute per IP using Vercel `waitUntil` + KV store or simple in-memory rolling window
    - Return `429 Too Many Requests` with `Retry-After` header when limit exceeded
    - _Requirements: Security — rate limiting_

- [ ] 17. Final checkpoint
  - Run full test suite (`npm run test`). Verify property-based tests pass for slot generation and booking total. Ensure no TypeScript errors (`npx tsc --noEmit`). Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP demo
- Each task references specific design sections and requirements for traceability
- Checkpoints (tasks 8, 14, 17) ensure incremental validation before moving to the next phase
- Property tests (tasks 2.3, 2.4) use `fast-check` and validate the universal invariants defined in Design §Testing Strategy
- All Firebase reads/writes use typed Firestore converters to maintain type safety end-to-end
- Leaflet map is dynamically imported (`next/dynamic` with `ssr: false`) to avoid SSR issues
- Razorpay is test mode only — no real payments are processed
- Gemini API calls always include a fallback path for rate-limit and network errors
