# Bank review D: six new Swedish reading exercises

Reviewer D, 2026-11-01. Worktree `opiskeluakatemia-svtasks` (nothing committed).

## Scope
`data/reading-exercises-sv/`:
- sv-reading-korta-texter-vardag (5 MC)
- sv-reading-valj-ratt-rubrik-intervju (5 MC)
- sv-reading-insandare-skolmaten (4 MC + 2 open)
- sv-reading-unga-bestammer-narpes (5 MC + 2 open)
- sv-reading-blogg-gardsvolontar (5 MC + 2 open)
- sv-reading-novell-kuvertet (4 MC + 2 open)

That is 38 items, plus every Swedish text, the Finnish explanations (`correct` and `whyOthersWrong`) and the open-answer rubrics (`keyPoints`, `acceptable`, `notAcceptable`, `requireTwoPoints`).

## Method
1. **Blind solve.** I answered every item from the key-free sheet before opening any source file and wrote the open answers in Finnish. While doing that I checked the Swedish texts and options for grammar and checked the content against the QA blacklist. The blind answers are in the scratchpad `blind-d.md`.
2. **Comparison.** I compared my answers with the sources. All 26 MC keys matched my blind answers, and none of the MC items has a second defensible option. I checked each open-answer rubric against what the text actually supports and against answers that students would plausibly write.
3. **Fixes.** I made minimal edits with a script that requires each search string to match exactly once. No ids changed and no keys changed. Every MC item still has 3 options.
4. **Validation.**
   - `python3 -m json.tool` passes on all six files.
   - `totalPoints` equals the sum of the item points in every file (15/15/18/21/21/18).
   - `npx tsx --test src/lib/__tests__/course-separation.test.ts` passes 12 of 12.

## Findings

| Item | Sev | Issue | Fix applied |
|---|---|---|---|
| blogg text | S1 | Blacklist: "gummistövlar som bonden har **lånat mig**" (*låna* = borrow; lending is *låna ut*). This teaches a finlandism as the model. | Changed to "har **lånat ut till mig**" |
| blogg 1.5 | S2 | keyPoint 1 accepted only "vain lenkkarit". A natural answer such as "hänellä ei ollut kumisaappaita / jalat kastuivat" could be judged 0. | keyPoint 1 now also accepts "ei ollut kumisaappaita tai sadekenkiä, joten jalat kastuivat" |
| blogg 1.3 (flagged) | S3 | The key is fine. "Norja muistuttaa ruotsia, jota hän osaa" was not listed, which left the outcome to the judge. | Added that answer to `acceptable` and to the keyPoint note |
| blogg 1.7 opt C | S3 | "trots att allt inte har varit lätt" is unidiomatic for the intended meaning "not everything". | Changed to "trots att **inte allt** har varit lätt" |
| blogg 1.1 (flagged) | ok | Single answer, and the distractors are clearly contradicted by the text. | None |
| insändare heading / 1.2 (flagged) | S2 | The heading "Släng inte maten – **låt oss ta hem den!**" says "take it home", but the proposal and the key say *sell*. A student who follows the heading writes "oppilaat saisivat viedä ruoan kotiin" and gets 0. | Heading changed to "Släng inte maten – **sälj den till oss!**". Added notAcceptable: "Pelkkä: viedä kotiin (ydin on myynti)". "Ostaa ja viedä kotiin" is still accepted. |
| insändare 1.4 (flagged) | S2 | notAcceptable "Pelkkä: ruokahävikki" could reject "ruokaa ei heitettäisi hukkaan", which is reason 1. Reason 3 phrased as "auttaa niitä, joilla on vähän rahaa" was also not covered. | keyPoints 1 and 3 widened with those variants. Added a matching acceptable answer. The notAcceptable entry now rejects only the bare word "ruokahävikki". |
| insändare 1.5 expl. "2" | S3 | Broken Finnish: "Oppilaiden mukanaolon suunnittelussa tarjoaa Alva". | Rewritten: "Sitä, että oppilaat olisivat mukana suunnittelemassa, ehdottaa Alva …" |
| novell 1.4 opt A (flagged) | S3 | In "Hon vill visa Sara att **hon** kan bo …", it is unclear whether *hon* means Sara or mamma. | Changed to "Hon vill visa att **Sara** kan bo hos mostern nära sin nya skola." (*sin* now binds correctly to Sara) |
| novell 1.6 expl. "0" | S3 | "Äiti on jo järjestänyt Saralle asunnon" overstates the text: moster only phoned. | Changed to "Äiti on jo selvittänyt, että Sara voi asua tädin luona" |
| novell 1.1 (flagged) | ok | This is an inference item, but B is the only option the text supports. A is mamma's shift and C is not stated. | None |
| närpes 1.3 | S2 | keyPoint 1 required "joka aamu", and notAcceptable said "odottaminen joka aamu puuttuu". That is stricter than the question needs: "odottavat bussia sateessa ja lumimyrskyssä" fully answers why. | "joka aamu" marked optional. notAcceptable reworded to "bussin odottaminen puuttuu". Added an acceptable answer without "joka aamu". |
| närpes 1.7 | S3 | "jotta useampi nuori osallistuisi / äänestäisi" is the obvious paraphrase of "får veta om projektet" but was not covered. | Added to keyPoint 2 |
| rubrik text 2 + 1.2 opt B | S3 | "prydligare ut än en vanlig skoldag" and the distractor "Klä dig som en vanlig skoldag" need *på*, because they are time adverbials. | Changed to "än **på** en vanlig skoldag" and "som **på** en vanlig skoldag". The explanation quote was updated to match. |
| korta texter 1.1–1.5 | ok | Keys, distractors, explanations and Swedish all correct. "kan du låna en av oss" (borrow) is correct usage. | None |

Blacklist sweep over the six files found no instances of *säker att*, *konstgjord kött*, *en av de … sidor*, the rules "definite form after prepositions" or "alla/allt", or *ska* explained as obligation. The only blacklist hit was *låna* in the blog, fixed above.

## Summary count
- **S1: 1** (låna mig in the blog text)
- **S2: 4** (insändare heading vs 1.2, insändare 1.4 rubric, blogg 1.5 rubric, närpes 1.3 strictness)
- **S3: 7**
- Wrong MC keys: **0**. Second defensible MC options: **0**.

## Left unfixed
Nothing is left unfixed. These are reading files only, so there are no listening scripts and no audio needs re-rendering. The six files are untracked in the worktree, so they do not show in `git diff`.
