# Accurate AI-generated English grammar and vocabulary exercises (YO English, long syllabus)

Researched and audited 2026-10-30. The audit was read-only and no code was changed.

**The quality bar:** zero wrong answer keys, zero items with two defensible answers, and zero wrong explanations.

**How this document is organised:**
- Part A summarises the research, with sources.
- Part B audits our code and the hand-written Polku v2 curriculum, with file:line references.
- Part C is a prioritised design for improving it.

The companion document `open-grammar-resources.md` lists licence-safe sentence and rule sources for grounding.

---

## Part A — Research summary

### A1. How often LLM-generated items are wrong

None of the studies we found reaches zero errors without human review.

- **Donati et al. (CLiC-it 2024)** generated 950 English grammar multiple-choice cloze items across 19 topics.
  - 85% passed a rule-based structural check, but only 79% were judged fit for learners by a human expert.
  - Violations of common sense were the most frequent error, and conditionals were among the weakest topics (0.76 structural pass rate).
  - Sources: https://aclanthology.org/2024.clicit-1.39/ and https://aclanthology.org/2024.clicit-1.39.pdf
- **Vocabulary cloze generated with GPT-3.5:** 75% of sentences and about 67% of options were well-formed. Some distractors were in fact acceptable answers. https://arxiv.org/abs/2403.02078
- **VocQGen** "occasionally produces distractors that are acceptable as correct responses". https://harvester.ues.edu.sv/vufind/ProQuestFSGRecord/3206872047?lng=fr
- **ChatGPT medical quizzes:** 49% of items had item-writing flaws and 22% had factual errors. https://researchdiscovery.drexel.edu/esploro/outputs/journalArticle/LLM-Generated-Multiple-Choice-Practice-Quizzes-for/991022059818004721
- LLMs keep producing item-writing flaws even when given explicit rubrics. https://questionwell.org/hubfs/Papers/mcq-paper-llncs-main.pdf?hsLang=en

**Takeaway:** a generator on its own will produce roughly one bad item in five to ten. Zero tolerance therefore needs (a) strong automatic filters and (b) a human-reviewed cache for anything presented as authoritative.

### A2. Distractors: plausible, but definitely wrong

- **Zesch & Melamud (2014)** split distractor work into two steps:
  - *Candidate selection*, which controls difficulty.
  - *Reliability checking*, which ensures the distractor does not fit the context. A near-synonym such as "purchase" for "buy" is an invalid distractor. https://mirror.aclweb.org/acl2014/W14-18/pdf/W14-1817.pdf
- Ren & Zhu point out that most systems skip the reliability step. https://arxiv.org/abs/2004.09853
- An EMNLP 2024 survey finds that LLMs still struggle to be plausible *and* reliable at once, and sometimes produce two correct answers. https://arxiv.org/abs/2402.01512
- Distractor evaluation is under-researched (Benedetto, Taslimipoor & Buttery, BEA 2025). https://aclanthology.org/2025.bea-1.5.bib
- **Closed option sets by rule (Donati et al.):**
  - For inflection topics, every option shares the key's lemma (go / went / gone), so the item tests only form.
  - For function-word topics, keys and distractors come from a hand-made closed list.
  - This removes most "a second option is also fine" failures by construction.

### A3. Ambiguity detection, blind solving and self-consistency

- **Self-consistency (Wang et al. 2022):** sample several reasoning paths and take the majority answer. https://arxiv.org/abs/2203.11171
  - Applied to item checking: let a solver that never sees the key answer each item N times, using at least two model families.
  - Discard the item on any disagreement with the key or any split vote.
- **Agreement can hide errors.** When the generator and the evaluator agree, mistakes can still slip through, and highly consistent models can still be wrong. https://www.alphaxiv.org/abs/2606.30653
  - The verifier should therefore be a different model or model family, run with higher reasoning effort, and should see no key.
