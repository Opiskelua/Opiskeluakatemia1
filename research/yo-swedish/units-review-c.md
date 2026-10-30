# Review: Swedish (RB) Polku units — sv-verb, sv-partikelverb, sv-prepositioner

Scope: every item, guide (rule, examples, reminder) and explanation in `opiskeluakatemia-content/src/data/learning-path-sv/`
`unit-verb.ts`, `unit-partikelverb.ts` and `unit-prepositioner.ts` (lessons 1–5/6 + checkpoint of each).
Grading as described in `src/lib/learning-path-v2/grading.ts`: lowercase, whitespace collapsed, `.,!?;:"` removed. Hyphens and å/ä/ö count, and order answers must match an `accepted` sentence exactly.

Method: I first solved every item blind from the key-free sheets in the scratchpad (`blind/sv-verb.md`, `blind/sv-partikelverb.md`, `blind/sv-prepositioner.md`), listing every option I consider grammatical and natural and every order I would accept. After that I compared my answers with the unit files.

Result: **All choice keys match my blind answers.** Every gap key matches, and every order item accepts both orders I produced (unmarked SVO order and fronted adverbial with V2). I found one choice item with a possibly defensible second option (sv-verb-2-q1, doubt). I found three order or gap items with a missing correct variant. One guide reminder teaches a false generalisation (sv-prepositioner-1). The rest is S3 polish.

Severity: S1 = wrong key, a correct main answer marked wrong, or a wrong rule taught. S2 = a second defensible option, a missing accepted variant, or an accepted answer that is wrong. S3 = wording, naturalness, explanation or Finnish polish.

## Summary

| Unit | S1 | S2 | S3 |
|---|---|---|---|
| sv-verb | 0 | 4 | 4 |
| sv-partikelverb | 0 | 0 | 3 |
| sv-prepositioner | 1 | 0 | 4 |

## Findings

