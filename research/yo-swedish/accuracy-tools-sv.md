# Accuracy tools and open data for the Swedish course (ruotsin abikurssi, B1)

Researched 2026-11-01. This is the Swedish counterpart of `../yo-english/ai-exercise-accuracy.md` (Parts A and C) and `../yo-english/open-grammar-resources.md`. **We are a commercial product**, so licences matter. The licence column uses the same key as the English file: **OK** means commercial use is allowed, **NC** means non-commercial only, **Unclear** means treat it as all rights reserved.

Markers: **[V]** means verified on the source page or by a live test today. **[U]** means unverified (from memory or a secondary source).

## 0. Our situation

- The Swedish content is entirely **static and hand-written**. There is no live AI generation of Swedish exercises.
  - `opiskeluakatemia/src/data/learning-path-sv/unit-*.ts`: 674 Polku items: 410 three-option `choice` items, 191 `gap` items and 73 `order` items (counted with grep).
  - `src/data/course-flashcards-sv/`: 585 cards. `grammar.ts` holds paradigm cards such as `att ge – ger – gav – gett (givit)` and `ett hus – huset – hus – husen`. `themes.ts` holds cards such as `en skog (skogar)`.
  - A few hundred new structure items are about to be written.
- **How gap grading works.** `normalizeText()` in `src/lib/learning-path-v2/grading.ts` does the following, in order:
  1. NFKC normalisation
  2. curly apostrophes to `'`
  3. lowercase
  4. replaces `. , ! ? ; : " “ ”` with a space
  5. collapses whitespace and trims

  The answer then has to match one `accepted[]` string exactly. Order items join the chosen tokens with spaces and compare the result the same way.
  - Diacritics are **not** folded, which is correct, since `far`/`får` and `har`/`hår` are different words.
  - Hyphens are kept.
  - `i fjol` and `ifjol` are different strings.

  **So every acceptable spelling variant (sa/sade, gett/givit, brodern/brorn, i fjol/ifjol) must be listed in `accepted[]`.** Nothing in grading forgives a variant.
  - A minor nit: `schema.ts:17` says "compared after normalizeGap()", but the function is called `normalizeText`.
- **The quality bar is the same as for English:** zero wrong keys and zero items with two defensible answers. The English lessons carry over: blind solvers, an option-free ambiguity probe, closed option sets and rule cards. Two things differ for Swedish:
  - Rule-based grammar checkers are much weaker than for English.
  - Morphology lexicons are much better: SALDO gives full tagged paradigms under CC BY 4.0, with a public API.

---

## 1. Morphology and lexicon sources (deterministic validators)

