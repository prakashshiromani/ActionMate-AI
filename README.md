# 🤖 ActionMate AI
> **Don't just remind. Resolve.** — A serverless, client-delegated AI productivity agent that turns messy prompts into scheduled calendar blocks and email drafts in one click.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.9-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.4-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-CSS_v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini Flash](https://img.shields.io/badge/Google_AI-Gemini_Flash-8e75c8?style=flat-square&logo=google-gemini)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Database-Firestore-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com/)

ActionMate AI is built for the **Vibe2Ship Hackathon (Problem Statement 1 — The Last-Minute Life Saver)**. Moving beyond passive notifications that suffer from "reminder fatigue," ActionMate is an *execution-first engine*. It autonomously parses tasks (in English or Hinglish), breaks them down, checks Google Calendar availability, reserves work blocks, and drafts Gmail extensions on your behalf.

---

## 🏗️ System Architecture

ActionMate is designed with a **Serverless JAMstack architecture** enforcing a strict trust boundary via a **Show → Confirm → Execute** workflow.

```
                  ┌──────────────────────────────┐
                  │       Client Browser         │
                  │   Next.js 16 + Tailwind v4   │
                  └──────────────┬───────────────┘
                                 │
                   [1] Input text│ [4] Approve actions
                     / Voice     │   (Calendar/Gmail)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Backend (Next.js API Routes)                   │
│                                                                  │
│  ┌────────────────────────┐         ┌─────────────────────────┐  │
│  │   /api/agent/process   │         │    /api/agent/execute   │  │
│  │  ┌───────────────────┐ │         │  ┌────────────────────┐ │  │
│  │  │ Gemini Tool Loop  │ │         │  │ Google Calendar API│ │  │
│  │  │   (Function   │ │         │  ├────────────────────┤ │  │
│  │  │    Calling)       │ │         │  │ Google Gmail API   │ │  │
│  │  └─────────┬─────────┘ │         │  └──────────┬─────────┘ │  │
│  └────────────┼───────────┘         └─────────────┼───────────┘  │
└───────────────┼───────────────────────────────────┼──────────────┘
                │                                   │
                ▼                                   ▼
      ┌──────────────────┐                ┌──────────────────┐
      │  Google Cloud    │                │  Cloud Firestore │
      │  AI Studio API   │                │  (Tasks / Logs   │
      └──────────────────┘                └──────────────────┘
```

### 🔒 Key Architectural Highlights
1. **Client-Delegated OAuth (No Database Tokens)**: Google Calendar and Gmail access tokens are acquired on the client via Firebase Auth's Google Provider scopes, stored temporarily in `sessionStorage`, and passed only via request headers (`x-google-access-token`) to API routes. They are **never stored** in the database.
2. **Strict Trust Boundary**: The AI loop runs tools on the server and returns *pending action payloads* to the client. Real modifications in Google Workspace only happen during the second `/api/agent/execute` request after explicit user approval.
3. **Sandbox / Simulation Fallback**: If no environment keys are supplied, the app enters **Simulated Sandbox Mode**, running mocked agent behaviors client-side. This ensures a friction-free evaluation experience.

---

## 📂 Codebase Overview

```
actionmate-ai/
├── app/                          # Next.js App Router Pages & API handlers
│   ├── (auth)/login/page.tsx     # Google Sign-In with Sandbox bypass
│   ├── api/agent/process/route.ts# Backend orchestrator & Gemini function-calling loop
│   ├── api/agent/execute/route.ts# Execute endpoint (Google API write layer)
│   ├── dashboard/page.tsx        # Unified Command Center (resizable chat, task lanes, details)
│   ├── layout.tsx                # App root layout with system fonts
│   └── globals.css               # Styling configs with Tailwind CSS v4 variables
├── components/                   # Shared UI Components
│   ├── AgentActionCard.tsx       # Sugggestion review card (Approves/Edits/Rejects)
│   ├── AgentActivityLog.tsx      # Terminal timeline of executed AI tasks
│   ├── ConflictBanner.tsx        # Calendar event clash notification alert
│   └── SubtaskList.tsx           # Checkbox items for task details
├── lib/                          # Utility wrappers
│   ├── firebase.ts               # Client Firebase initializer
│   ├── firebaseAdmin.ts          # Server Firebase Admin SDK initializer
│   ├── gemini.ts                 # Gemini API config, tools, and processing loops
│   ├── googleCalendar.ts         # Calendar list & insert wrappers
│   └── gmail.ts                  # Gmail draft creation wrapper
├── types/                        # Shared TypeScript structures
│   └── index.ts                  # Typings for Task, Action, User preferences
├── docs/                         # Hackathon submissions documents
│   ├── prd_v2.md                 # Product Requirements Document
│   ├── trd_v2.md                 # Technical Requirements Document
│   ├── ui_ux_v2.md               # UI/UX Brief
│   └── Implementation_Plan_v2.md # Phase-wise execution schedule
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
* **Node.js**: v20 or higher
* **npm**: v10 or higher

### 2. Installation
Clone the repository and install all peer dependencies:
```bash
git clone https://github.com/your-username/actionmate-ai.git
cd actionmate-ai
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root folder (use `.env.example` as a template):
```bash
cp .env.example .env.local
```

Fill in the following keys inside `.env.local`:
```env
# Gemini AI Studio Key
GEMINI_API_KEY=your_gemini_api_key

# Firebase Client SDK Credentials (from Firebase Console -> Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_apiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_authDomain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_projectId
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storageBucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messagingSenderId
NEXT_PUBLIC_FIREBASE_APP_ID=your_appId

# Firebase Admin Credentials (from Project Settings -> Service Accounts -> Generate Private Key)
FIREBASE_ADMIN_PROJECT_ID=your_projectId
FIREBASE_ADMIN_CLIENT_EMAIL=your_clientEmail
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 4. Running Scripts

| Command | Action |
|:---|:---|
| `npm run dev` | Launch local development server on [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Validate typings and compile production build using Next.js Turbopack |
| `npm run start` | Run the compiled production server locally |
| `npm run lint` | Inspect codebase for code consistency (ESLint checks) |

---

## ☁️ Google Cloud Deployment

The application is fully prepared for global serverless hosting on **Firebase Hosting** backed by **Cloud Run**.

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Google Cloud Firebase
firebase login

# Initialize project hosting settings
firebase init

# Deploy compiled pages and serverless API endpoints
firebase deploy
```

---

## 🎯 Submission Context (Vibe2Ship Hackathon)
* **Problem Statement**: PS1 — The Last-Minute Life Saver
* **Selected Tech Stack**: Next.js 16 · React 19 · Tailwind CSS v4 · Gemini Flash (AI Studio) · Cloud Firestore · Firebase Auth · Firebase Hosting · Google Workspace APIs
* **Project Documentation**: Available under [docs/](./docs) directory.
* **Submission Google Doc Draft**: Copy/paste ready contents located at [google_doc_draft.md](./google_doc_draft.md).
