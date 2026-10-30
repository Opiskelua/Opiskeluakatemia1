# AI usage and cost audit (Gemini)

Date: 2026-10-30. Read-only audit of `opiskeluakatemia-content` (web/API) and `opiskeluakatemia-mobile/src`. No code was changed.

## 0. Summary

- Every production AI call goes through `getGeminiModel()` (`src/lib/gemini-client.ts:8`). The model is `gemini-3.5-flash-lite` (`src/lib/constants.ts:253`, can be overridden with `GEMINI_MODEL`). **`thinkingLevel: 'low'` is forced on every call** (`gemini-client.ts:18`). Temperature, topP and topK are removed on Gemini 3+ models, so the values set in the routes have no effect. Transient errors (408/429/5xx) are retried up to 3 times within 10 s (`src/lib/gemini-retry.ts`).
- There are **8 live AI call paths**. Four of them generate *generic* exercises from scratch on every click or screen open (grammar, vocabulary, reading). The same content could serve every student, but nothing is cached, stored or reused.
- **Grammar generation alone is probably about 60–70% of the AI bill.** Each exercise takes 3 Gemini calls (generate + 2 review passes), and if the quality gate rejects the result, all 3 are wasted.
- **Nothing generated is cached.** The `ai_response_cache` table and `src/lib/aiCache.ts` exist (migration `20251011063132_046_ai_response_cache_fixed.sql`), but their only user is `src/lib/gemini.ts`, which is dead code in production (only offline `scripts/gen-summary*.ts` import it). No `generated_exercises` table exists.
- **Cost tracking is incomplete.** `recordUserCost` takes flat guessed € values and never stores token counts (`usageMetadata` is ignored). Essay grading and the chat **record no cost at all**. The circuit breaker is effectively a no-op: its state lives in per-instance memory, and `checkCosts()` is never scheduled (`initializeCircuitBreaker` is never called). It only changes state through the admin route. Essay grading and the chat do not check it either.
- Real usage is still pre-launch. `user_ai_costs` for the last 60 days has 8 rows in total (grammar-generate 5, listening-evaluate 2, vocabulary-generate 1). The cost shares below are therefore **modelled**, not measured.

## 1. Inventory of AI call paths

Token estimate: Finnish/English prompt chars ÷ ~3.5. Output includes about 0.5–1k "low" thinking tokens, which are billed as output. "No cap" means no `maxOutputTokens` is set, so the model default (very large) applies.

