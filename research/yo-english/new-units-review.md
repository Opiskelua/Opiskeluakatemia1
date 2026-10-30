# Review: new Polku v2 units (verbforms, prepositions, relatives, wordform)

Scope: every item, guide and explanation in `opiskeluakatemia-content/src/data/learning-path-v2/` files
`unit-verbforms.ts`, `unit-prepositions.ts`, `unit-relatives.ts`, `unit-wordform.ts`.
Grading checked against `src/lib/learning-path-v2/grading.ts` (`normalizeText`: case, whitespace, `.,!?;:"` and apostrophe style ignored; hyphens and dashes are not).

I solved every choice item before checking the key: **all choice keys are correct, and I found no choice item with a second defensible option** in British or American English. I found no S1 issues. The problems below are missing or wrongly accepted variants (S2) and wording or over-generalisation (S3).

Severity: S1 = wrong key / correct answer marked wrong / wrong rule; S2 = second defensible option or missing accepted variant (including an accepted answer that is wrong); S3 = wording/explanation polish.

## Summary

| Unit | S1 | S2 | S3 |
|---|---|---|---|
| verbforms | 0 | 2 | 3 |
| prepositions | 0 | 0 | 3 |
| relatives | 0 | 0 | 4 |
| wordform | 0 | 1 | 5 |

## Findings

