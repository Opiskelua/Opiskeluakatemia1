# Review: Swedish Polku units A (ordfoljd, konnektorer, ordforrad)

Scope: every item, guide (rule, examples, reminder) and explanation in `opiskeluakatemia-content/src/data/learning-path-sv/`
`unit-ordfoljd.ts`, `unit-konnektorer.ts`, `unit-ordforrad.ts`.
Grading as described in the brief (`grading.ts`): lowercased, whitespace collapsed, `.,!?;:"` removed. Hyphens and å/ä/ö count. Order answers must exactly match an `accepted` sentence.

Method: I solved every item from the key-free sheets first. For choice items I listed every grammatical and natural option, for gap items every acceptable answer, and for order items every grammatical order. Only then did I compare with the unit files. I did not edit any unit file.

Result: **every choice key is correct, and no choice item has a second defensible option.** Most order items already accept the fronted and afterthought variants. I found no S1 issues. There are three missing accepted variants (S2) and some wording, duplication and explanation fixes (S3).

Severity: S1 = wrong key / correct answer marked wrong for the main answer / wrong rule; S2 = second defensible option, missing accepted variant, or wrong accepted answer; S3 = wording, naturalness, explanation or Finnish polish.

## Summary

| Unit | S1 | S2 | S3 |
|---|---|---|---|
| sv-ordfoljd | 0 | 0 | 3 |
| sv-konnektorer | 0 | 3 | 2 |
| sv-ordforrad | 0 | 0 | 4 |

## Findings

