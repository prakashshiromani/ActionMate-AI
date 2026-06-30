# Google Doc Submission Draft — ActionMate AI

This document contains the exact 5 sections required for your Vibe2Ship project description. Copy and paste the contents below into your submission Google Doc, format them to your liking, set sharing to "Anyone with the link can view", and submit the link on the BlockseBlock platform!

---

## 1. Problem Statement Selected
**Problem Statement 1 — The Last-Minute Life Saver**

### Background Context
Students, professionals, and entrepreneurs frequently face "reminder fatigue." Existing productivity applications rely on passive notifications (like alerts, popups, and nudges) that are easy to swipe away and do nothing to help the user actually complete the task. When a deadline is tomorrow and the calendar is full, reminders do not write presentation slides, schedule study blocks, or draft communications. The primary pain point is the **planning and execution overhead** — deciding when to act, breaking the task into subtasks, and coordinating calendar availability or emails.

---

## 2. Solution Overview
**ActionMate AI** is an AI-powered agentic productivity companion that closes the execution gap. It shifts the paradigm from "reminding" to "resolving". 

ActionMate takes a single natural language input (written or spoken, in English or Hinglish), interprets the user's intent, and autonomously acts in the background. It checks calendar availability, schedules work blocks, and drafts email extensions—presenting everything as unified, editable **Agent Action Cards** for one-click approval. ActionMate enforces a secure trust boundary: no calendar entries are modified or emails sent without explicit user confirmation.

---

## 3. Key Features
* **Zero-Friction Conversational Interface**: Users skip complex form-filling. A natural Hinglish message (e.g. *"Kal client presentation deni hai, slides abhi tak nahi bani."*) is parsed to extract task names, deadlines, priorities, and emotional signals.
* **Autonomous Task Breakdown**: Gemini splits high-level task descriptions into ordered, actionable subtask checklists with estimated durations.
* **Proactive Calendar Syncing**: Calls Google Calendar API to calculate free/busy slots, finding the best times to block focused work slots.
* **Context-Aware Email Drafting**: If a task deadline is at risk due to schedule conflicts, the agent automatically drafts a professional extension request in the user's Gmail drafts folder.
* **Show → Confirm → Execute Flow**: Proactive agent cards render all suggestions with inline edit fields (change times, modify email bodies) before executing the final API calls.
* **Proactive Conflict Nudge**: Scans calendar events and deadlines on page load, displaying warning banner alerts for impending conflicts.
* **Narrated Processing Feedback**: Displays live, cycling status messages (e.g. *"Checking your calendar for tomorrow..."*) so users see what the AI is thinking in real-time.

---

## 4. Technologies Used
* **Frontend Framework**: Next.js 16 (React 19, App Router)
* **Styling**: Tailwind CSS v4
* **Backend Routing**: Next.js App Router API Routes
* **Language Support**: TypeScript
* **Database & Identity**: Firebase SDK (Auth, Firestore, Hosting)
* **AI & NLP**: Google Generative AI Node SDK (`@google/generative-ai`)
* **Workspace APIs**: Google Calendar API & Gmail API integration

---

## 5. Google Technologies Utilized
ActionMate AI is built on a serverless architecture powered 100% by Google Cloud technologies:
1. **Gemini Flash (Google AI Studio)**: Serves as the agent's brain (using the `gemini-flash-lite-latest` model). Utilizes advanced Function Calling tool declarations to determine when to read calendars or draft emails.
2. **Firebase Authentication**: Implements secure user identity management using Google Sign-In and OAuth 2.0.
3. **Cloud Firestore (Native Mode)**: Stores denormalized collections for `users`, `tasks`, and `agent_logs` with composite indexing for query performance.
4. **Firebase Hosting**: Hosts static assets and serves Next.js page routes globally.
5. **Google Calendar API v3**: Used by the agent to list busy slots (`events.list`) and block focused sessions (`events.insert`).
6. **Gmail API v1**: Used by the agent to package raw MIME messages and create draft emails (`drafts.create`).