| Resource | Licence | Commercial? | Size / access | How we'd use it |
|---|---|---|---|---|
| **SALDO morphology (`saldom`)**, Språkbanken Text, Gothenburg | Download table: **CC BY 4.0** [V]. The same page's intro says "Creative Commons Attribute-Share Alike" and the badge links CC BY 3.0, so the licence wording is inconsistent [V]. That doesn't matter for internal validation; attribute anyway. https://spraakbanken.gu.se/en/resources/saldom | **OK** | 128,036 entries with full inflection tables. Each form carries an msd tag such as `sg def nom`, `pos indef sg n nom`, `sup aktiv` or `komp nom` [V]. Two ways in: **(a) Karp v7 API**, no key. Example: `https://spraakbanken4.it.gu.se/karp/v7/query/saldom?q=and(equals|baseform|hus||equals|partOfSpeech|nn)`. The response includes `inherent: ['n']` for ett-words and `['u']` for en-words [V]. A reverse lookup also works: `?q=equals|inflectionTable.writtenForm|stort` [V]. No rate limits are documented and no rate-limit headers are sent [V]. One request timed out in about 150, so retry with a 0.1–0.2 s sleep. **(b) One-off download:** `https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/saldom/saldom.xml` (LMF XML, **254 MB**, no compressed version, data dated 2017-09-19) [V]. The LMF file has no gender attribute, but the paradigm name encodes it: `nn_6n_system` is neuter, `nn_6u_bror` is utrum [V]. | **Primary validator.** Things it does well:<br>• Lists both variants where standard Swedish has two (`gett`/`givit`, `brodern`/`brorn`, `sa`/`sade`) [V].<br>• Covers comparison (`större`, `störst`, `största`) [V] and supine/participles.<br>Caveat: it also lists archaic forms (`giver`, `gåve`, `givne`). Use it to prove a key **is** a real form for the expected slot and to propose variants. Never auto-add archaic forms. |
| SALDO lexicon (`saldo.xml`) | CC BY 4.0 (download table) [V] | OK | 131,020 entries, 74 MB, 2017 [V]. https://spraakbanken.gu.se/en/resources/saldo | Semantic links only. We don't need it, because `saldom` has the forms. |
| **Wiktionary Swedish via kaikki.org** (wiktextract, English edition) | Wiktionary text is CC BY-SA 4.0 + GFDL [V in the English file]. Kaikki only asks for a citation. | OK (BY-SA, and internal use does not trigger ShareAlike) | `https://kaikki.org/dictionary/Swedish/kaikki.org-dictionary-Swedish.jsonl.gz` is **34 MB gz** (343 MB unpacked), 313,822 lines, extracted 2026-10-30 [V]. The site marks this post-processed file as "deprecated, will be removed" [V], and there is no Swedish-Wiktionary edition [V]. Forms carry tags (`definite`, `plural`, `supine`, `neuter`...), and the gender is in the head template (`hus n`, `bror c`) [V]. | **Secondary or fallback source.** It is noisier: it lacks `brorn`, it lists `ett lov` only as `c`, and it misses compounds such as `grupparbete` [V]. Use it offline only when SALDO has no entry. |
| **Folkets lexikon** (KTH, sv–en) | **CC BY-SA 2.5** [V]. https://folkets-lexikon.csc.kth.se/folkets/om.html | OK (BY-SA) | `folkets_sv_en_public.xml` is 14.6 MB, last modified 2024-12-14 [V]. It has `<paradigm><inflection value=…>` elements, **without msd tags** [V]. | Low value. Its forms are untagged, so it can only confirm that a form exists. Skip it unless we want sv–en glosses. |
| **SAOL 15 (2026) – ord** | **CC BY 4.0** [V]. https://spraakbanken.gu.se/en/node/5113 | OK | 128,295 headwords, with word class and a related-form field. It is offered **only through Karp**, with no download file [V]. Resource id `saol15-ord`: not in the public v7 resource list. The full SAOL database (`salex`) returns **403 "Not enough permissions"** [V]. | The authoritative spelling norm, but we could not reach it programmatically [U]. Use svenska.se (SAOL/SO) **by hand** as the arbiter for disputed forms. Don't scrape it. |
| **Lexin** (Swedish + 14 languages incl. Finnish) | **CC BY 4.0** [V]. https://spraakbanken.gu.se/en/resources/lexin | OK | 29,111 entries, `LEXIN.zip` 1.05 MB, 2024-01-25 [V]. Also in Karp as `lexin` [V]. The Finnish side is mostly bare equivalents. | Optional check of the Finnish meaning on flashcard backs. It has no inflection, so it is not a form validator. |
| **Kelly list** (Swedish) | The text says "CC-BY-SA 3.0, LGPL 3.0" but the download table says CC BY 4.0 [V]. To be safe, treat it as **BY-SA**. https://spraakbanken.gu.se/en/resources/kelly | OK (BY-SA) | 8,425 lemmas, `kelly.xml` 5.6 MB (downloaded) [V]. It has a gender POS (`noun-en` / `noun-ett`). **Its "CEFR" levels 1–6 are equal bins of exactly 1,404 lemmas each, so they are frequency bands, not pedagogical levels** [V, counted]. | A third opinion on en/ett gender. A rough "is this word common?" filter. Don't present its levels as CEFR. |
| **SVALex** (coursebook vocabulary by CEFR) | **CC BY-NC-SA 4.0** [V]. https://spraakbanken.gu.se/en/resources/svalex | **NC** | 15,681 lemmas [V] | Not usable in a commercial product. |
| **SweLL-gold / SweLL-pilot** (L2 Swedish learner essays) | **CLARIN-ID, -PRIV, -NORED, -BY**, with full texts by application only [V]. https://spraakbanken.gu.se/en/resources/swell-gold | **No** (restricted, no redistribution) | 502 texts, about 148k tokens [V] | Skip it. Reading the papers on L2 error types is fine. |
| **Tatoeba** (sv, fi) | CC BY 2.0 FR per sentence, plus a CC0 subset [V, see the English file] | OK (attribution) | 57,510 Swedish and 155,015 Finnish sentences [V]. The number of sv–fi links is not checked [U]. | Optional. It is a source of real sentences for new items. It is not a validator. Low priority. |