- **Option-free probe:** ask, without showing the options, "list every word or phrase that would make this sentence grammatical and natural". If more than one filler that is not the key appears among the options, the item is ambiguous. https://openaccess.thecvf.com/content/CVPR2026/supplemental/Liu_Beyond_Multiple_Choice_CVPR_2026_supplemental.pdf
- **How reliable LLM judges are:**
  - Judges agree with experts mainly on questions the judge can answer itself. Giving the judge expert reference material helps. https://arxiv.org/abs/2503.05061
  - Detecting item-writing flaws: a rule-based method caught 91% of flaws and GPT-4 caught 79%. https://arxiv.org/abs/2307.08161
  - Claude and Gemini agree moderately to strongly with experts on objective flaws. The authors recommend a hybrid with human review. https://avesis.uludag.edu.tr/yayin/cdc07923-6107-46d1-a5fd-2c57115decca/assessing-multiple-choice-question-quality-in-internal-medicine-a-comparative-analysis-of-three-large-language-models-against-expert-consensus
  - Known judge vulnerabilities are catalogued here: https://arxiv.org/abs/2406.12624

### A4. Rule-grounded generation

- **Glandorf & Meurers (BEA 2024)** control generation by English Grammar Profile (EGP) constructs. https://aclanthology.org/2024.bea-1.24/ (code: https://github.com/dominikglandorf/LLM-grammar)
- EGP-controlled dialogue generation: https://arxiv.org/abs/2502.07544
- Retrieving EGP patterns into the prompt beats prompting without retrieval for sentence generation at a target CEFR level. https://etd.lib.nthu.edu.tw/detail/85103907c820d285a55f3ab443f1b878
- Hybrid rule and LLM analysis: https://arxiv.org/abs/2603.17171
- **Implication:** put *our own* rule card (rule, allowed key forms, allowed distractor forms, known exceptions) into the prompt. Then validate deterministically against that card.

### A5. Item-writing guidelines (Haladyna, Downing & Rodriguez 2002; Rodriguez 2005)