| # | Endpoint / function | What it does | Called by (trigger) | Calls per use | Input tok | Output tok (incl. thinking) | maxOutputTokens | Stored / reused? | Rate limit | recordUserCost | Circuit breaker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `POST /api/grammar/generate-exercise`, `src/app/api/grammar/generate-exercise/route.ts:50,535,539-543`; review loop `src/lib/grammar-quality.ts:56-76` | Generates a 5–10 question grammar exercise for one of 12 types (articles, prepositions, verb-tenses, SVA, conditionals, modals, relative clauses, word-order, synonym, error-correction, cloze-dropdown, fill-blank-clue) × 3 difficulties. Then 2 more calls: a blind solve and an explanation review. A rejection returns 503, and the user clicks again. | **Web** `src/app/abikurssit/kielioppi/page.tsx:282`: clicking a card, **plus auto-load on page load** via `?autoload=`/`?type=` links from daily tasks (`src/lib/daily-task-generator.ts:217,512`) and `RecommendedTasks.tsx:176`. **Mobile** `src/lib/exercises.ts:7` from `src/app/exercise.tsx:39` (**on screen mount**, plus a "Yritä uudelleen" retry) for the 12 non-`path` grammar choices in `src/lib/catalogue.ts` | **3** (+ full repeat on rejection) | ~0.8k + 1.3k + 1.6k ≈ 3.7k | ~2.1k + 1.1k + 1.1k ≈ 4.3k | 8192 | No. Regenerated per user per click | `checkAIRateLimit`: 50/h per user (default, key not in `RATE_LIMITS`) | 0.008 € × 3 | yes (no-op) |
| 2 | `POST /api/vocabulary/generate`, `src/app/api/vocabulary/generate/route.ts:62,315` | Generates a 3–5 paragraph text with 5–13 gaps or synonym questions (synonym-replace, cloze, fill-blank, word-form) | **Web** `src/components/abikurssit/VocabularyView.tsx:123` (clicking a type card). Not used on mobile. | 1 | ~1.0–1.3k | ~2.0k + thinking ≈ 2.8k | **no cap** | No | 50/h | 0.008 € | yes (no-op) |
| 3 | `POST /api/vocabulary/generate-exercise`, `src/app/api/vocabulary/generate-exercise/route.ts:45,227` | Older duplicate of #2 | **No UI caller** (orphan, but still reachable) | 1 | ~0.8k | ~2.5k | no cap | No | 50/h | 0.008 € | yes |
| 4 | `POST /api/reading/generate`, `src/app/api/reading/generate/route.ts:80,215` | Generates a 300–600 word YO-style text with 5–7 MC/open questions, or a gap-fill summary, with Finnish explanations and model answers | **Web** `ReadingComprehensionView.tsx:96` (click, **plus auto-load on page load** from the daily-task link `daily-task-generator.ts:286`). **Mobile** `exercises.ts:7` for `reading-mc-open` and `reading-gap-fill` (on screen mount) | 1 | ~1.0k | ~2.5k + 1k ≈ 3.5k | **no cap** | No | 50/h | 0.01 € | yes |
| 5 | `POST /api/reading/evaluate`, `src/app/api/reading/evaluate/route.ts:148,181,489` | Grades **open-ended** answers in one batched call (MC is graded without AI). For AI-generated exercises the client sends the exercise (up to 200 KB body) | **Web** `ReadingExerciseMC.tsx:163` (submit). **Mobile** `exercise-model.ts:74` (submit) | 1 if any open-ended question exists (also when the answer is blank) | ~1.2–2k (whole reading text + payload) | ~0.3k + thinking | no cap | Attempt saved to `reading_attempts`; result not reused | 50/h | 0.003 € × open answers (`:607`) | yes |
| 6 | `POST /api/listening/evaluate`, `src/app/api/listening/evaluate/route.ts:159,204` | Grades all open-ended listening answers (static exercises only) in one batched call with the transcript | **Web** `ListeningExercise.tsx:135`. **Mobile** `exercise-model.ts:75` (submit) | 1 (even if all answers are empty) | ~1.2–1.8k | ~1.0k + thinking | no cap | Attempt saved; not reused | 50/h | 0.003 € × questions (`:316`) | yes |
| 7 | `gradeEssay()`, `src/lib/essayGrading.ts:280,297,364`, called from `POST /api/essays/submit` (`src/app/api/essays/submit/route.ts:126-130`) | Full rubric grading (5 categories, evidence quotes, error positions). No JSON mime type, so a parse failure triggers a "repair" call, and the route retries the whole grading once on any non-safety failure | **Web** `KirjoitelmaView.tsx:175`. **Mobile** `src/app/essays.tsx:81` (submit button) | 1 normally, **up to 4** (grade + repair) × 2 | ~1.3k system + essay (typically 0.5–1k, max 15k chars ≈ 4k) | ~3–4k | **no cap** | Result stored on the essay row | `checkRateLimit` 15/h | **none** | **no** |
| 8 | `POST /api/essay-help/chat`, `src/app/api/essay-help/chat/route.ts:118-128` | Tutor chat. The ~4.3k-char system prompt (with the full theory list) is sent with every message, plus the history | **Web** `EssayHelpChat.tsx:219,350`, opened from the chat button and from the **"Miksi vastaukseni oli väärin?" buttons** in `AIGrammarExerciseView.tsx:156`, `GrammarExerciseView.tsx`, `VocabularyView.tsx:498` and `reading/results/[attemptId]/page.tsx:50-77` (embeds the **whole reading text**). Guests can use it on the theory page. Not used on mobile. | 1 per message | ~1.2k system + history (course tier up to 30k chars ≈ 8.5k; message up to 10k) → typically 2–5k | ~0.2k answer + ~0.4k thinking | **no cap** (prompt asks for 50–100 words) | Messages saved for history; responses not reused | course 60/h, free 10/day, guest 3/day/IP + 300/day global (fail-closed) | **none** | **no** |
| — | `src/lib/semanticTools.ts` + `/api/semantic/similarity` | Embeddings | No caller. Disabled unless `ENABLE_SEMANTIC_TOOLS=true` | — | — | — | — | — | 200/h | — | — |
| — | `src/lib/gemini.ts` (flashcards, PDF chat, mindmap, summary, quiz…) | Legacy study-platform functions with `aiCache` | Only offline `scripts/gen-summary*.ts` and `generate-*summary*`. **Dead in production** | — | — | 2048 / 8192 | uses `ai_response_cache` | — | — | — |