## 2. Grammar checkers for Swedish

Test set: 12 sentences with planted B1 errors: 4 attributive or predicative agreement errors, 1 BIFF (adverb placed after the verb in a subordinate clause), 5 V2 inversion errors after a fronted adverbial or subordinate clause, 1 indirect-question word-order error, and 1 `det är rolig`. The set also had 4 correct control sentences.

| Tool | Licence | Rules / coverage | Live test result | Verdict |
|---|---|---|---|---|
| **LanguageTool sv** | LGPL 2.1+ | **32 XML rules + 2 Java rules**, 0 confusion pairs, and 0 commits in the last 6 months (LT 6.6 table) [V]. The `sv/grammar.xml` in the repo has 32 `<rule>` entries plus 1 rulegroup, last touched 2024-01-09 [V]. The rules are mostly split-word (särskrivning), abbreviations and a few article–adjective patterns. **It has no V2, BIFF or predicative agreement rules.** | Caught **2/12** (only `ett stor problem` and `ett gammal hus`). Its suggestion there was itself wrong: it proposed changing the article to *en* instead of the adjective to *stort* [V]. | **Skip.** It isn't worth even the public API. |
| **Granska** (KTH) | Source under **GNU GPL**. The web service is "gratis att använda" (free to use) [V]. https://skrutten.csc.kth.se/ | A rule-based agreement checker (`kong*`, `pred*`), word-order rules (`of1@ordföljd`, adverb placement in a subordinate clause), and särskrivning [V]. The API is `POST https://skrutten.csc.kth.se/granskaapi/scrutinize.php` with the form field `text=` and returns XML [V]. No rate limits are stated. The service page was last updated 2020–2021. | Caught **6/12**:<br>• `ett stor problem`, `ett gammal hus`, `en röd hus`, `många utländsk studenter`<br>• `Huset är väldigt stor`, `Det är rolig`<br>• the BIFF error `att han kunde inte komma`<br>**It missed all 5 main-clause V2 errors and the indirect question.** It raised no flags on the correct controls. Its särskrivning hints (`stor problem → storproblem`) are noisy [V]. | **A useful cheap second signal** for agreement and BIFF. Fill in the key: there must be no `kong`, `pred` or `ordföljd` flag. Fill in each distractor: an agreement flag is positive evidence the distractor is wrong. Ignore `sär*`. Blind to V2. |
| ProbGranska (statistical, same site) | same | POS-sequence statistics | Flagged **0/5** V2 errors [V] | Skip. |
| Granska inflector (`granskaapi/inflect.php?word=`) | same | Untagged form lists | Lacks `givit` and `brorn` [V] | SALDO is strictly better. Skip. |
| Stava / Stava Rex (KTH) | Stava source published by KTH (old page). Stava Rex is a licensed product [U] | Spelling only | not tested | SALDO and Wiktionary already cover spelling. Skip. |
| Skrivregler / Språkrådet | Book and advice pages, not software [U] | none | n/a | A human reference only. |

**Conclusion.** No open checker handles Swedish **word order (V2/BIFF in main clauses, indirect questions)**. Word order has to be handled by rule-card design plus blind LLM solving and human review.

## 3. LLMs as Swedish grammar judges: the evidence

