# Abi-hahmo ja Polun parannukset – suunnitelma

Lähteet: [mascot-case-study.md](mascot-case-study.md) (case study), Polku v2 -kartoitus (tämä istunto, 30.10.2026), [../opiskeluakatemia/docs/LEARNING_PATH_V2.md](../opiskeluakatemia/docs/LEARNING_PATH_V2.md).

**Omistajat:** mobiili = istunto `opiskeluakatemia1-1b`, verkkosivu + palvelin (API, Supabase) = istunto `opiskeluakatemia1-ab`. Yhteinen spec = [../assets/mascot/mascot-states.json](../assets/mascot/mascot-states.json): poseeraukset, tekstit, säännöt. Tekstejä ja sääntöjä ei kopioida komponentteihin.

**Haarat:** verkko: oma worktree `main`-haarasta (Polku v2 on mukana, `pisterajat-pages` ei saa sekoittua). Mobiili: emo-repo, haara `learning-path-v2`.

## Periaatteet (case studysta)
1. Hahmo on aina lisäkerros: tulos, pisteet ja putki näkyvät myös tekstinä. Koriste-käytössä tyhjä alt / piilotettu ruudunlukijalta.
2. Ei hahmoa tehtävän aikana, kieliopin testissä, koeharjoituksessa eikä maksu- tai tilivirheissä.
3. Ei syyllistämistä, ei surullista tai "kuolevaa" hahmoa, ei vauvapuhetta. Putkesta kerrotaan tila, ei moitita.
4. Isot juhlat (tanssi) vain isoista asioista ja enintään 2 kertaa päivässä. Tervehdys kerran päivässä.
5. Tekstit kiertävät päivittäin (stabiili hash), sama rivi ei toistu joka kerta.
6. Reduced motion: vain still-kuvat.

## Assetit
- Valmiina: `assets/mascot/master/*.png` (1024), `web/*-{256,512}.webp` (8–20 kt), poseeraukset idle, greet, think, relax, celebrate, cheer.
- Mobiili käyttää samoja WebP-kuvia (RN `Image` tukee WebP:tä Androidilla ja iOS 14+:lla; Expo SDK:n minimi-iOS on tätä uudempi). `mobile/`-PNG:t ovat varalla, jos WebP ei toimi laitteella.
- Myöhemmin: uudet poseeraukset (unelias, peukku/kannustus, osoittaa), läpinäkyvät WebM/HEVC-loopit verkkoon, kevennetty `abi-hero.glb` etusivulle.

## Vaihe 1 – nyt (ei vaadi uutta sovelluskauppaversiota)

### Yhteinen: Mascot-komponentti
| | Verkko | Mobiili |
|---|---|---|
| Komponentti | `components/mascot/Mascot.tsx` (`next/image`, props `pose`, `size`, `decorative`, `animateIn`) | `src/components/Mascot.tsx` (RN `Image`, sama API, `useReduceMotion`) |
| Spec | importoi `mascot-states.json` (kopio `src/data/mascot/` + drift-testi, kuten path-v2-types) | sama: kopio `src/lib/mascot-states.json` + drift-testi |
| Apurit | `pickLine(moment, date, userId)`, `momentForResult(grade, rewards, celebrationsToday)`, `streakAtRisk(summary, now)` – puhtaat funktiot + testit | samat funktiot `src/lib/mascot.ts` + testit |

### Sijoittelut (molemmat alustat)
| Hetki (`moments.*`) | Verkko | Mobiili |
|---|---|---|
| onboarding | PolkuV2-kartan yläpuolelle kortti, kun xp 0 ja ei ohitettu | `path.tsx` yläosa + `PathHomeCard` |
| pathHere | `PathMap` Trail: pieni idle seuraavan solmun viereen | `path.tsx` LessonNode `youAreHere` |
| nextUpDaily | `NextUp` | "Seuraavaksi"-kortti |
| lessonPassed / Perfect / Failed / unitCompleted / levelUp / dailyGoalReached | `ResultScreen` hero | `path-lesson.tsx` tulosnäkymä (`ScoreCard`/`RewardCard`) |
| streakAtRisk | `PathStats` putkiruutu | `GoalStreak` |
| reviewEmpty | `ReviewSession` tyhjä tila | `path-review.tsx` tyhjä tila |
| allDone | `NextUp` kaikki tehty | `path.tsx` |

### Polun parannukset, mobiili (omistaja 1b)
1. Kartta vierittää automaattisesti seuraavaan solmuun.
2. Luonnokset tallentuvat automaattisesti (kuten verkossa): tallennus siirryttäessä tehtävästä toiseen ja kun sovellus menee taustalle; "Tallenna keskeneräisenä" -nappi jää varalle.
3. `pathFailure` lukee palvelimen virhekoodin (`code`) eikä pelkkää HTTP-statusta.
4. Kertaus-kortti näkyy aina (tyhjänä saavutuksena), ei katoa.
5. Oppitunnin avaus ei lataa koko polkua uudelleen, jos tuore data on jo muistissa (välimuisti `path-v2.ts`:ssä, mitätöinti submitin jälkeen).
6. Testit puhtaille apureille (mascot + model).

### Polun parannukset, verkko ja palvelin (omistaja ab)
1. Sama Mascot-kerros kuin yllä.
2. Päivän tehtävät: päivämäärät Helsingin aikaan (nyt UTC), kuollut kutsu `/api/streaks/register` pois, ja Päivän tehtäviin Polun seuraava oppitunti / Kertaus ehdotukseksi.
3. Uusinnan täydellisyysbonus: korjaa doc tai koodi niin, että ne vastaavat toisiaan, ja lisää testi.
4. LEARNING_PATH_V2.md:n tila-rivi ajan tasalle.
5. Tummaa tilaa ei Polussa vielä ole – ei tässä vaiheessa.

## Vaihe 2 – palvelinmuutokset (päätökset käyttäjältä ennen toteutusta)
- **Palaute jokaisen vastauksen jälkeen**: uusi `check`-endpoint yhdelle tehtävälle (vastaus + selitys), arvosana edelleen palvelimella. Mahdollistaa hahmon reaktiot oppitunnin aikana (vain useamman virheen jälkeen, ks. periaate 2).
- **Putki laskee yrityksen**: opiskelupäivä kirjataan myös hylätystä mutta palautetusta yrityksestä (migraatio RPC:hen `save_course_lesson`). Tuotepäätös.
- **Lepopäivä / putken jäädytys** (relax-poseeraus).
- **Muistutukset**: mobiili `expo-notifications` (vaatii uuden kauppaversion ja `POST_NOTIFICATIONS`-luvan), verkko sähköposti Resendillä + cron. Kiertävät tekstit, ei öisin, lopettavat itse jos ei reagoida.
- **Uudet poseeraukset ja loopit**, `abi-hero.glb` etusivulle.

## Valmiin määritelmä (vaihe 1)
- Kaikki `moments.*` näkyvät molemmilla alustoilla, tekstit tulevat specistä.
- Reduced motion ja ruudunlukija toimivat (koriste-alt tyhjä, tieto tekstinä).
- Testit puhtaille apureille vihreänä, olemassa olevat testit vihreänä (verkko `npm test`, mobiili `npm test`), tyypit kunnossa.
- Verkko: `/dev/path-v2/ui?scenario=fresh|midway|complete` näyttää hahmon oikeissa kohdissa.