| item id | severity | problem | concrete fix (exact replacement text) |
|---|---|---|---|
| sv-verb-2-q1 | S2 (doubt) | Flagged by the writer. The key `har blivit` is right and is by far the most common collocation with *de senaste åren*. But *X blir allt vanligare* describes an ongoing trend, and present tense with *de senaste åren* does occur in Swedish journalism ("De senaste åren blir det allt vanligare att …"). A careful student could defend `blir`. The item tests perfect tense against preterite, so the present-tense distractor adds risk without testing anything. Replace it with a clearly wrong form. | options: `['blev', 'har blivit', 'hade blivit']` (key stays 1); explanation: `De senaste åren = viime vuosina, ja ajanjakso ulottuu nykyhetkeen asti, joten käytetään perfektiä har blivit. Preteriti blev vaatisi päättyneen ajan, ja pluskvamperfekti hade blivit vaatisi menneen vertailukohdan.` |
| sv-verb-2-q8 | S2 (doubt) | `priserna har de senaste åren stigit` is grammatical written Swedish: a time adverbial can stand between the auxiliary and the supine ("Priserna har under de senaste åren stigit kraftigt"). It uses exactly these tokens and means the prompt, but it is marked wrong. | accepted: `['priserna har stigit de senaste åren', 'de senaste åren har priserna stigit', 'priserna har de senaste åren stigit']` |
| sv-verb-6-q8 | S2 | `i finland talas svenska och finska` and `svenska och finska talas i finland` have the same meaning as the prompt. Only the order of the two coordinated languages differs, and a student who puts them in the other order is marked wrong. | accepted: `['i finland talas finska och svenska', 'finska och svenska talas i finland', 'i finland talas svenska och finska', 'svenska och finska talas i finland']` |
| sv-verb-cp-q3 | S2 | "hade någon redan ätit **upp** all glass" is the more idiomatic Swedish (eating everything up is *äta upp*). A student who writes `ätit upp` into the gap is marked wrong. | accepted: `['ätit', 'ätit upp']`; explanation: append ` Luontevaa on myös ätit upp (syönyt loppuun).` |
| sv-verb-1 (guide.rule) | S3 | "Preesens päättyy aina r-kirjaimeen" is false: the modal verbs *kan, vill, ska, måste* and *vet* have no -r. Lesson 4 of the same unit is built on these modals. | Replace the first sentence with: `Preesens päättyy lähes aina r-kirjaimeen (poikkeuksia ovat modaaliverbit kan, vill, ska, måste sekä vet), ja muoto on sama kaikissa persoonissa: jag/du/hon/vi talar.` |
| sv-verb-1-q4 | S3 (doubt) | "Kör inte så fort, vi hinner inte med!" has slightly odd logic. *Vi hinner inte med* means "we can't keep up", which works only if the speaker is following the driver. Students will most often read it as a passenger's line. | prompt: `'___ inte så fort, det är halt på vägen!'` (hint, key and explanation unchanged) |
| sv-verb-2-q5 | S3 | Finnish slip in the explanation: "Var-verbin supiini" should be *vara*. | explanation: `Hittills = tähän mennessä, eli aika ulottuu nykyhetkeen: perfekti har varit. Vara-verbin supiini on varit.` |
| sv-verb-2 (guide.reminder) | S3 | "Sedan två år tillbaka / i två år (ja jatkuu) → perfekti" sits next to the guide example *Jag bodde i Lund i två år* (preterite with *i två år*). Students may read *i två år* itself as a perfect-tense trigger. | `Mieti, liittyykö aika nykyhetkeen. För två år sedan (kaksi vuotta sitten) → preteriti. Sedan 2020 tai i två år, kun asia jatkuu yhä → perfekti (Jag har bott här i två år). Jos jakso on päättynyt, myös i två år saa preteritin: Jag bodde i Lund i två år.` |
| sv-partikelverb-3-q7 | S3 | "Tro om käytetään vain mielipidekysymyksessä" overstates the rule: *tro gott/illa om någon* and *det hade jag inte trott om honom* also exist. | explanation: `Uskoa johonkin = tro på. Tro om esiintyy lähinnä mielipidettä kysyttäessä (Vad tror du om det?), ei uskomisen merkityksessä.` |
| sv-partikelverb-5-q3 | S3 | Flagged by the writer. Accepting `värk` is correct: *ha värk i* is standard (SO: *värk i ryggen*). But the explanation presents it as an equal alternative, and with *huvudet* the idiomatic forms are *ont i huvudet* or *huvudvärk*. The accepted list is fine. | explanation: `Minulla on pää kipeä = jag har ont i huvudet. Myös jag har värk i huvudet hyväksytään, mutta tavallisempia ovat ont i huvudet ja huvudvärk.` |
| sv-partikelverb-4 (guide.reminder) | S3 | The sample sentence "I dag kommer jag inte ihåg något" ("today I don't remember anything") is grammatical but semantically odd. | `Jos lauseen alussa on jokin muu kuin subjekti, päälauseessa on käänteinen sanajärjestys: Hans namn kommer jag inte ihåg.` |
| sv-prepositioner-1 (guide.reminder) | S1 | Wrong rule taught: "Paikkoihin, joissa ollaan på, myös mennään på". The lesson's own rule lists *på jobbet* and *på Gotland/Åland*, but you go *till jobbet* and *åka till Gotland* (cp-q3 even builds on Gotland). Students would produce *gå på jobbet* and *åka på Gotland*. | `Kun mennään jonnekin, käytetään yleensä till: åka till Sverige, gå till jobbet, åka till Gotland. Tapahtumiin ja huvituksiin mennään kuitenkin på: gå på bio, gå på konsert.` |
| sv-prepositioner-1 (guide.rule), 1-q1, cp-q1 | S3 | "maiden ja kaupunkien kanssa käytetään aina i" is false for island states: *på Island* (Iceland), *på Kuba*, *på Cypern*. The rule itself mentions that islands take *på*. | rule: replace `ja maiden ja kaupunkien kanssa käytetään aina i: i Sverige, i Vasa.` with `ja maiden ja kaupunkien kanssa käytetään i: i Sverige, i Vasa (poikkeus: saarivaltiot, esim. på Island).`; 1-q1 explanation: `Maiden ja kaupunkien kanssa käytetään i: i Sverige, i Finland, i Stockholm. På Sverige on virhe.`; cp-q1 explanation: `Kaupunkien kanssa käytetään i: i Helsingfors. Hos tarkoittaa jonkun luona.` |
| sv-prepositioner-1-q3 | S3 | "I jobbet on virhe" is too absolute. *i jobbet* is correct Swedish for "in one's work" ("Jag använder svenska i jobbet"). It is only wrong for the location. | explanation: `Työpaikalla olemista ilmaistaan prepositiolla på: på jobbet, på kontoret. I jobbet tarkoittaa työtehtävissä (Jag använder svenska i jobbet), ei työpaikalla.` |
| sv-prepositioner-4-q8 | S3 | Flagged by the writer. Accepting the fronted *Det här regnet är jag trött på* is correct: it is a natural topicalisation with a stranded preposition. But the explanation calls *det här regnet* an "objekti", although it is the complement of the preposition. | explanation, last sentence: `Jos det här regnet on lauseen alussa, prepositio jää loppuun: Det här regnet är jag trött på.` |