- **MultiGEC-2025** (NLP4CALL 2025), Swedish track on SweLL-gold, minimal-edit test results [V]: https://spraakbanken.github.io/multigec-2025/results/test_results_minimal.html

  | System | F0.5 | Precision | Recall | GLEU |
  |---|---|---|---|---|
  | UAM-CSI | 52.56 | 54.54 | 45.88 | 69.29 |
  | baseline | 41.46 | | | |
  | Lattice | 40.01 | | | |

  UAM-CSI is Gemma-2-9B-IT with QLoRA adapters [V, paper abstract on dspace.ut.ee]. Even the best fine-tuned system **finds fewer than half** of the learner errors at about 55% precision. The task (whole learner essays) is harder than ours (one short, controlled sentence), but the numbers show that a single LLM pass cannot be trusted for "zero wrong keys".
- **Swedish Benchmark of Linguistic Minimal Pairs** (Sjons, Heinat & Kurfali, LREC 2026): 2,500 pairs over 25 phenomena, with 98.05% human agreement. Across 11 models, they "handle local agreement well but struggle with some long-distance dependencies and **word order**". Training domain mattered more than size, and prompt-based evaluation lowered scores [V]. https://aclanthology.org/2026.lrec-1.540/
- **EuroEval / ScandEval ScaLA-sv** (linguistic acceptability, built by corrupting UD Swedish sentences through word swaps and deletions; reported as MCC) [U on construction details]. We could not fetch the live leaderboard numbers (the page is JS-rendered) [U]. The general pattern on EuroEval is that frontier closed models (GPT, Claude and Gemini top tiers) lead the Swedish NLU tasks, and small open models trail [U].
- **Implications for us:**
  1. Agreement and inflection errors are also what LLMs judge best. Even so, deterministic lexicon checks are cheaper and exact there, so use them first.
  2. Word order is the weak spot of **both** rule tools and LLMs. Order items and V2/BIFF choice items need (a) a blind solve by a strong model at high effort, and (b) an explicit "list every grammatical ordering of these tokens" probe, because the risk in order items is **a missing accepted ordering** (for example, adverbial fronting) rather than a wrong key.
  3. Use two model families where possible: Claude agents as the main blind solver, and free-tier Gemini as the second opinion, within its quota.

## 4. Prototype results on our actual bank (2026-11-01)

The scripts are in `/private/tmp/claude-501/-Users-peetumakinen-Desktop-Opiskeluakatemia1/8f67b12f-c83d-4255-9007-6ea36ada97b2/scratchpad/sv-scripts/`: `check_cards.py`, `check_keys.py` and `gap_lemma_check.py`. They are session scratch and may disappear; the sketch in section 6 is the durable version.

1. **Flashcard paradigms against Wiktionary.** 292 verb and noun paradigm cards were checked for every listed form and for en/ett.
   - 7 flags: `brorn`, `ett lov` ×2, `grupparbete`, `yrkeshögskola`, `anställd`, `arbetsintervju`.
   - Cross-checked in SALDO, 6 of the 7 are fine: `brorn` is listed, `lov..nn.3` is neuter with `lovet`/`loven`, and `grupparbete` and `arbetsintervju` exist. `anställd` is an adjectival noun, so it sits under `av`.
   - Only `yrkeshögskola` has no entry. It needs a compound fallback (check the head `högskola`).
   - **No wrong forms found.**
2. **Polku answer-key tokens.** Every word in a gap's `accepted[]` and in each choice key was checked against the lexicon. **No misspelled Swedish keys.**
   - The unknown tokens are names, numerals, Finnish answers on comprehension items, and compounds. `ifjol` is in SALDO.
   - The unknown *distractor* tokens are deliberate non-words (`bökor`, `gammalare`, `nyckelen`, `restaurangar`, `slottar`, `tallrikerna`, `läsar`, `taler`), which is fine.
3. **Gap items whose hint is a Swedish base form (46 items).** Each answer was checked to be a form of the hint lemma in SALDO, and the script listed other spellings with the same msd as candidates for `accepted[]`.
   - **0 missing variants.**
   - 13 flags, all caused by item design rather than errors: antonym items (`billig → dyra`), hints that are already inflected (`nycklar → nycklarna`), capitalisation (`Boken`), answers with a particle (`ätit upp`), and one lookup quirk on `ha`.
   - The real script needs per-item modes (`inflect` / `antonym` / `free`) instead of guessing.

