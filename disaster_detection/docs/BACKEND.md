# Chatbot Backend – Architecture & Data Flow

## Overview

The disaster assessment chatbot backend is a **retrieval-augmented** flow: user questions are parsed into a structured intent, matching records are fetched from the disaster damage dataset, and an LLM generates a short, factual answer using only that retrieved data.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌────────────────────┐
│   Client    │────▶│  POST /api/chat   │────▶│  Intent Parser  │────▶│  Retrievers         │
│  (frontend) │     │  (messages[])     │     │  (user text →   │     │  (intent + data →   │
└─────────────┘     └──────────────────┘     │   JSON intent)   │     │   records + summary)│
       ▲                      │              └──────────────────┘     └──────────┬──────────┘
       │                      │                            │                     │
       │                      │                      unsupported?                 │
       │                      │                     / no results                 │
       │                      │                            │                     ▼
       │                      │                            │              ┌────────────────────┐
       │                      │                            │              │ Response Generator │
       │                      │                            │              │ (OpenAI, strict     │
       │                      │                            └─────────────▶│  prompt on data)   │
       │                      │                                           └──────────┬──────────┘
       │                      │                                                      │
       │                      ◀─────────────────────────────────────────────────────┘
       │                                 { message }
       └──────────────────────────────────────────────────────────────────────────────
```

## Components

### 1. Chat API (`src/app/api/chat/route.ts`)

- **Input:** `POST` body `{ messages: [{ role: "user"|"assistant", content: string }] }`.
- **Behavior:** Uses the last user message; loads the dataset; parses intent; rejects unsupported questions with a clear message; runs the retriever; either returns a fallback (no results / unsupported) or calls the response generator.
- **Output:** `{ message: string }` or `{ error, message }` with status 400/500.
- **Errors:** Malformed JSON (400), empty messages (400), dataset load failure (500), OpenAI failure (500).

### 2. Intent Parser (`src/lib/chatbot/intent-parser.ts`)

- **Input:** Raw user string.
- **Output:** `{ type: QuestionType, params: Record<string, string> }`.
- **Supported types:** `address_lookup`, `street_lookup`, `region_summary`, `severity_summary`, `dataset_summary`, `top_affected_areas`. Anything else is `unsupported`.
- **Logic:** Keyword and regex patterns (e.g. “damage at 501 River Rd”, “region North”, “severity summary”). Params are normalized (e.g. address, street, region) for the retrievers.

### 3. Data Layer (`src/lib/chatbot/data.ts`)

- **Source:** `public/data/dummy_predictions.json`.
- **Shape:** Array of damage predictions with `id`, `lat`, `lon`, `damage_label`, `confidence`, optional `explanation`, `address`, `street`, `region`.
- **API:** `loadPredictions()` returns `DamageRecord[]`. `normalizeForMatch()` used for case-insensitive matching.

### 4. Retrievers (`src/lib/chatbot/retrievers.ts`)

One function per question type; each returns `RetrievalResult` (intent, params, records, optional summary):

| Intent               | Params    | Behavior |
|----------------------|-----------|----------|
| `address_lookup`     | `address` | Match `address` (normalized). |
| `street_lookup`      | `street`  | Match `street`; add `byLabel` counts. |
| `region_summary`     | `region`  | Match `region`; add `byLabel` counts. |
| `severity_summary`   | —         | All records; `byLabel` counts. |
| `dataset_summary`    | —         | All records; `byLabel`, `byRegion`. |
| `top_affected_areas` | —         | All records; `topAreas` by street/region (count + worst severity). |

### 5. Response Generator (`src/lib/chatbot/response-generator.ts`)

- **Input:** OpenAI client, user question, `RetrievalResult`.
- **Behavior:** Builds a context block (intent, params, summary, record list); system prompt instructs the model to answer **only** from that context and not to hallucinate. Low temperature (0.2), 512 max tokens.
- **Fallbacks:** For unsupported or zero-result address/street/region, returns a fixed message (no LLM call).

## Data Flow (per request)

1. **Validate** body and last user message.
2. **Load** `dummy_predictions.json`; on failure → 500.
3. **Parse** intent from last user message.
4. **Reject** if unsupported → return supported-types message.
5. **Retrieve** records and summary for that intent.
6. **Short-circuit** if unsupported or (address/street/region with no records) → return fallback message.
7. **Generate** answer via OpenAI with strict prompt on retrieved data.
8. **Return** `{ message }` or error payload.

## Supported Question Types (only these)

- **Address lookup** – e.g. “What’s the damage at 501 River Rd?”
- **Street lookup** – e.g. “Damage on Main St”, “River Rd”
- **Region summary** – e.g. “Summary for North”, “Damage in South”
- **Severity summary** – e.g. “Severity summary”, “How many destroyed?”
- **Dataset summary** – e.g. “Overall summary”, “Total records”
- **Top affected areas** – e.g. “Top affected areas”, “Worst areas”

All other questions are rejected with a message listing these types.

## Configuration

- `OPENAI_API_KEY` in `.env.local` – required for LLM responses.
- `OPENAI_CHAT_MODEL` (optional) – e.g. `gpt-4.1` or `gpt-4o-mini`.
- Dataset path: `public/data/dummy_predictions.json` (edit for different data).

## Error Handling

- **No results** (address/street/region): Fixed message, no LLM call.
- **Unsupported question:** Fixed message listing supported types.
- **Dataset load error:** 500 with generic message.
- **OpenAI failure (e.g. 429):** 500 with message suggesting billing or mock mode.

## Modularity

- **Parser** – only knows about user text and intent types.
- **Retrievers** – only know about intent + dataset records; no LLM.
- **Response generator** – only knows about retrieval result + prompt; no parsing.
- **Route** – orchestrates and handles HTTP/errors only.

This keeps the backend easy to extend (new question type = new intent + new retriever branch + optional prompt tweak).