| item id | severity | problem | concrete fix (exact replacement text) |
|---|---|---|---|
| sv-konnektorer-1-q6 | S2 | *Hon blev bättre på svenska **av att titta** på svenska tv-serier* is very natural Swedish. *Av att* is the usual way to express an unintended cause or means ("got better from watching"). It translates the hint *katsomalla* correctly and is currently marked wrong. | accepted: `['genom att titta', 'genom att se', 'genom att kolla', 'av att titta', 'av att se', 'av att kolla']`; explanation: `Katsomalla ilmaisee keinoa, joten genom att + infinitiivi: genom att titta (myös se tai kolla). Genom-sanan jälkeen tarvitaan att ennen infinitiiviä. Myös av att titta on oikein: se kertoo, mistä parannus johtui.` |
| sv-konnektorer-4-q7 | S2 | *gå tidigt hem* is as natural as *gå hem tidigt* (compare *komma sent hem*). Both orders with *tidigt* before *hem* are missing. The flagged afterthought variant `jag gick hem tidigt därför` is acceptable in speech and can stay. | accepted: `['därför gick jag hem tidigt', 'därför gick jag tidigt hem', 'jag gick därför hem tidigt', 'jag gick därför tidigt hem', 'jag gick hem tidigt därför']` |
| sv-konnektorer-cp-q4 | S2 | *vem* is unmarked for number (SAG: *vem* can refer to several people), so *Vi vet ännu inte **vem som** ska spela i finalen* is correct and natural, even though *ketkä* is plural. A student who transfers the *vem som* pattern from lesson 5 is marked wrong. | accepted: `['vilka som', 'vem som']`; explanation: `Ketkä on epäsuoran kysymyksen subjekti (ketkä pelaavat), joten kysymyssanan perään tulee som: vilka som ska spela. Koska joukossa on useita, vilka on tarkin, mutta myös vem som käy.` |
| sv-ordfoljd-1 (guide.rule) | S3 | "Ruotsin päälauseessa taivutettu verbi on aina toisena" is contradicted inside the same unit: lesson 5 teaches *Kommer du?*, where the verb comes first in a main clause. | `Ruotsin väitelauseessa (päälause, joka ei ole kysymys tai käsky) taivutettu verbi on aina toisena lauseenjäsenenä. Jos lause alkaa jollakin muulla kuin subjektilla, esimerkiksi aikaa tai paikkaa ilmaisevalla sanalla (Nu, I dag, I morgon, Där, Sedan), subjekti siirtyy verbin perään: I dag åker jag till Åbo. Tämä on käänteinen sanajärjestys. Suomessa verbi voi jäädä kolmanneksi (Tänään minä lähden), ruotsissa ei koskaan.` |
| sv-ordfoljd-cp-q5 | S3 | The checkpoint item copies lesson content: *Tyvärr kan jag inte komma* is the first guide example of lesson 2 and the answer to 2-q1. It tests memory, not transfer. | Replace item: `order('sv-ordfoljd-cp-q5', 'Onneksi en myöhästynyt.', ['sent', 'lyckligtvis', 'inte', 'jag', 'kom', 'för'], ['lyckligtvis kom jag inte för sent', 'jag kom lyckligtvis inte för sent', 'jag kom inte för sent lyckligtvis'], 'Kun lause alkaa sanalla lyckligtvis, verbi kom tulee toiseksi ja subjekti jag sen perään: Lyckligtvis kom jag inte för sent. Subjektilla alkavassa lauseessa lyckligtvis tulee verbin jälkeen ennen inte-sanaa tai lauseen loppuun.')` |
| sv-ordfoljd-cp-q6 | S3 | This is a near-copy of 5-q4 (*Vet du var Lisa bor?*): same frame, same verb, only the name changes. sv-ordforrad-1-q1 also has the identical sentence. | Replace item: `gap('sv-ordfoljd-cp-q6', 'Vet du ___ i kväll?', 'börjar / när / filmen', ['när filmen börjar'], 'När filmen börjar on epäsuora kysymys, joten subjekti filmen tulee ennen verbiä börjar.', WO)` |
| sv-ordfoljd-2 (guide.rule) | S3 (minor) | *Därför*, *Dessutom* and *Till exempel* are connective adverbs, not sentence adverbs like *tyvärr*. The label does not change any answer. | `Alussa voi olla adverbi tai adverbiaali (Tyvärr, Därför, Dessutom, Till exempel, Ofta), objekti (Det tror jag inte) tai muu lauseenjäsen.` (replace that sentence; rest unchanged) |
| sv-konnektorer-2 (guide.reminder) | S3 | "Jos suomeksi on 'kun', tulee när" overgeneralises. A causal *kun* (*kun olin väsynyt, menin nukkumaan* = *eftersom*) is not *när*, and lesson 4 teaches *eftersom*. | `Testaa: jos suomeksi on "-ko/-kö" tai "jos", ruotsiksi tulee om. Jos suomeksi on aikaa ilmaiseva "kun", tulee när. (Syytä ilmaiseva kun on eftersom.) Kuvitteellinen ehto on aina om: Vad skulle du göra om du vann?` |
| sv-konnektorer-3-q5 | S3 (doubt) | "Tässä parissa käytetään aina utan, ei men" is too absolute. *inte bara … men också* does occur in modern Swedish, though *utan också* is the norm and the safe choice for the exam. The key is fine. | explanation: `Ei vain … vaan myös = inte bara … utan också. Käytä tässä parissa utan: se on vakiintunut ja varma valinta.` |
| sv-ordforrad-1-q2 | S3 | The claim that a Finn might think "en tiedä häntä" is false. In Finnish this is *en tunne häntä*, which maps directly to *känna*, so it is not a Finnish interference error. | explanation: `Tuntea ihminen: känna. Veta käytetään asioista (vet att…, vet var…), ei ihmisistä. Kunna tarkoittaa osata.` |
| sv-ordforrad-1-q1 | S3 | Identical sentence to sv-ordfoljd-5-q4 (*Vet du var Lisa bor?*). 1-q8 (*jag vet inte var Emma bor*) also repeats the sv-ordfoljd-5-q6 pattern. | prompt: `'___ du när affären stänger?'`; explanation: `Tietää asia, jota seuraa kysymyssana (när): veta. Känna tarkoittaa tuntea, ja kunna tarkoittaa osata.` |
| sv-ordforrad-5-q6 | S3 | Finnish: "astumassa jäiselle portaalle" is unidiomatic (the plural *portaat* is normal). The explanation also has stray punctuation ("Varo!: Akta dig!"). Keys *akta / passa* are fine. | prompt: `'Kaverisi on astumassa jäisille portaille. Varoitat häntä: ___ dig, det är halt!'`; explanation: `Varo! = Akta dig! Myös Passa dig! tarkoittaa varo, mutta Akta dig on tavallisin.` |
| sv-ordforrad-3-q8 | S3 (minor) | The explanation uses "finiittiverbin", but the rest of the units consistently say "taivutettu verbi". | explanation: `Hittills = tähän mennessä. Jos hittills on alussa, verbi tulee ennen subjektia: hittills har allt. Se voi olla myös lauseen lopussa tai heti taivutetun verbin jälkeen.` |

