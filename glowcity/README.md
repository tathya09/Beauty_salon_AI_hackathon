# ✨ GlowCity — Mumbai's AI-Powered Beauty Salon Marketplace

> SuperXgen AI Startup Buildathon 2026 · Built with Next.js 14 · Firebase · Google Gemini AI

---

## 🏗️ Architecture — Where is the "Backend"?

GlowCity uses a **serverless / BaaS architecture**. There is no separate backend server to run.

```
┌─────────────────────────────────────────────────────┐
│              Next.js 14 (one app, all-in-one)        │
│                                                      │
│  ┌──────────────┐   ┌──────────────────────────────┐ │
│  │  Frontend    │   │  Backend (API Routes)         │ │
│  │  /app pages  │   │  /app/api/...                │ │
│  │  React UI    │   │                              │ │
│  │  Tailwind    │   │  /api/ai/chat      ← Gemini  │ │
│  │  Framer      │   │  /api/ai/style-match          │ │
│  └──────────────┘   │  /api/ai/embed-search         │ │
│                     │  /api/ai/generate-promo-copy  │ │
│                     │  /api/payments/create-order   │ │
│                     │  /api/payments/verify         │ │
│                     └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
   Firebase (BaaS)           External APIs
   ─────────────           ─────────────────
   Firestore (DB)           Google Gemini AI
   Firebase Auth            Razorpay Payments
   Firebase Storage         OpenStreetMap (maps)
```

**The backend IS the Next.js API routes** — they run as serverless functions on Vercel.
Firebase handles the database, auth, and file storage. No Express/Django/Node server needed.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A Firebase project (free)
- A Google Gemini API key (free)

### Step 1 — Install dependencies
```bash
cd glowcity
npm install
```

### Step 2 — Set up environment variables
```bash
cp .env.production.example .env.local
```
Then fill in `.env.local` with your actual keys (see Setup Guides below).

### Step 3 — Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) — the app is running!

> **Both frontend AND backend start together** with `npm run dev`.
> The API routes are available at `http://localhost:3000/api/...`

---

## 🔑 Getting Your Free API Keys

### Firebase (Database + Auth + Storage)
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project → **"GlowCity"**
3. Add a Web App → copy the config object into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`)
4. Go to **Project Settings → Service Accounts** → Generate new private key → download JSON
5. Copy `project_id`, `client_email`, `private_key` into `.env.local` (`FIREBASE_ADMIN_*`)
6. Enable **Authentication** → Sign-in methods → Google ✓, Phone ✓
7. Enable **Firestore Database** → Start in test mode
8. Enable **Storage** → Start in test mode

### Google Gemini API (AI Features)
1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create API key → copy into `GEMINI_API_KEY`
3. Free tier: 15 requests/minute, 1 million tokens/day

### Razorpay (Payments — Test Mode)
1. Go to [https://dashboard.razorpay.com](https://dashboard.razorpay.com) → sign up free
2. **Settings → API Keys** → Generate Test Keys
3. Copy into `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`

---

## 🌱 Seed Demo Data

After setting up Firebase, populate the database with 10 Mumbai salons:
```bash
# Set env vars first, then run:
npm run seed
```
This creates 10 salons, services, 7 days of time slots, and 2 test users.

---

## 📁 Project Structure

```
glowcity/
├── src/
│   ├── app/
│   │   ├── (public)/          ← Customer-facing pages
│   │   │   ├── page.tsx       ← Landing page
│   │   │   ├── salons/        ← Discovery + detail + booking
│   │   │   ├── ai-assistant/  ← Glow AI chat page
│   │   │   └── style-match/   ← AI Style Matcher page
│   │   ├── (auth)/            ← Login & register
│   │   ├── dashboard/         ← Customer & owner dashboards
│   │   └── api/               ← 🔑 BACKEND lives here
│   │       ├── ai/
│   │       │   ├── chat/          ← Gemini AI chat
│   │       │   ├── embed-search/  ← AI-powered salon search
│   │       │   ├── style-match/   ← Gemini Vision style analysis
│   │       │   └── generate-promo-copy/ ← AI marketing copy
│   │       └── payments/
│   │           ├── create-order/  ← Razorpay order creation
│   │           └── verify/        ← Payment signature verification
│   ├── components/            ← Reusable UI components
│   ├── lib/
│   │   ├── firebase/          ← Firebase client + admin + auth
│   │   └── repositories/      ← Firestore CRUD operations
│   ├── hooks/                 ← React hooks (useAuth)
│   ├── store/                 ← Zustand state (auth, discovery)
│   ├── types/                 ← TypeScript interfaces
│   └── utils/                 ← Helpers (format, slots, booking)
├── scripts/
│   └── seed.ts               ← Database seeder
├── firestore.rules            ← Firestore security rules
├── storage.rules              ← Storage security rules
├── firestore.indexes.json     ← Composite indexes
├── vercel.json                ← Vercel deployment config
└── .env.local.example         ← Environment variable template
```

---

## 🛠️ Available Commands

```bash
npm run dev        # Start dev server (frontend + backend together)
npm run build      # Build for production
npm run start      # Start production server
npm run test       # Run tests (Vitest + property-based tests)
npm run seed       # Seed Firebase with demo data
npm run lint       # ESLint check
```

---

## 🚢 Deploy to Vercel (Free)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from glowcity/ directory
vercel

# Set all environment variables in Vercel dashboard:
# vercel.com/your-project/settings/environment-variables
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## 🤖 AI Features

| Feature | API Route | Model | What it does |
|---|---|---|---|
| Glow AI Chat | `/api/ai/chat` | Gemini 1.5 Flash | Conversational booking assistant |
| Style Matcher | `/api/ai/style-match` | Gemini Vision | Analyses inspiration photos |
| Smart Search | `/api/ai/embed-search` | Gemini 1.5 Flash | Natural language salon search |
| Promo Copy | `/api/ai/generate-promo-copy` | Gemini 1.5 Flash | Instagram/WhatsApp/Website copy |

All AI features gracefully fall back to non-AI alternatives if the Gemini API is unavailable.

---

## ✅ Hackathon Checklist

- [x] City-based salon marketplace (Mumbai)
- [x] AI integration (Google Gemini — chat, vision, search, copy)
- [x] Real-time booking with slot management
- [x] Payment integration (Razorpay test mode)
- [x] Auth (Google sign-in + Phone OTP)
- [x] Customer dashboard (bookings, profile, style preferences)
- [x] Salon owner dashboard (overview, slots, AI promo copy)
- [x] Map view (Leaflet + OpenStreetMap — 100% free)
- [x] Responsive UI (Tailwind + shadcn/ui)
- [x] Deployable on Vercel free tier
- [x] All services on free tier (Firebase, Gemini, Vercel)

---

Built with ❤️ for SuperXgen AI Startup Buildathon 2026