- 31 guidelines (https://doi.org/10.1207/S15324818AME1503_5). Summary: https://cpl.health.unm.edu/AssetListing/Writing-Questions-for-Learning-and-Assessment-2573/Rules-for-Multiple-Choice-Items-Haladyna-et-al-2002-5943
- The guidelines relevant here:
  - One right answer, with its position varied (balanced across positions).
  - Options independent of each other and homogeneous in content and grammar.
  - Options of similar length.
  - Distractors based on typical student errors.
  - No grammatical clues from the stem.
  - Avoid "all of the above".
- **Rodriguez (2005):** three options are optimal in most settings. https://doi.org/10.1111/j.1745-3992.2005.00006.x
  - For us, fewer and better distractors also means fewer chances of an accidental second correct answer.

### A6. Automatic validators (LanguageTool)

- **Public API limits:** 20 requests per minute, 75 KB of text per minute, 20 KB per request. https://dev.languagetool.org/public-http-api
  - Some rules are closed-source, and LanguageTool advises self-hosting for automated use.
  - The Premium API allows 80 requests per minute. https://help.languagetool.org/en/articles/307929-does-languagetool-offer-an-api
- **How to use it:**
  - The sentence filled with the key must produce zero matches.
  - For each distractor, a grammar match in the filled sentence is positive evidence that the distractor is wrong.
  - No match does *not* prove a distractor wrong. LanguageTool misses most tense, aspect and article-semantics choices, so such items still go to the blind solver.

### A7. CEFR level control

- **English Vocabulary Profile and English Grammar Profile** grade words and constructions A1–C2, but are licensed for non-commercial use only. https://www.englishprofile.org
- **CEFR-J and Octanove C1/C2 lists** allow commercial use with attribution. https://github.com/openlanguageprofiles/olp-en-cefrj
- CEFR-controlled generation, including the CALM model: https://arxiv.org/abs/2406.03030
- LLMs judging the lexical CEFR level of words: https://www.anlp.jp/proceedings/annual_meeting/2026/pdf_dir/Q4-9.pdf
- **Implication:** look up the target words in CEFR-J / Octanove lists (roughly B2–C1 for the long syllabus). Do not trust the model's own level labels.

### A8. Feedback that helps learning, and the risk of wrong explanations

- **Shute (2008):** elaborated feedback that explains what, how and why beats plain right/wrong verification. Give it in manageable units. https://myweb.fsu.edu/vshute/pdf/shute%202008_b.pdf
- **Retrieval practice:** Roediger & Karpicke (2006). https://doi.org/10.1111/j.1467-9280.2006.01693.x
- **Spacing:** Cepeda et al. (2006). https://www.evullab.org/pdf/CepedaPashlerVulWixtedRohrer-PB-2006.pdf
- **LLM grammar explanations are risky:**
  - GPT-4 one-shot grammar-error explanations were correct for only 60.2% of errors. A two-step pipeline (first extract the edit, then explain it) reached 93.9–98%. https://arxiv.org/abs/2311.09517
  - Marking the edits to be explained improved explanation validity. https://arxiv.org/abs/2309.11439
  - ChatGPT explained the Spanish subjunctive adequately only rarely, and rejected legitimate structures. https://jezikoslovlje.ffos.hr/en/clanci/profesor-chatgpt-koristenje-alata-umjetne-inteligencije-za-savladavanje-gramatike-stranih-jezika/en
- **Implications:**
  - Give error-specific feedback: one short "why this distractor is wrong" per option, tied to the rule card.
  - Explanations should be templated from the rule card plus a short sentence-specific note, not free-form.
  - Put missed items back into spaced review. The Polku v2 review sessions already partly do this.

### A9. Format of the YO English long-syllabus exam

- **Source:** the YTL language-exam regulations. https://www.ylioppilastutkinto.fi/sites/default/files/sites/default/files/documents/kielikokeet_maaraykset_2023s_fi.pdf
- **Skills measured:** listening, reading, vocabulary and structures, and writing. The structures and vocabulary section is worth 20–40 of 299 points.
- **Task types:** "erilaiset monivalinta- ja aukkotehtävät sekä vapaat tuottamistehtävät" (various multiple-choice and gap tasks, and free production tasks), built on authentic material.
- **Format in practice:** multiple-choice gaps in a *continuous text* (drop-down menus), and open gaps with a clue (a Finnish word to translate, an English word to inflect, or a grammatical term).
- **YTL itself accepts multiple answers.** After statistical item analysis, YTL "saattaa joissakin kysymyksissä hyväksyä useita vastausvaihtoehtoja" (may accept several options for some questions). Even professionally written items turn out ambiguous, so we should also run item analysis on real learner answers.

---

## Part B — Audit findings

Severity scale:
- **S1:** a wrong key or wrong teaching reaches students.
- **S2:** ambiguity, or a valid answer is marked wrong.
- **S3:** a quality or format weakness.

### B1. Grammar generator: `src/app/api/grammar/generate-exercise/route.ts` and `src/lib/grammar-quality.ts`

This is the best-guarded of the generators. It has structural validation, a blind solve and an explanation review, and it rejects the whole set if any item fails (fail-closed). It still has these gaps:

1. **The verifier is not independent (S2).**
   - The blind solve and the review use the *same model instance*: the same Gemini model, with thinking forced to `low` in `src/lib/gemini-client.ts:18`.
   - It is one sample at a fixed temperature (`route.ts:539-543`, `grammar-quality.ts:58,69`). Correlated errors pass. There is no multi-sample or cross-family vote.
2. **The explanation review sees the key (S2).** At `grammar-quality.ts:69` the reviewer receives the full exercise including `correctIndex` and the explanation, which invites anchoring. The research (A3, A8) says to verify explanations against a *rule reference*, not the generator's own claim.
3. **Hint fields leak into the blind solve (S3).** `grammar-quality.ts:57` strips only the key fields. `conditionalType`, `meaning` (e.g. "prohibition"), `clauseType`, `subject` and `verb` all reach the solver, so a weak item can pass because the metadata answers it.
4. **Open gaps are checked against one string (S2).**
   - For `fill-blank-clue` and `error-correction`, the solver's answer is compared only with `correctAnswer`/`correctWord` (`grammar-quality.ts:66-67`), not with `acceptableAnswers`. Valid alternatives cause false rejections.
   - More importantly, **nothing checks that `acceptableAnswers` is complete**. The client grades by exact match (`src/components/abikurssit/GrammarExerciseView.tsx:116,134,304`; `FillBlankClueQuestion.tsx:39-40`), so a correct answer that the generator did not list is marked wrong.
5. **No rule grounding (S2).** Every prompt is "make 10 items about X" with one example. There is no rule text, no closed list of allowed key and distractor forms, and no list of known traps (BrE/AmE variation, stative verbs, collective nouns).
   - The rule cards already exist in `src/data/course-theory.ts` and in the Polku `guide` objects, but are not used.
6. **Prompt examples that teach the wrong thing:**
   - `route.ts:179`, **verb-tenses (S3, borderline S2):**
     - The example stem "Choose the present simple form: I ___ to the gym three times a week." names the answer in the stem. That trains the model to write trivial, non-exam items.
     - Without the label, the distractor "am going" is defensible as a temporary habit (*I'm going to the gym three times a week at the moment*), which demonstrates exactly the ambiguity we want to avoid.
   - `route.ts:431-435`, **error-correction (S1 explanation):** "…too difficult, what is not true" → "which" is the right key, but the example explanation "which käytetään ei-ihmisistä asioista lauseen keskellä" (which is used for non-human things in the middle of a sentence) is wrong. This is a *sentential* relative clause referring to the whole preceding clause. The prompt is teaching the model to write wrong explanations.
   - `route.ts:199`, **subject-verb agreement (S2):** asks for "kolmektiivinounit" (a typo for collective nouns). Collective nouns (team/family/government + is/are) are exactly where BrE accepts both forms, so this deliberately invites two-key items.
   - `route.ts:305-306`, **relative clauses (S2):** the allowed pronouns include both *which* and *that* for defining clauses. Unless the generator is told never to offer both (or zero-relative-valid contexts with "—"), it will produce items with two correct answers.
   - `route.ts:111` and `:94`, **articles (S2):** always four options a / an / the / –. *The* versus zero article and *a* versus *the* are often context-dependent. A three-option design per sub-rule (A5) would be safer.
   - `route.ts:269-270`, **modal verbs (S2):** the meanings listed (ability, permission, obligation, recommendation, possibility) map to near-synonyms such as may/might/could and must/have to/should. Modals are the highest-ambiguity topic and need closed per-meaning option sets.
   - `route.ts:372-400`, **synonym (S3):**
     - The example sentence ("Even with this impressive success of **harnessing** nature's bounty…") looks like authentic exam or source text. Check its rights and origin.
     - The instructions say "underlined" but the format is bold.
     - The distractor "manipulating" is not clearly wrong for "harnessing" in every reading.
7. **Difficulty substitution is a blind regex (S3).** `route.ts:533` replaces "intermediate" everywhere, including inside "intermediate-advanced". "Advanced" has no CEFR descriptor or vocabulary-list control.
8. **No answer-position balancing (S3).** The example keys sit mostly at index 0–2, and the generated options are never shuffled.
9. **AI sets are scored on the client (S3, integrity).** `src/app/api/grammar/evaluate/route.ts` says AI sets "are scored by the client that generated them". Keys ship to the browser, and the client-reported scores feed grade estimation and skill profiles.

### B2. Vocabulary generators: `src/app/api/vocabulary/generate-exercise/route.ts` and `src/app/api/vocabulary/generate/route.ts`

10. **No quality gate at all (S1).**
    - There is no schema validation and no check that `correctAnswer` is one of the `options`.
    - There is no duplicate or ambiguity check and no blind solve.
    - `responseMimeType: 'application/json'` is not set: `getGeminiModel({})` is called at `generate-exercise/route.ts:45` and `generate/route.ts:62`.
    - Whatever Gemini returns is shown to students with its key.
11. **Wrong acceptable-answer examples (S1).**
    - `generate-exercise/route.ts:145,166`: the clue "vaatisi" (would require) is listed with acceptable answers `["would require","required","requires"]`. "requires" is wrong in the source context ("she realized it ___ her…"), and none of the alternatives except "would require" render the Finnish conditional. This teaches the model to pad `acceptableAnswers` with wrong tenses.
    - `generate/route.ts:251` repeats the pattern with `["required","would require"]`.
12. **Possibly authentic exam text in the prompt (S3).** "Angel Yang … Introverts in the Workplace" and the clue list ("jähmettyisi", "pose", "see and hear") at `generate/route.ts:188-245` look copied from a past YO exam. Check rights and remove; it also causes near-duplicate generations.
13. **Duplicate gap IDs (S3, a grading bug).** At `generate-exercise/route.ts:255-263` the gap IDs are rebuilt per paragraph with `idx` restarting at 1, so a two-paragraph text gets duplicate IDs.
14. **Raw model output leaks (S3).** `generate/route.ts:347` returns `raw: text` to the client on a parse error.

### B3. Reading generator: `src/app/api/reading/generate/route.ts`

15. **Fabricated sources (S1 for trust).** At lines 122, 153 and 189 the model must write `source: "Adapted from [lähteen nimi], [vuosi]"` (source name, year) for an invented text. This creates fake citations. Use "Opiskeluakatemia (AI-generated practice text)" instead.
16. **Summary gap-fill has a single one-word key and exact-match grading (S2).**
    - Line 138 asks for one key word per gap.
    - `src/app/api/reading/evaluate/route.ts:451-453` grades with `userAnswer === correctAnswer`.
    - Synonyms and inflectional variants are marked wrong. Real YO summary gaps accept several words.
17. **No answerability or uniqueness check (S2).** There is no step that verifies the text supports exactly one MC option, and nothing balances the key position.
    - `temperature: 1.0` at line 82 is silently dropped for Gemini 3 (`gemini-client.ts:12-18`), so it is dead config.

`src/lib/gemini.ts` holds flashcard, quiz, mindmap and summary generation. It is not on the YO grammar or vocabulary path, so it was not audited item by item. The general rules below still apply to its quizzes.

### B4. Hand-written Polku v2 curriculum (`src/data/learning-path-v2/unit-*.ts`)

**Scope of the check:**
- All 128 items in the four built units (articles, tenses, conditionals, passive) were checked one by one, along with the `guide` texts and the grader.
- **No item has an outright wrong key.** For every item the keyed answer is correct English.
- The issues below are *defensible second answers*, *missing accepted alternatives* in open gaps, and *inaccurate or over-general explanations* or factual claims.

**Ambiguous items (a second option is defensible), S2:**

| Item | File:line | Problem | Fix |
|---|---|---|---|
| passive-3-q5 | unit-passive.ts:75 | "It ___ that the new phone will be released in May." The distractor **"says"** is grammatical: *It says (here / in the article) that…* is everyday English. | Give "it" no possible referent, e.g. "According to rumours, it ___ that…", or "It ___ by many fans that…" (then "says" is impossible). Or replace the "says" option with "is saying". |
| passive-cp-q6 | unit-passive.ts:113 | "We ___ a discount because the train was late." **"gave"** is grammatical and plausible if "we" are the railway staff. | Add the agent: "We ___ a discount by the railway company because…". |
| tenses-cp-q1 | unit-tenses.ts:104 | "Every summer my family ___ a cottage…" The distractor **"rent"** is acceptable in British English (a collective noun with plural agreement). The explanation "Family on yksikkö" (family is singular) is over-general. | Use a non-collective subject (e.g. "my uncle"). Alternatively, keep the item but remove "rent" and focus it on simple versus continuous. |
| tenses-1-q1 | unit-tenses.ts:27 | "My father ___ to work by train every morning." **"is going"** is defensible as a temporary habit. Low risk, since the stem has no temporariness cue. | Optional: add "always" or "has … for years", or accept it as is. |
| passive-2-q1 | unit-passive.ts:50 | The distractor "hasn't finished" is grammatical intransitive *finish* (cf. "the concert hasn't finished"). Semantically odd for a library, so low risk. | Optional: use "The new library ___ yet; the builders are still working." |

**Open gaps where valid answers are not accepted, S2.** Students are marked wrong for correct English:

| Item | File:line | Missing valid answer(s) |
|---|---|---|
| conditionals-3-q4 | unit-conditionals.ts:74 | **might have helped / might've helped**. These are accepted in the parallel item conditionals-cp-q5 (line 108) but not here, which is inconsistent. |
| conditionals-1-q3 | unit-conditionals.ts:29 | **pass** (zero conditional: "If you study hard, you pass the exam" is grammatical), plus **can pass / should pass**. Either add them, or change the hint and instruction to force *will* (e.g. instruction "Käytä will-muotoa" (use the will form)). |
| conditionals-cp-q2 | unit-conditionals.ts:105 | **is raining / 's raining** ("If it's raining tomorrow, …" is natural English). |
| passive-3-q3 | unit-passive.ts:73 | **to have been** ("The suspect is believed to have been in Spain") fits the hint "be". |
| conditionals-4-q3 | unit-conditionals.ts:94 | **had had** is defensible if the essay deadline has passed. Low risk; "this essay" suggests the present. Consider adding "now" ("If only I ___ more time now…"). |
| conditionals-2-q5 | unit-conditionals.ts:54 | **had known** (a mixed conditional) is grammatical. Low risk; it could be accepted. |

**Explanation and fact problems, S1 or S2 for "wrong explanation":**

| Item | File:line | Problem | Fix |
|---|---|---|---|
| passive-1-q3 | unit-passive.ts:29 | **Factually wrong.** "The Harry Potter books ___ by J. K. Rowling between 1997 and 2007." Rowling began writing in 1990; 1997–2007 is the *publication* period. | Use "were published … between 1997 and 2007" with a hint of "publish", or keep "write" and drop the dates. |
| passive-2-q1, passive-cp-q3 | unit-passive.ts:50, 110 | The explanation "yet vaatii perfektin" (yet requires the perfect) is over-general: AmE "Did you … yet?" and "isn't finished yet" (adjectival) are both correct. tenses-2-q6 (unit-tenses.ts:53) handles this nuance correctly. | Add the same caveat: "brittienglannissa ja yo-kokeessa yleensä perfekti" (in British English and the YO exam, usually the perfect). |
| tenses-cp-q1 | unit-tenses.ts:104 | The explanation "Family on yksikkö" (family is singular) is not true in BrE. | See the ambiguity table above. |
| articles-1-q4 + guide | unit-articles.ts:23, 30 | The rule "Ammattinimikkeen edessä tarvitaan artikkeli" (a job title needs an article) has known exceptions: unique roles after *as / become / elect* ("He was elected president", "as captain of the team"). The key is right; the rule is stated absolutely. | Add "yleensä" (usually) or mention the exception. |

**Structural weaknesses in the curriculum, S3:**
- **Key-position bias.** Of the 82 choice items, the key is at index 0 in 29 items, index 1 in 48, and index 2 in only 5. Options are not shuffled in `src/lib/learning-path-v2/public.ts:15`. A student who always picks the second option scores about 59%.
- **Too many two-option items.** The articles unit has 11 choice items with only two options (a/an, A/The), so guessing yields 50%. Fine for the a/an drill, but the checkpoint should use three options.
- **Hints do the disambiguation.** In articles-4-q5 and articles-cp-q7, "much" or "many" would also be grammatical; only the hint "some / any" makes the key unique. That is acceptable but should be a deliberate rule: an open gap is valid only if hint plus context leave exactly one form, and every equivalent form must be in `accepted`.
- **Gap grading does not normalise contractions.** "'ll pass" versus "will pass" works only because both are listed. Normalising contractions in `normalizeText` (`grading.ts:13`) would make the lists shorter and safer.
- **Tests check keys structurally but not linguistically.** `src/lib/__tests__/learning-path-v2.test.ts:63` checks keys for structure only. There is no checked-in regression set of "known-ambiguous" patterns.

---

## Part C — Improvement design (prioritised)

### P0 — fix now (cheap, removes known wrong or ambiguous content)

1. **Patch the Polku v2 items listed in B4.**
   - Fix passive-1-q3, passive-3-q5, passive-cp-q6 and tenses-cp-q1, and add the missing accepted answers.
   - Use **new IDs** where the item meaning changes, as `schema.ts` requires.
2. **Shuffle options per user** with a seeded shuffle (keyed by user and item ID) in `public.ts`, mapping the answer index server-side. Alternatively, rebalance key positions in the source.
3. **Fix the prompt examples:**
   - verb-tenses: remove "Choose the present simple form:" and use a cue-in-context example.
   - error-correction: fix the explanation to describe a sentential relative ("which viittaa koko edeltävään lauseeseen" (which refers to the whole preceding clause)).
   - vocabulary fill-blank: accept only `["would require"]` for "vaatisi".
   - Remove "kolmektiivinounit".
   - Remove copied exam texts.
   - Stop asking for invented `source` lines in reading.
4. **Put the vocabulary and reading generators behind the same gate as grammar:** `parseModelJSON` + schema validation + blind solve. This means `correctAnswer ∈ options`, unique IDs, and `responseMimeType: 'application/json'`.

### P1 — the generation pipeline (per item, not per set)

```
rule card ─► generate (N+30% items) ─► deterministic validator ─► LanguageTool
          ─► blind solve ×k (model B, high thinking, shuffled options, no metadata)
          ─► option-free uniqueness probe ─► explanation check vs rule card
          ─► keep passing items (drop only failures; regenerate the shortfall)
          ─► cache + item analysis on real answers
```

1. **Rule cards (grounding).** For each topic or sub-rule, write a JSON card. Polku `guide` objects and `course-theory.ts` sections are the starting point. Each card has:
   - `rule` (Finnish text; this is also the source of explanations)
   - `keyForms` (allowed answer forms)
   - `distractorForms` (closed list, built from typical Finnish-learner errors)
   - `forbiddenContexts` (e.g. collective-noun subjects, BrE/AmE-variable constructions, *which* vs *that* in defining clauses, *will* vs *going to* without a cue)
   - 2–3 gold examples, reviewed by a human.

   The prompt includes the card verbatim. Each item must carry `ruleId` and the **disambiguating cue** (the word or phrase in the stem that rules out each distractor), e.g. `cues: {"am going": "no temporariness marker; 'every morning' + habit"}`. Requiring the cue makes the model justify uniqueness while it writes the item.
2. **Item format close to the exam.**
   - Default to **multiple-choice gaps in a short continuous text** (5–8 gaps, 3 options; Rodriguez 2005), plus **open gaps with a clue** (a Finnish word, an English base form, or a grammatical term).
   - Keep single-sentence drills for Polku lessons only.
3. **Deterministic validator.** Extend `grammar-quality.ts` with these checks:
   - Exactly one gap.
   - Key and distractors are within the card's forms; inflection items share the lemma.
   - No duplicate options after normalisation.
   - Option lengths within 2× of each other.
   - The key is not a substring of the stem.
   - No banned topics.
   - Key positions balanced across the set.
   - No numbers, dates, named real people or statistics (these are the source of fact errors like the Harry Potter one).
   - Every word in the stem is within a CEFR-J/Octanove level cap (e.g. at most C1) except the target word.
4. **LanguageTool, self-hosted (Docker).**
   - The sentence filled with the key must give zero grammar matches.
   - Record whether each distractor-filled sentence fires a rule. A firing rule is a positive signal. No firing on a *form* distractor (e.g. "would had come") is a red flag that the item may be too easy or the validator blind; it is not an automatic rejection.
5. **Blind solve with self-consistency.**
   - Use a different model from the generator, or at least `thinkingLevel: 'high'`.
   - Run k = 3–5 samples. Present the options **shuffled**. Pass **only** the text, the options and the instruction, never the metadata.
   - The solver must also mark every option as `correct | wrong | arguable` with a one-line reason.
   - Accept an item only if all samples pick the key and no distractor is ever marked `arguable`.
   - For open gaps, the solver lists **all** acceptable fillers. The union, after a second check of each candidate, becomes `acceptableAnswers`. This addresses the "valid answer marked wrong" class.
6. **Option-free uniqueness probe.** Ask: "Without options, list every filler that makes this grammatical and natural in British *and* American English." If any distractor appears in that list, reject the item.
7. **Explanation check.**
   - Generate explanations *after* the item passes. Make them two-step: name the cue, then apply the rule card (A8, arXiv 2311.09517).
   - Use a template: rule sentence from the card + "Tässä vihje on …" (here the cue is …) + one line per distractor ("X olisi väärin, koska …" (X would be wrong because …)).
   - A verifier sees the card, the item and the explanation, and answers "does every claim follow from the card and the sentence?" Any claim that does not follow means rejection.
8. **Fail per item, not per set.**
   - Generate about 30% extra items and drop the failures. Today one bad item discards nine good ones and the user gets a 503.
   - Log rejection reasons per `ruleId` to find weak cards.

### P2 — cache, human review and live item analysis

- **Pre-generate offline, serve from a reviewed bank.**
  - Run the pipeline in batch: a nightly script or an admin route.
  - Store passing items in Supabase with `ruleId`, CEFR level, the validator trace and `status: auto_passed | human_approved | retired`.
  - Serve students from the bank. Live generation should only top up the bank, and its output should be labelled "harjoitus, tekoälyn tuottama" (practice exercise, AI-generated).
  - `aiCache.ts` already exists as a hook point.
- **Human review where it matters.**
  - Everything shown inside Polku, in checkpoints and in "YO-style" mock sections gets human review (`human_approved`).
  - Prioritise review of topics with high rejection rates: modals, articles (the / zero), tenses (simple vs continuous), relatives (which / that), collective nouns.
- **Item analysis on real answers** (classical test theory, as YTL does). Flag an item when either:
  - its p-value is above 0.95 or below 0.2, or
  - its point-biserial is below 0.1, or a distractor is chosen more often than the key by high scorers. Such an item is likely ambiguous or mis-keyed.

  Auto-retire flagged items pending review. Add a "Raportoi virhe" (report an error) button that feeds the same queue.
- **Server-side grading for AI sets too.** Store the generated set server-side, send the client a version without keys, and grade in `/api/grammar/evaluate`. This removes the integrity issue in B1.9 and lets the server use normalised `acceptableAnswers`.

### P3 — learning value

- **Feedback:** error-specific feedback (why *your* option is wrong) plus the rule card link and one worked example (Shute 2008).
- **Spaced review:** schedule missed items, or new items with the same `ruleId`, for spaced retrieval (1 day, 3 days, 7 days), reusing the Polku review sessions (Roediger & Karpicke 2006; Cepeda et al. 2006).
- **Level control:** tag items with a CEFR-J/Octanove level and grammar construct, and pick difficulty by data (item p-values) rather than by asking the model for "advanced".

### What to cache or hand-review, at a glance

| Content | Generation | Verification | Review |
|---|---|---|---|
| Polku v2 lessons and checkpoints | Hand-written (AI drafts allowed) | Full pipeline as a linter + test suite | Human, always |
| YO-style mock structure sections | Batch pipeline | Full pipeline | Human before release |
| "Lisää harjoitusta" (more practice) drills | Batch pipeline → bank | Full pipeline | Sampled (10%) + item analysis + report button |
| Live on-demand generation | Only as a bank top-up | Full pipeline, per item | Item analysis; label as AI-generated |
| Reading texts | Batch | Answerability check (solver reads the text and must cite the supporting sentence) + uniqueness | Sampled |