**Takeaway.** The existing hand-reviewed bank is clean at the **form** level. The remaining risk is **contextual**: a distractor that is also acceptable in context, word order, or a missing accepted ordering. The deterministic check is still worth building as a cheap **regression gate for the few hundred new items** and for future edits. It is about 150 lines and runs in seconds.

## 5. Recommendation, ranked by value / cost

| # | Action | Cost | Value |
|---|---|---|---|
| 1 | **Rule cards + closed option sets for the new structure items.** Inflection items: all three options are forms of **one SALDO lemma**, and the stem contains the cue (`ett`, `många`, `det är`, `den … -a`). Function-word items: options come from a fixed list per card. Write a `cue` field per item. | Authoring discipline only | Removes most "two correct answers" items **by construction** |
| 2 | **SALDO paradigm check as a test** (section 6). It covers gaps, inflection choices and flashcards, plus en/ett and an agreement assertion. Use a **committed JSON cache** so the test runs offline in vitest. | About half a day once. Data is CC BY 4.0. | Catches wrong forms, wrong gender, missing variants (`gett/givit`) and agreement-key mistakes, deterministically and forever |
| 3 | **Blind solve by Claude agents** on every choice and order item, new and existing. The solver gets shuffled options and no key, and labels each option `correct / wrong / arguable`. Add an **option-free probe** for gaps ("list every acceptable filler") and order items ("list every grammatical ordering of exactly these tokens"). Any disagreement or "arguable" goes to a human. | Agent time only. About 1,000 items is a few batched agent runs. | The only real defence against contextual ambiguity and word-order errors |
| 4 | **Granska API pass** on key-filled and distractor-filled sentences of the agreement, BIFF and predicative units. | A tiny script, a few hundred POSTs, free | A second, independent signal on agreement and BIFF. Must show no flags on any key-filled sentence |
| 5 | **Gemini (free tier) as a second-family solver**, only on items the Claude solver marked uncertain or that touch word order | Free, within quota | A tie-breaker, not a gate |
| 6 | Kelly gender as a third vote on en/ett; Wiktionary as a SALDO fallback | Trivial | Small |
| 7 | **After launch:** item analysis on real answers (p-value, distractor-beats-key) plus the existing report button | Already planned for English | Catches whatever slipped through |

**Not worth it:**
- **LanguageTool for Swedish.** It has 32 rules, caught 2/12, and gave a wrong fix.
- **Self-hosting** LanguageTool, Granska or any GEC model on a server.
- Fine-tuning or MultiGEC-style GEC models.
- ProbGranska and the Stava tools.
- Folkets lexikon (untagged forms).
- **SweLL and SVALex** (restricted or NC).
- Scraping svenska.se/SAOL (no licence to do so; use it by hand for disputes).
- Downloading SALDO's 254 MB XML into the repo. Fetch it once locally, or use Karp, and commit only the small derived cache.
- Using Kelly's "CEFR" as real CEFR.
- A paid Gemini key only for Swedish. The bank is static, so a one-off blind review by Claude agents is enough.

Attribution: add "SALDO / Saldos morfologi, Språkbanken Text, CC BY 4.0" (and Wiktionary or Kelly, if used) to `/lahteet`.

## 6. The deterministic check: files and script sketch

**Data source.** Use SALDO morphology. Either:
- **Karp v7** (preferred): `https://spraakbanken4.it.gu.se/karp/v7/query/saldom?q=<query>&size=20`
  - by lemma: `and(equals|baseform|<lemma>||equals|partOfSpeech|<nn|av|vb>)`
  - by form: `equals|inflectionTable.writtenForm|<form>`
- or the one-off download `https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/saldom/saldom.xml` (254 MB LMF XML). Stream-parse it with a SAX/iterparse reader, because it is too large to load whole.

