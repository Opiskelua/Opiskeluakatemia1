# Swedish flashcards review (2026-11-01)

Scope: `git diff src/data/course-flashcards-sv/` in opiskeluakatemia-svtasks. That covers 5 new decks (adverb 45, boende 45, mangfald 44, studier 38, hogtider 43 = 215 cards), 6 edited or added cards in themes.ts (teknik-11, samhalle-32, arbete-02, familj-12, familj-13, and teknik-19 removed) and 2 edited cards in grammar.ts (verb-65, verb-67).

Checked: Swedish spelling, gender, plurals, V2/BIFF in examples, Finnish glosses and translations, the uncountable-noun and holiday-name conventions, duplicate fronts across all 19 decks, and the known-errors blacklist.

## Findings

| Card id | Issue | Fix |
|---|---|---|
| sv-tema-hogtider-35 | `en bastu` was the only countable noun in the deck without a plural (inconsistency, not an error) | `en bastu (bastur)` |

No wrong cards found.

## Notes (no change needed)

- Finland-Swedish forms, all correct in Finland-Swedish: `ett höghus` = kerrostalo (in Sweden a high-rise), `gemensam ansökan`, `ett urvalsprov`, `studiepenning`, `en studiehandledare`, `en yrkesskola`, `julgubben`, `en fastlagsbulle`, `en midsommarbrasa`, `egnahemshus`.
- Duplicates: no new exact or stem duplicates. The remaining overlaps are the intended theme card plus grammar inflection card pairs (skola, dator and similar). `en hyra` (boende-06) and `att hyra` (resor-24) are a noun and a verb, so they don't count as duplicates. Removing teknik-19 `beroende av` leaves a gap that is now covered by grammar `vara beroende av`.
- Blacklist: none of säker att, låna mig, alla/allt or ska-as-obligation appears in any card. verb-65 glosses ska as aikoa, olla määrä, which is correct.
- Minor style points left alone: adverb-39 joins two main clauses with a comma before `därför`, which is common and accepted. `en examen` has no plural (examina) shown, which the rule allows ("where useful").

Tests: `npx tsx --test src/lib/__tests__/flashcards-course.test.ts`: 7/7 pass.
