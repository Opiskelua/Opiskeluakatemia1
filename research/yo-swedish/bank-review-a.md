# Bank review A: multiple-choice cloze texts

Reviewer: A, 2026-11-01.

## Scope
- `src/data/sv-task-bank/cloze-a.ts`: sv-kt-cloze-sommarjobb-yrke, sv-kt-cloze-forsta-bostaden, sv-kt-cloze-somn-skarmtid
- `src/data/sv-task-bank/cloze-b.ts`: sv-kt-midsommar-i-norden, sv-kt-unga-och-poddar, sv-kt-med-tag-genom-europa
- That is 6 texts with 90 gaps, 3 options each.

## Method
1. **Blind solve.** I worked from the key-free sheet only. For each gap I first listed every form that would fit with the options hidden, then picked an option and noted any second option I would accept. My answers are in the scratchpad file `blind-a.md`.
2. **Compare with the source.** I checked every key and every explanation against my blind result and against the content QA blacklist.
3. **Fix.** I made minimal edits in the two source files, then ran `npx tsx scripts/check-sv-task-bank.ts`, which exited 0.

**Blind agreement:** my blind answers matched the key on all 90 gaps. None of my blind answers had a second option that I would accept.

**Blacklist:** the six texts contain none of the blacklisted errors. Both "en av de viktigaste orsakerna" and "säker på att" are correct, and no explanation states any of the blacklisted rules.

## Findings

| Item | Sev | Issue | Fix applied |
|---|---|---|---|
| cloze-a sv-kt-cloze-somn-skarmtid 1.10 (explanation) | S1 | The explanation says "Dess … ei ihmisiin" (dess never refers to people). This is false: *barnet och dess föräldrar* and *företaget och dess anställda* are correct. | Changed to: dess refers to the owner when the antecedent is a singular word (e.g. företaget och dess anställda), but föräldrar is plural. The key (deras) was already correct. |
| cloze-b sv-kt-med-tag-genom-europa 1.11 | S2 | The trio sits in "Det är skönt att man ___ boka plats". After an emotive att-clause, spoken Swedish often uses main-clause order ("att man behöver inte alltid"), so a student could argue for option B. | Moved the trio into a som-clause, where the subordinate word order is required: "Kortet passar bra för den som [[1.11]] planera allt i förväg." The options are now inte alltid vill / vill inte alltid / alltid inte vill, and the key is still A. The explanation is rewritten to match. The next sentence ("Det är också lätt att ändra sina planer…") still follows naturally. |
| cloze-a sommarjobb-yrke 1.15 and forsta-bostaden 1.12 (explanations) | S3 | The explanations say "inte ei voi tulla subjektin eteen" (inte can never come before the subject). This is too broad: inte can come before a heavy or stressed subject in a subordinate clause, as in "om inte alla hjälper till". | Narrowed the claim to "lyhyen pronominisubjektin (man) eteen". |
| cloze-a sommarjobb-yrke 1.6 (explanation) | S3 | The explanation says "bero vaatii aina på" (bero always takes på). This overstates the rule, because *låta det bero* takes no preposition. | Changed to "Tässä merkityksessä…". |
| cloze-b midsommar 1.3 (explanation) | S3 | The explanation calls "hon i hemlighet plockade" subordinate-clause word order. *i hemlighet* is a manner adverbial, not a sentence adverbial, so that label is loose. The real error is that the verb is not inverted. | Reworded: neither distractor puts the verb before the subject. |
| cloze-b midsommar 1.9 (explanation) | S3 | The explanation says vilket refers only to a whole clause. It also refers to an ett-word. | Added "ett-sanaan tai". |

### Soft items the writers flagged, judged as acceptable
- **cloze-a sommarjobb 1.5 (genom att):** acceptable. "utan att" contradicts "Kontakter är fortfarande viktiga", and "för att" makes no sense here.
- **cloze-a sommarjobb 1.10 (gärna):** acceptable. "därför" after the high demand rules out sällan and knappast.
- **cloze-a bostaden 1.4 (däremot vs dessutom):** acceptable. The sentence contrasts Helsinki with smaller towns, and "dessutom" adds nothing that fits. The sentence placement slightly interrupts the flatmate thread, but reordering it would put the gap numbers out of order, so I left it.
- **cloze-a bostaden 1.8 (dem vs deras):** acceptable. "betala deras" would mean someone else's bills, and the explanation already says so.
- **cloze-a sömn 1.8 (koncentrera sig på):** acceptable. "i lektionerna" is not idiomatic, and "på" works in both readings ("concentrate on the lessons" and "during the lessons").
- **cloze-a sömn 1.14 (Tvärtom vs Annars):** acceptable. Neither Annars nor Därför fits the logic of the sentence.
- **cloze-b poddar 1.6 (vilket vs som):** acceptable. Here "som" cannot take a whole clause as its antecedent; it would attach to "veckan". "vad" is dialectal.
- **cloze-b: the för att / genom att / utan att trios and the connective-adverb items:** each has exactly one logical fit, and their explanations are correct.

## Summary count
- **S1:** 1, fixed (explanation only; the key was correct)
- **S2:** 1, fixed (tåg 1.11)
- **S3:** 4 entries, all fixed. The two inte explanations are grouped in one row, so this is 5 explanations.
- **Keys changed:** 0
- **Listening scripts changed:** none (this scope has no listening content)

## Left unfixed
- **Sentence order around bostaden 1.4:** this is a style issue only, and reordering would break the gap numbering.