Fallback: `https://kaikki.org/dictionary/Swedish/kaikki.org-dictionary-Swedish.jsonl.gz` (34 MB).

```
scripts/sv-saldo-cache.mjs   (manual, needs network; run when items change)
  collect lemmas:
    - gap items with a mode='inflect' hint            -> hint
    - choice items tagged ruleId 'sv-adj-*','sv-noun-*','sv-verb-*' -> every option (reverse lookup)
    - flashcards: 'att X – …' -> X (vb); 'en|ett X – …' / 'en|ett X (pl)' -> X (nn)
  for each lemma/form: Karp query (sleep 150 ms, 3 retries), keep only
    {lemgram, pos, gender: inherent|paradigm[3], forms: [[msd, form]]}  minus msd in {c,ci,cm,sms} and *gen
  compounds with no hit: retry on the longest known suffix (yrkes|högskola) and inherit gender/endings
  write src/data/learning-path-sv/saldo-cache.json   (~0.3–1 MB, CC BY 4.0 header)

src/lib/__tests__/sv-morphology.test.ts   (offline, runs in CI)
  - flashcard verb: [inf, pres, pret, sup] must equal SALDO slots
      'inf aktiv','pres ind aktiv','pret ind aktiv','sup aktiv'; '(x)' alternatives must be same-slot variants
  - flashcard noun: article == gender; [sg def nom, pl indef nom, pl def nom] match; '(pl)' == pl indef nom
  - gap mode='inflect': every accepted[].lastWord ∈ paradigm(hint);
      FAIL if a same-msd non-archaic variant of accepted[0] is missing (allowlist: archaic forms we refuse)
  - choice inflection items: all options ∈ one lemma's paradigm; options pairwise distinct msd-forms
  - agreement assertion (adjective units): stem matches /\b(en|ett) ___ (\w+)/ -> gender(noun) decides
      key msd ('pos indef sg u nom' | 'pos indef sg n nom'); /många|flera|alla ___/ -> 'pos indef pl nom'
  - every Swedish token in keys ∈ lexicon ∪ names/numerals allowlist (skip items with answer 'fi' in text-lang.ts)
```

The item-level additions this needs are optional fields in `schema.ts` (`mode`, `ruleId`, `cue`). The client never sees them, the same way keys stay server-side today.

---

## Sources

- SALDO / saldom: https://spraakbanken.gu.se/en/resources/saldo, https://spraakbanken.gu.se/en/resources/saldom. Karp API: https://spraakbanken4.it.gu.se/karp/v7/openapi.json
- Kelly https://spraakbanken.gu.se/en/resources/kelly · Lexin https://spraakbanken.gu.se/en/resources/lexin · SVALex https://spraakbanken.gu.se/en/resources/svalex · SweLL-gold https://spraakbanken.gu.se/en/resources/swell-gold · SAOL 15 ord https://spraakbanken.gu.se/en/node/5113
- Kaikki Swedish: https://kaikki.org/dictionary/Swedish/index.html, https://kaikki.org/dictionary/rawdata.html
- Folkets lexikon: https://folkets-lexikon.csc.kth.se/folkets/om.html
- Tatoeba stats: https://tatoeba.org/en/stats/sentences_by_language
- LanguageTool languages: https://dev.languagetool.org/languages. Rules: https://github.com/languagetool-org/languagetool/blob/master/languagetool-language-modules/sv/src/main/resources/org/languagetool/rules/sv/grammar.xml
- Granska: https://skrutten.csc.kth.se/, https://skrutten.csc.kth.se/granskaapi/scrutinize. Paper: https://ecp.ep.liu.se/index.php/sltc/article/view/175
- MultiGEC-2025: https://spraakbanken.gu.se/en/compsla/multigec-2025, https://spraakbanken.github.io/multigec-2025/results/test_results_minimal.html. UAM-CSI: https://dspace.ut.ee/items/3511cab9-4e49-452c-96a7-e19a1bdebd8a
- Swedish minimal pairs: https://aclanthology.org/2026.lrec-1.540/ · ScandEval: https://arxiv.org/abs/2304.00906