These need **no AI** (good): `/api/grammar/evaluate`, `/api/listening/evaluate-mc`, all `/api/abikurssi/*` (learning path v2, path review, daily tasks, grade estimation, flashcards, course-exercises), and `/api/user/motivating-text`.

## 2. What is already ready-made (static)

| Bank | Location | Size | Used by |
|---|---|---|---|
| Grammar sets | `data/grammar-exercises/*.json` | 4 sets (cloze-dropdown ~6 q, error-correction ~10, fill-blank-clue ~5, synonyms ~10) | `course-exercises` API; web + mobile `path` choices |
| Reading | `data/reading-exercises/*.json` | 5 texts (~6–8 q each, with open-ended) | web + mobile (graded by #5 for open answers) |
| Listening open | `data/listening-exercises/*.json` + `public/audio/*.mp3` | 7 | graded by #6 |
| Listening MC | `data/listening-exercises-mc/*.json` | 5 | no AI |
| Learning path v2 | `src/data/learning-path-v2/unit-*.ts` | 4 units (articles, conditionals, passive, tenses), ~12 items each, plus 9 planned units | no AI |
| Learning path v1 | `src/data/learning-path.ts` | 8 nodes | — |
| Vocabulary exercises | `src/data/vocabularyExercises.ts` | 2 synonym + 2 fill-blank; cloze and word-form empty | **no importers found** (unused) |
| Flashcards | `abikurssit-vocabulary-cards.ts` (~400), `englanti-yo-cards.ts` (~300), `course-flashcards.ts` (11 decks) | ~700+ cards | no AI |
| Theory | `course-theory.ts` | 23 sections | no AI |
| Essay topics | `essay-topics.ts` | 21 topics | topics only; grading is AI |
| Articles | `exam-articles.ts`, `season-articles.ts`, `practice-articles.ts`, `articles.ts` | reading-type articles | no AI |
| Grammar check | `grammar-check.ts` | 7 questions | no AI |

Gap: the static banks are tiny compared with the 12 grammar types × 3 difficulties, 4 vocabulary types and 2 reading types that are currently generated live. The live generation exists **because** the banks are thin.

## 3. Modelled cost share

Assumptions: a typical active exam-prep student per day does 3 grammar exercises, 0.5 vocabulary, 0.5 reading generations, 0.5 reading submits with open answers, 0.3 listening-open submits, 0.2 essays and 4 chat messages. Grammar quality-gate rejection is assumed at about 25%. Price is illustrative at **$0.25/M input and $1.50/M output**, flash-lite class; **check the actual 3.5 Flash-Lite price**. The ranking holds for any price where output costs more than input.

| Path | € / use (approx) | Uses / user / day | / user / day | Share |
|---|---|---|---|---|
| #1 Grammar generate (3 calls, +25% rejects) | ~0.0095 | 3 | 0.0285 | **~65%** |
| #8 Chat | ~0.0017 per msg (grows with history; reading "why wrong" embeds the text) | 4 | 0.0068 | **~16%** |
| #4 Reading generate | ~0.0055 | 0.5 | 0.0028 | ~6% |
| #2 Vocabulary generate | ~0.0045 | 0.5 | 0.0023 | ~5% |
| #7 Essay grading (×1.2 for repair/retry) | ~0.0078 | 0.2 | 0.0016 | ~4% |
| #5 Reading evaluate | ~0.0016 | 0.5 | 0.0008 | ~2% |
| #6 Listening evaluate | ~0.0026 | 0.3 | 0.0008 | ~2% |
| **Total** | | | **≈ $0.044 / active user / day** | |

**About 75% of spend is generating generic content that could be identical for every student.**

Worst-case exposure per user under the current limits: 50 grammar generations per hour = 150 calls per hour per user. All generators together allow about 200 generations per hour. The circuit breaker would not stop this.

## 4. Classification

| # | Path | Class | Rationale / action |
|---|---|---|---|
| 1 | Grammar generate | **B** | Generic, identical for everyone. The existing generate + 2-pass review pipeline is a good **offline** bank builder. Run it once through the Batch API (about 50% cheaper), spot-check by hand, and store the results in `data/grammar-exercises/` or a `exercise_bank` table. Serve the user an unseen set from the bank (track by attempt). Target bank: 12 types × 3 difficulties × ~20 sets ≈ 720 sets ≈ **~$5–7 one-off**. Answer keys stay server-side, as for the current static sets, so `/api/grammar/evaluate` grades them without AI. |
| 2 | Vocabulary generate | **B** | Same approach: 4 types × ~25 sets. Fills the empty `vocabularyExercises.ts` cloze/word-form slots. |
| 3 | Vocabulary generate-exercise | **B / delete** | No caller. Remove it, or at least rate-limit it to 0. |
| 4 | Reading generate | **B** | 2 types × 3 difficulties × the 20 TOPICS ≈ 120 texts. Static exercises are then graded from the server copy, which also fixes the "client sends its own exercise and answer key" path in #5. |
| 5 | Reading evaluate (open answers) | **A + C** | Grading a student's own free text needs per-user AI. Skip the call when all open answers are blank or under N chars. Cache by `(exerciseId, questionId, normalizedAnswer)` for bank exercises, since short ≤100-char answers repeat often. Set `maxOutputTokens` ~600 and `responseMimeType: application/json`. |
| 6 | Listening evaluate | **A + C** | Same as #5. Also skip blank answers, and try a cheap exact or keyword match against `modelAnswer` before calling AI. |
| 7 | Essay grading | **A + C** | Must stay per-user. Add `responseMimeType: 'application/json'` (plus a schema), which removes the repair call and most route retries. Set `maxOutputTokens` (~4–5k). Record the cost and check the breaker/budget. Caching by content hash is only useful for resubmits of the same text. |
| 8 | Chat | **A + C** | Free conversation stays AI. The "Miksi väärin?" auto-messages for bank exercises are deterministic, so **pre-generate them or cache them** by `(exerciseId, questionId, chosenAnswer)`. The bank already has `explanation` / `whyOthersWrong`, so show that first and offer the chat only as follow-up. Shrink the system prompt (move the 21-item theory list out, or send it only for the grammar context). Lower the course history cap from 30k to ~8k chars. Set `maxOutputTokens` ~400. Record the cost. |

## 5. Top savings ranked by impact ÷ effort

1. **Replace grammar live generation with a reviewed bank (B).** Cuts about 60–65% of spend and removes the "quality gate rejected, try again" UX. Effort: medium. Offline script reusing `grammar-generate` prompts + `reviewGrammarExercise` + Batch API, JSON/DB storage, a "next unseen set" picker, and switching the web cards (`kielioppi/page.tsx`) and mobile `catalogue.ts` choices to `path`.
2. **Reading and vocabulary to banks (B).** Cuts about 10–11%. Uses the same pipeline as #1, so the marginal effort is small once #1 exists. Also delete the orphan `/api/vocabulary/generate-exercise`.
3. **Chat diet (C).** Cuts about 8–10%. Effort: small. Show the stored explanations before opening the chat, cache "why wrong" per (exercise, question, answer), shorten the system prompt, cap history and output.
4. **Output and JSON hygiene on every call (C).** A few % plus risk removal. Effort: small. Set `maxOutputTokens` on #2, #4–#8 (currently uncapped), use `responseMimeType: application/json` for essay, reading and listening (removes the essay repair + retry, up to 4×), skip AI for blank answers, and check whether `thinkingLevel: 'minimal'` (if 3.5 Flash-Lite supports it) holds grading quality for #5/#6/#8.
5. **Make cost control real (risk cap, not a saving).** Effort: small. Log `response.usageMetadata` tokens in `recordUserCost`, record essay and chat costs, and replace the in-memory circuit breaker with a DB-backed daily budget check (sum of today's `ai_cost_tracking`) called by every AI route. Tighten per-user generation limits from 50/h per endpoint to a daily cap (moot once #1–#2 ship).

With #1–#3 done, the remaining spend is almost entirely class-A grading (essay, open answers, chat). Modelled cost falls from about $0.044 to about $0.008–0.01 per active user per day.

## 6. Other findings

- `src/lib/gemini.ts:544,550` contain leftover debug `fs.appendFileSync('c:\\Users\\Peetu\\...debug.log')` lines (dead code, but should be removed).
- `/api/reading/evaluate` accepts the whole exercise from the client for AI-generated reading (up to a 200 KB body). The client controls both the answer key and the prompt size. This goes away with the bank (#4).
- In `getGeminiModel`, the routes' `temperature`/`topP`/`topK` settings (e.g. reading `temperature: 1.0` "for variety") are silently dropped on Gemini 3+. Variety currently comes only from the random topic.
- `gemini.ts` wraps `generateContent` in its own `retryWithBackoff`, on top of the retry already inside `getGeminiModel`. Harmless while the file is dead, but if it is revived this means up to 9 attempts.