## Checked and fine (notable borderline cases considered)

- **Flagged fronted and afterthought orders.** These are accepted and I agree with keeping them. They are grammatical, if marked, and accepting them only helps students:
  - sv-ordfoljd-1-q4: `till Stockholm åker jag i morgon` and `jag åker i morgon till Stockholm`. Time before place in the middle field is natural.
  - sv-ordfoljd-1-q7: `ett sommarjobb har jag nu` (contrastive object fronting) and `jag har nu ett sommarjobb`.
  - sv-ordfoljd-2-q5: `du kan cykla till exempel till skolan` (scope on the destination).
  - sv-ordfoljd-cp-q5: `jag kan inte komma tyvärr` (spoken afterthought).
  - sv-konnektorer-4-q7: `jag gick hem tidigt därför`.
  - No order item in these units is missing a main or fronted variant, apart from the S2 rows above. Also fine: sv-ordfoljd-3-q5, 4-q5 and 5-q6; sv-konnektorer-1-q7, 3-q7 and cp-q7 (both coordinand orders); sv-ordforrad-2-q8, 3-q8, 4-q8 and cp-q8.
- **BIFF in eftersom clauses (sv-ordfoljd-4-q5, 4-q7).** *eftersom han aldrig har flugit* and *eftersom Sara redan var trött* are the standard written norm. Main-clause order after *eftersom* (*eftersom han har aldrig flugit*) occurs in speech, but it should not be accepted on an exam drill. In 4-q7, *Sara var redan* is heard colloquially, partly because *redan trött* can be read as one phrase. The key and explanation are correct for written Swedish. The reminder about spoken *att han kommer inte* handles this honestly.
- **sv-konnektorer-4-q4 (medan vs innan).** *Då blir vi klara snabbare* forces doing the chores at the same time, so *innan* is excluded. The key is correct.
- **sv-konnektorer-4-q5 (innan only).** Using *före* as a conjunction (*före du äter*) is colloquial and regional, and the explanation addresses it. *förrän* only works after a negation. Accepting *innan* alone is correct.
- **sv-ordforrad-2-q2 (anställa / rekrytera).** Both are correct. *anlita* (hiring a service or contractor) does not fit "hire engineers" as employees, so it is rightly not accepted.
- **sv-ordforrad-2-q5 (försökte / försökte att / provade att).** All are fine. *provade att ringa* is common and standard enough. Bare *provade ringa* is not standard and is rightly not accepted.
- **sv-ordforrad-5-q6 (Akta / Passa dig).** Both are fine (SO: *passa sig* = *akta sig*). *Se upp* cannot take *dig*.
- **sv-ordforrad-cp-q5 (egentligen / i själva verket).** Both are fine, with inversion after the fronted adverbial inside the *men* clause.
- **sv-ordforrad-cp-q7 (i / om veckan).** Both are standard in Sweden and Finland. *per* does not fit before the definite *veckan*.
- **sv-ordforrad-4-q1 (om dagen).** Standard. *per dag* is not possible with the given definite noun, and *med* and *från* are clearly wrong.
- **sv-ordforrad-cp-q8.** `hon kan till och med japanska` and `till och med japanska kan hon` are fine. *hon kan japanska till och med* is not natural and is rightly excluded.
- **sv-konnektorer-3-q4.** *vare sig* without a negation is a known nonstandard usage, so excluding it is correct, and the guide reminder states the rule correctly.
- **sv-konnektorer-2-q5.** *om … eller* in an alternative indirect question is correct. *ifall* would also be possible, but the hint limits the choice to att/om.
- **sv-konnektorer-5-q5.** Option *vad det hände* is a common learner and dialect form and is correctly rejected.
- **sv-ordforrad-3 reminder.** "Suomenruotsissa ännu tarkoittaa usein myös 'yhä'" is true: *ännu* = *fortfarande* is a known finlandism.
- **Level.** Everything is at or near B1. *tillsätter* (sv-ordforrad-2-q3) is above B1, but it is only a distractor and the explanation glosses it. *anställningsintervju* is fine.
- **Finnish text.** Apart from the rows above, the Finnish guides and explanations are grammatical and idiomatic.