| item id | severity | problem | concrete fix (exact replacement text) |
|---|---|---|---|
| verbforms-3-q8 | S2 | The fronted order "Without saying anything, she left." is grammatical, natural and has the same meaning. The grader drops the comma, so a student who builds it gets `without saying anything she left`, which is marked wrong. Other order items in these units (prepositions-1-q7, relatives-3-q7, verbforms-cp-q8) accept fronted adverbials, so this one is inconsistent. | accepted: `['she left without saying anything', 'without saying anything she left']`; explanation: append `Without-ilmaus voi olla myös lauseen alussa: Without saying anything, she left.` |
| verbforms-4-q5 | S2 | "Sara was disappointed not to **get chosen** for the school team" is the most natural spoken form for many native speakers (get-passive). The hint is `choose` and the instruction is "Kirjoita verbi oikeassa muodossa", so the answer is correct and is currently marked wrong. (If you want to drill only the be-passive, change the instruction instead.) | accepted: `['be chosen', 'have been chosen', 'get chosen']`; explanation: append `Arkikielessä myös get chosen on oikein.` |
| verbforms-2 (guide.reminder) | S3 | The heuristic "onko teko ennen vai jälkeen pääverbin? Jälkeen = to, ennen = ing" comes straight after the try sentence, but it does not work for try (try doing is not "earlier"). It also does not fit go on doing or stop doing, where the action is simultaneous or ongoing. | `Myös try muuttaa merkitystään: try to do = yrittää (vaikeaa), try doing = kokeilla, auttaisiko keino. Verbeillä remember, forget ja regret voit kysyä: tapahtuuko teko pääverbin jälkeen (to) vai ennen sitä (ing)?` |
| verbforms-5 (guide.rule) | S3 | The rule "lauseenvastikkeen tekijä on sama kuin päälauseen subjekti" comes right after the reduced-relative example, but it does not hold for reduced relatives: in "I met a man living next door" the doer is *a man*, not *I*. | Replace the last sentence with: `Tärkein sääntö: lauseen alussa olevan lauseenvastikkeen tekijä on sama kuin päälauseen subjekti. Lyhennetyssä relatiivilauseessa tekijä on se substantiivi, jonka perässä vastike on.` |
| verbforms-5-q1 | S3 | "I forgot my lunch on the kitchen table": standard usage guides (e.g. Cambridge) say you cannot use *forget* with a place; *leave* is used instead. This is also a classic Finnish learner error (*unohtaa johonkin*), so the model sentence should not contain it. | prompt: `'___ the house in a hurry, I forgot to take my lunch with me.'` (options, key and explanation unchanged) |
| prepositions-1-q4 | S3 | The explanation calls "in last year" a translation from Finnish, but *viime vuonna* has no preposition, so it is not a Finnish calque. | `"In last year" on yleinen virhe.` (replace the last sentence) |
| prepositions-2-q8 | S3 | `at a party we met` is accepted. It is grammatical but marked or poetic as a standalone answer to "Tapasimme juhlissa". It is acceptable to keep as a lenient variant; flagged only because the brief says nothing stylistically odd should be accepted. | Optional: accepted `['we met at a party']`. Keeping it is defensible. |
| prepositions-cp-q3 | S3 (doubt) | "suffer **with** headaches" is common in British English, especially for chronic conditions. Here the cue is episodic (*when they don't drink enough water*), so *from* is clearly the target, and YO graders expect *from*. I do not require adding it. | Optional: explanation append `(Brittienglannissa kuulee myös suffer with, mutta suffer from on varma valinta.)` |
| relatives-1 (guide.reminder) | S3 | "Jos relatiivipronomini on sivulauseen objekti, sen voi jättää pois" is true only in defining clauses. Lesson 1 comes before the commas lesson, so students would over-apply it. | `Rajaavassa relatiivilauseessa (ei pilkkuja) objektina olevan relatiivipronominin voi jättää pois: the cake you made.` (rest unchanged) |
| relatives-2 (guide.rule) | S3 | (a) "lähinnä muodollisessa tyylissä ja aina preposition jälkeen" can be read as "whom is used only after prepositions", which contradicts relatives-3-q4 (*whom we all liked*). (b) "Whose-sanan perään tulee suoraan substantiivi" is false when an adjective comes in between (*whose old car*). | `Whose ilmaisee omistusta ("jonka"), ja sitä käytetään sekä ihmisistä että asioista. Whose-sanan perään tulee substantiivi ilman artikkelia: the girl whose bike was stolen. Whom on who-sanan objektimuoto, ja nykykielessä se kuuluu lähinnä muodolliseen tyyliin. Suoraan preposition jälkeen ihmisistä käytetään aina whom: to whom, with whom, many of whom.` |
| relatives-3 (guide.rule) | S3 | "Siinä käytetään vain who, whom, which tai whose" leaves out the relative adverbs *where* and *when*, which are normal in non-defining clauses (*Oulu, where I live, ...*). | `Siinä käytetään relatiivipronomineista vain who, whom, which tai whose (paikasta ja ajasta myös where ja when).` |
| relatives-5-q7 | S3 | "Verbin tell me perässä": *tell me* is not a verb. | `What = se, mitä. Ilmauksen tell me perässä ei ole sanaa, johon pronomini viittaisi, joten that ei käy. Who ei sovi, koska tapahtui-verbin subjekti on asia.` |
| wordform-5-q5 | S2 | `had made` is accepted, but with only *last year* and no earlier past reference point the past perfect is wrong. The explanation itself says "imperfekti made". | accepted: `['made']` |
| wordform-5-q6 | S3 | "Make a photo on suomesta käännetty virhe" is factually wrong: Finnish says *ottaa kuva* (= take). | `Valokuva otetaan take-verbillä: take a photo. Make a photo on yleinen virhe.` |
| wordform-5-q1 | S3 | Finnish wording: "tyypillinen suomalaisen virhe" is ungrammatical. | `Virheitä tehdään make-verbillä: make a mistake. Do a mistake on suomalaisille tyypillinen virhe.` |
| wordform-5-q8 | S3 | `quickly she did her homework` is accepted. It is grammatical but marked/literary, and the explanation mentions only two positions, so the explanation and the accepted list do not match. | Either remove the third variant (accepted `['she did her homework quickly', 'she quickly did her homework']`), or keep it and append to the explanation `Alkuasema (Quickly, she did...) on mahdollinen mutta harvinainen.` |
| wordform-1-q3 | S3 | "Kind ja kindly ovat adjektiivi ja adverbi": *kindly* can also be an adjective (*a kindly old man*), and *kind* is also a noun (*a kind of*). | `Kind on tässä adjektiivi ja kindly adverbi, eikä kumpikaan sovi the ___ of -rakenteeseen.` |
| wordform-3 (guide.rule) | S3 | "im- ennen p:tä ja m:ää" leaves out b (*imbalance*, *imbalanced*). | `im- ennen p:tä, b:tä ja m:ää (impolite, imbalance, immature)` |

## Checked and fine (notable borderline cases considered)

- verbforms-2-q7 (*went on showing*): *After explaining the rules* marks a new activity, so *to show* is the only fit.
- verbforms-5-q7: *stood* (BrE regional "the man stood by the window") is non-standard and correctly not accepted.
- prepositions-1-q5: *on Friday at the latest* occurs, but the hint `by / until` limits the choice, so it is fine.
- relatives-4-q4, relatives-4-q6, relatives-cp-q3: the keys are unambiguous.
- No real-world factual claims or copied-looking sentences were found.