## Checked and fine (notable borderline cases considered)

**Writer-flagged items**
- **sv-verb-2-q3** (*sedan 2020*): `har bott` is correct. *bor … sedan 2020* would also be possible (in Finland-Swedish and colloquially), but it is not among the options. `bodde` and `hade bott` are clearly wrong. The guide's "yleensä perfektiä" hedge is accurate.
- **sv-partikelverb-4-q8** (`att han inte höll med sa han`): fronting an object clause with V2 inversion (*sa han*) is grammatical Swedish. It is marked but acceptable, and the explanation covers it. Keep it. The alternative order with the same tokens, `han sa inte att han höll med`, has a different meaning ("he did not say he agreed") and is rightly not accepted. (The brief also mentions 1-q8. That item's accepted forms are `Lisa ser glad ut i dag` and `I dag ser Lisa glad ut`, which are correct and complete.)
- **sv-partikelverb-3-q2** (*längta efter*): `på` and `om` are both impossible. *längta till* exists ("längta till sommaren"), but it is not an option. **3-q6** (*vänta på*): `till` would mean "until" and `för` is wrong, so the key is unique.
- **sv-prepositioner-5-q1** (*tack vare*): `tack vare` with a negative cause occurs only ironically, so `på grund av` is the only natural choice.
- **sv-prepositioner-4-q3** (*bra på att*): Swedish speakers say *bra i matte* colloquially, but `i` is not possible before an att-infinitive. `med` is wrong. The key is unique.
- **sv-prepositioner-3-q1** (*var/vart*): `Var` is the standard form. *Vart bor du?* occurs in Finland-Swedish and in colloquial Sweden-Swedish, but it is non-standard in writing. The guide reminder handles this correctly.

**Other borderline cases**
- sv-verb-cp-q1: unlike 2-q1, `ökar` with a closed ten-year span is clearly worse than `har ökat`. It parallels 2-q1 but is not a copy.
- sv-verb-4-q1: *Enligt väderprognosen ska det bli varmt* is natural, but the following `att` rules out `ska`, so the key is unique.
- sv-verb-4-q5: `borde` and `bör` are both accepted, which is good.
- sv-verb-5-q5: `börjat att` is already accepted, which is good.
- sv-verb-5-q6: `tycker om` and `planerar` would need `att` here, so `brukar` is unique.
- sv-verb-3-q7: the fronted form is accepted. *Hem gick jag efter att ha ätit* is too marked to require.
- sv-verb-1-q7: reversing the clauses would change the order of the route steps, so only one order is correct.
- sv-partikelverb-1-q6: *Ge dig inte!* also means "don't give up", but *dig* is not a particle and the instruction asks for a particle, so `upp` is the only answer.
- sv-partikelverb-1-q5: *ta med paraply* without a pronoun is natural.
- sv-partikelverb-4-q3: `på dig` is correct. The explanation of *sätt dig på jackan* is a nice touch.
- sv-partikelverb-cp-q6: `inte kom ihåg` in an att-clause after *Förlåt* is correct.
- sv-prepositioner-1-q7: *i fönstret* could be defended, but it is not an option.
- sv-prepositioner-2-q1: *på hösten* for "this autumn" occurs in Finland-Swedish, but *kanske redan i oktober* makes `i höst` clearly right, and the explanation says "yleensä".
- sv-prepositioner-2-q5: `på sex år` would need negation or a completion reading, so `i` is unique.
- sv-prepositioner-5-q3: *Genom min kusin* would also be natural, but the hint *ansiosta* points to `tack vare`.
- sv-prepositioner-5-q6: two-way hint, and `förutom` is unique (*utöver* is not an option because of the hint format).
- sv-prepositioner-cp-q4: `hemifrån` is unique.
- Checkpoints: no checkpoint item copies a lesson item verbatim. They test the same points with new sentences.
- Level: vocabulary is B1-appropriate throughout. *elsparkcyklar*, *elevkårens ordförande* and *i förhållande till* are at the upper end but fine for RB.
- Finnish text: apart from the *Var-verbin* slip, the Finnish is idiomatic. *preposition jälkeen* in sv-verb-5-q3 is the correct genitive.
