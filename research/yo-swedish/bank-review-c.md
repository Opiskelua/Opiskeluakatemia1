# Bank review C: listening tasks (2026-11-01)

## Scope
10 listening tasks in the Koetehtävät bank, in `src/data/sv-task-bank/listening-a.ts` (meddelanden-gasthamn, meddelanden-halsocentral, repliker-grattis, repliker-ursakt, dialog-sommarkurs) and `src/data/sv-task-bank/listening-b.ts` (nyheter-b1, nyheter-b2, dialog-ryggsacken, intervju-sommarjobb-norge, intervju-ung-bonde). 38 MC items and 8 open items.

## Method
1. Blind pass. I solved every item from the key-free sheet only (scripts and questions) and saved the answers before opening any source.
2. Compared each item's key, explanation and `required`/`notAccepted` with my blind answers. I also checked:
   - that the deciding information is audible and does not hang on one easily missed word
   - that the scripts are TTS-friendly (numbers written as words, no abbreviations)
   - that each reply item has only one socially fitting answer
   - that open-answer `required` lists match what the audio supports, given how the grader works: `src/lib/mock-exam/grading.ts` scores an open item all or nothing, so a 4 p item gives 4 or 0
   - that model answers fit inside `maxChars`
3. Edited the files and ran `npx tsx scripts/check-sv-task-bank.ts`, which exited 0.

All 38 MC keys matched my blind answers. There are no wrong keys and none of the blacklist items appear.

## Findings

| Item | Sev | Issue | Fix applied |
|---|---|---|---|
| repliker-grattis 1.4 | S2 | Distractor B "Ingen orsak, det var så lite." Svensk ordbok also gives *ingen orsak* as a reply to an apology, and the speaker opens with "Förlåt". So B half-fits, and the explanation ("Ingen orsak vastataan kiitokseen") is incomplete. C is still the best answer. | B changed to "Tack, detsamma!"; explanation updated. Key unchanged. |
| intervju-sommarjobb-norge 1.1 | S2 | `required` demanded "lähes kaksinkertainen" and rejected "parempi palkka". The question asks *why* Norway, and "the pay is better than in Finland" answers that correctly. With 4/0 scoring, this cost a correct answer all 4 p, which is stricter than the audio supports. The serkku half also required both "oli töissä" and "sanoi hyväksi". | Pay: accept any higher/better pay than in Finland, "nearly double" kept as the model answer. notAccepted now covers a wrong size of the difference ("kolminkertainen", "sama kuin Suomessa"). Serkku: "had worked there and praised it / recommended it". |
| intervju-sommarjobb-norge 1.1 | S2 | The model answer was 105 characters against `maxChars` 100, so the model answer itself would lose 1 p. | Shortened to 98 characters: "Lähes tuplapalkka Suomeen verrattuna, ja serkku oli ollut samassa hotellissa töissä ja kehui sitä." |
| intervju-sommarjobb-norge 1.2 | S2 | `required` was worded as "colleagues spoke fast / dialects". A correct paraphrase such as "hänen ruotsinsa ei riittänyt" or "ei osannut tarpeeksi norjaa" was at risk. "fick diska" is fine, because the Finnish prompt says *joutui*. | Core requirement is now "did not understand the colleagues"; the language-problem paraphrases are explicitly allowed. notAccepted narrowed to "ei osannut ruotsia (lainkaan)". |
| intervju-sommarjobb-norge 1.3 | S2 | "joka ilta" sat outside the brackets, so it was in effect required. "katsoi norjalaisia sarjoja" should be enough. | "joka ilta" moved into the optional brackets. |
| intervju-ung-bonde 1.4 | S2 | The "vaikka moni nuori pitää sitä raskaana…" clause was not in brackets, so it was in effect required. | That clause is now optional. Also accepts "muuttaa käsitystä, että se olisi raskasta ja vanhanaikaista". |
| intervju-ung-bonde 1.1, 1.2 (flagged) | ok | 1.1: the two reasons are exact, and "kasvoi tilalla" is correctly rejected. 1.2: "either half suffices" matches the audio. | None |
| meddelanden-gasthamn 1.1, 1.4 (flagged) | ok | 1.1: C ("kaféet") is a fair trap. 1.4: A applies only to people who come; "före december" equals "senast 30 november". One defensible answer each. | None |
| meddelanden-halsocentral 1.1 (flagged) | S3 | The question hinges on lördag → *veckoslutet*. That is core B1 vocabulary, and *akut* plus *jourmottagningen* also point to A. | None |
| repliker-ursakt 1.3 (flagged) | ok | "Grattis till körkortet" is clearly premature because the test is tomorrow. *körprov* is standard. | None |
| nyheter-b2 1.4 (flagged) | ok | "Nytt för i år" is explicit. The distractors are marked "som alltid" and "precis som förra året". | None |

Every script uses numbers as words ("ett ett två", "trettionde november", "tjugotusen") and has no abbreviations. *kollegerna* and *Forststyrelsen* are acceptable Finland-Swedish standard.

## Summary
- S1: 0
- S2: 6, all fixed (1 distractor and 5 open-answer rubrics/model answers)
- S3: 1, left unchanged as acceptable

**No listening script changed, so no audio needs re-rendering.**

## Left unfixed
- halsocentral 1.1, S3: deliberately kept. Inferring lördag → veckoslut is a legitimate B1 listening skill.
- Design note, not changed because it is outside my files: the 4 p "2 asiaa" items are graded all or nothing (4/0). The prompt "(2 asiaa, 4 p)" may make students expect 2 p per reason. Consider either wording the prompt as "molemmat syyt vaaditaan" or adding partial scoring in `grading.ts`.
