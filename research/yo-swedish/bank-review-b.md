# Bank review B: phrase banks, Finnish-cue gaps, dialogue translations

Date: 2026-11-01. Reviewer: B.

## Scope
- `src/data/sv-task-bank/short-tasks.ts`: 4 phrase banks (basketklubben, djurhemmet, korkortet, musikalen) and 4 Finnish-cue gap texts (mormors-mobil, flytten-till-aland, spelhobbyn, sommarkurs-i-lund). That is 40 items.
- `src/data/sv-task-bank/translation.ts`: 5 dialogue translations (reklamation, sjuk, vagen-stockholm, fodelsedag, sommarjobb). That is 20 lines, 60 chunks.

## Method
1. I solved the key-free sheet blind and saved the answers to the scratchpad file `blind-b.md` before opening any source. For each phrase-bank gap I listed every phrase that fits. For each cue gap I listed every variant I would accept. For each translation chunk I gave a natural translation and the variants I would accept.
2. I compared the blind answers with the keys, `accepted` lists, chunks and explanations.
3. I checked the files against the QA blacklist (säker att, konstgjord kött, en av de … sidor, låna mig, the definite-form "rule", the alla/allt rule, ska = obligation). Nothing matched.
4. I made minimal edits. `npx tsx scripts/check-sv-task-bank.ts` then exited 0 (29 tasks, 194 items).

## Results
- **Phrase banks:** all 20 keys match my blind answers, and no gap has a second option that works. Each sin/hans/deras pair, each V2 pair and each -t/-a pair has exactly one form that fits.
- **Finnish-cue gaps:** every first-listed answer matches mine.
- **Translations:** no example in the `accepted` lists is wrong.

## Findings

| Item | Sev | Issue | Fix applied |
|---|---|---|---|
| fraser-korkortet 1.4 (explanation) | S1 | The explanation said svår fits only an en-word and gave `provet är …` as an example. Provet is an ett-word (provet är svårt), so the example teaches a false gender. | Changed to "(uppgiften är svår); ett-sanan kanssa sekin olisi t-muodossa (provet är svårt)". |
| fi-flytten-till-aland 1.5 | S2 | `var tursamma` was accepted by exact match. *Tursam* is not a safe standard-Swedish adjective. `hade haft tur` was missing; it is a plausible reported-speech form. | Removed `var tursamma`, so the AI checker now judges it. Added `hade haft tur` and `hade stor tur`. |
| fi-spelhobbyn 1.2 | S2 | `av att spela` (lärt mig mycket engelska av att spela) is very natural but was missing. | Added `av att spela`, `av att spela spel` and `genom spelande`. |
| fi-spelhobbyn 1.3 (writer flag) | S2 | `ha råd till` is a standard alternative to `ha råd med` and was missing. The list already had the att-betala variants. | Added `inte hade råd till`. The explanation now says "ha råd med (tai till)". |
| fi-flytten-till-aland 1.1 | S2 | `sommaren i fjol` was missing. | Added. |
| fi-mormors-mobil 1.1 | S2 | `våren i fjol` was missing. | Added. |
| fi-sommarkurs-i-lund 1.5 (writer flag) | S2 | `skulle jag gärna` (Nu skulle jag gärna åka tillbaka) was missing. The explanation named only ha lust att, although the list accepts vill / skulle vilja. | Added the variant. The explanation now also names vill jag / skulle jag vilja. |
| fraser-musikalen 1.3 (writer flag) | S3 | The key is correct and nothing else fits. The explanation presented `lära sig + att + inf.` as the only pattern, but att can be left out. | Added "Att-sanan voi myös jättää pois: lärt sig lyssna." |
| fi-flytten-till-aland 1.2 (writer flag) | S3 | The list was fine. The `kände jag mig` variants had no forms without `de`. | Added `Första veckorna kände jag mig` and `Under första veckorna kände jag mig`. |
| fi-mormors-mobil 1.4 | S3 | `hälften av meddelandena` is a plausible spelled-out form. | Added. |
| fi-spelhobbyn 1.5 | S3 | `Nästa år skulle han vilja` was missing. | Added. |
| oversatt-reklamation 1.1 chunk 1 (writer flag) | S3 | The example `Ja, jag köpte de här hörlurarna` drops "täältä". That signals to the AI checker that leaving out part of the chunk is fine. "redan sönder" and "i förra veckan" are both correct and are kept. | Removed the incomplete example. |
| oversatt-vagen-stockholm 1.4 chunk 1 (writer flag) | S3 | `räddat min dag` is a common anglicism but acceptable. The idiomatic `rädda dagen` was missing. | Added `du räddade dagen!`, `du har räddat dagen!` and `du har räddat dagen för mig!`. |
| oversatt-sjuk 1.3 chunk 2 | S3 | `hälsovårdscentralen` was missing. | Added. |
| oversatt-sommarjobb 1.4 (writer flag) | none | `i slutet på maj` is an accepted variant and fine to keep. `i slutet av` is listed first. | No change. |
| fraser-djurhemmet 1.5 (writer flag) | none | The key (en fantastisk känsla) is clear because of "säger han och ler". The distractor is grammatical but means the opposite. | No change. |

## Summary count
- S1: 1
- S2: 6
- S3: 7

All are fixed. No listening scripts were touched.

## Left unfixed
- **fi-spelhobbyn 1.3, `hade inte råd med`:** a student who writes this main-clause word order inside the eftersom clause goes to the AI checker. Short items have no `notAccepted` field, so it cannot be blocked in the data. The checker prompt says "Ole tiukka", and the explanation states the BIFF rule. The only fix would be a code change (`notAccepted` for short items), which is outside my scope.
- **Loose translation examples kept:**
  - sjuk 1.4: `Tack, det låter jättebra.`
  - sommarjobb 1.1: `hela mitt liv.`
  - vagen 1.1: `Jag har försökt hitta stationen`

  These are defensible renderings in the dialogue context, and the AI checker treats the lists only as examples.
