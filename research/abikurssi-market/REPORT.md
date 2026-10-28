# Englannin abikurssi market research (28.10.2026)

Evidence limits: search demand comes from live Google autocomplete (fi/FI), which gives phrasing but no volumes. Google results pages and AI answer engines (ChatGPT, Perplexity, AI Overviews) could not be queried directly; the "who ranks" section is an indication, not a Google.fi ranking.

## 0. Current offering and live-site status

- Englannin abikurssi, online and self-paced, long syllabus (pitkä englanti) only. 44.99 €, "Kevään 2027 kirjoituksiin, voimassa 22.3.2027". No refund or grade guarantee. About 9 articles, a free grammar check and a todistusvalinta calculator (on the release-prep branch).
- Live site on 28.10.2026: homepage serves only the title and an old meta description ("Tekoälypohjainen oppimisalusta lukioopiskelijoille"); /sitemap.xml and /englannin-kielioppitesti return 404; robots.txt has only Cloudflare's content-signal block. The SEO work in the repo is not deployed.

## 1. Competitors (published prices, checked 28.10.2026)

| Provider | Format | Price | Included | Guarantee | Notes |
|---|---|---|---|---|---|
| Lara (lara.fi) | Online, self-paced | 59.99 € English (long); 99.99 € English + Swedish; valid to 1.4.2027 | All exam sections, feedback on every answer, essay trainer, practice exams, flashcards | 14-day cancellation | Main rival and SEO leader: 109 articles, about 50 on English (pisterajat, "oikeat vastaukset" after each exam, exam dates, "miten valita abikurssi"). Claims "9/10 suosittelee, 900+ arvostelua" (self-reported). |
| Solva (solvalearn.com) | Online, browser only | 49.99 € per course; long and short sold separately | ~1,130 tasks per course, real-exam mode with L–A estimate, 8 languages | No general refund; 60-min free trial, no card | Its comparison article (11.10.2026) covers Lara, Eezy, WordDive, Studeo, Tutorhouse and leaves out Opiskeluakatemia. Claims 4.8/5 from 30 own reviews. |
| WordDive (also owns abikurssit.fi) | App, self-paced, ~35 h | 99 € | Vocabulary, grammar, reading, listening, sample essays, E/C goals, long and short | "Enkusta E tai rahat takaisin" (goal 100% complete and grade missed) | Strongest brand; in Google autocomplete. Forum feedback mixed. |
| Eezy Valmennuskeskus, Abinetti A-englanti | Online, ends 22.3.2027 | 215 € | 100+ tasks, video lessons, 6 teacher-graded essays | None stated in text | Claims "70 % saavutti tavoitearvosanan" (self-reported). In autocomplete. |
| Mafy, Yo-kertaus A-englanti | Online, 12 months | 37.90 € | 480 reading/listening, 830 grammar, 370 vocabulary tasks, 20 essays with automatic feedback, 2 practice exams | None stated | Cheapest, content-heavy; a review says it suits E/M, not L. |
| Lexie (lexielearn.com) | Web + iOS/Android apps | Free plan; 12.99 €/month or 59.99 €/year | 1,300+ tasks, essay revise-then-score loop, flashcards, audio | None stated | Already has mobile apps. Operator not named on the page. |
| Studeo Englannin Preppaaja | Self-paced | 49 € for 5 years | Teacher-written material, videos, past yo tasks | None stated | Sold mainly through schools. |
| Tutorhouse | Live small groups online or Helsinki | Not published ("alk. 199 €"); 89 € essay-feedback package | Groups 14.1.–18.3.2027, reading-week groups 22.2.–10.3.2027, quick review 12.–14.3.2027 | Private tuition only | — |
| Kesäyliopistot | Live online | PPKYO 30 h (22.2.–4.3.2027, price not shown); HSKY 97 € (June 2027) | — | — | Strong local intent in autocomplete ("turun / helsingin … kesäyliopisto abikurssit"). |

Free and school channels: Yle Abitreenit (past exams incl. autumn 2026, Yo-koekone), YTL, Otava Abilities digibook 21.22 €/12 months, Sanoma Pro Yo-kertaus (price not verified), the student's own lukio ENA abikurssi.

Not found: Eximia (site refused connection), Kielikoulu (nothing specific).

Self-paced price ladder: Mafy 37.90 € → Opiskeluakatemia 44.99 € → Studeo 49 € → Solva 49.99 € → Lara 59.99 € → WordDive 99 € (guarantee) → Eezy 215 € (teacher-graded essays).

## 2. Search demand (Google autocomplete, fi/FI)

- "abikurssi": 2nd suggestion is "abikurssi englanti"; also "abikurssit kesä 2026" and cities (turku, helsinki, tampere).
- "englannin abikurssi": verkossa, worddive, paras englannin abikurssi, lara englannin abikurssi, worddive … kokemuksia, eezy englannin abikurssi, pitkän englannin abikurssi. Brands shown: WordDive, Lara, Eezy — not Opiskeluakatemia, Solva or Mafy.
- "paras abikurssi": English is the first subject suggested.
- "abikurssi verkossa": englannin / ruotsin abikurssi verkossa.
- Exam queries ("englannin yo-koe", "yo-koe englanti", "englannin ylioppilaskoe") mostly add a sitting (kevät 2026, syksy 2026, syksy 2026 lyhyt) plus pisterajat, kertaus, harjoittelu.
- "englannin yo kirjoitelma": pisteytys, mallivastaus, pituus, arvostelu, "pitääkö … otsikoida".
- "englannin kielioppi": harjoituksia, kertaus, aikamuodot, testi, futuuri, prepositiot.
- "lyhyt englanti": yo, pisterajat, hyvän vastauksen piirteet — short-syllabus demand not served today.
- Also: "englannin yo koe lukusuunnitelma", "miten valmistautua enkun yo", "abitreenit englanti", "onko worddive abikurssi hyvä", "englannin yo koe kevät 2027".

Exam dates (YTL, preliminary):
- Spring 2027: short English 18.3.2027, long English 22.3.2027. Registration closes 1.12.2026. Results 18–19.5.2027.
- Autumn 2027: long English 24.9.2027, short English 4.10.2027. Registration closes 5.6.

Seasonality (inferred): buying builds November–March, peaking in the February–March reading week; smaller wave August–September; pisterajat and "oikeat vastaukset" searches spike right after each exam.

## 3. Who ranks and what AI answers cite (proxy only)

- "paras englannin abikurssi 2027": HSKY, Valmennuskeskus, lara.fi/abikurssit, lara.fi/englannin-abikurssi, PPKYO, Tutorhouse, the Solva comparison, lara.fi/ukk.
- "kokemuksia": WordDive's own pages plus Suomi24 and vauva.fi threads.
- Tips and essay queries: Yle Abitreenit articles, many 4–14 years old.
- AI / app queries: Mafy, Lara, Lexie, Talkpal.
- AI-written answers cited Solva's comparison (prices), Lara (features) and forums (experiences). Opiskeluakatemia was not cited.

## 4. Gaps and recommendations

Gaps:
- Opiskeluakatemia is invisible: site not deployed; absent from autocomplete, comparisons, aggregators and AI answers.
- AI essay feedback is now standard (Mafy, Lara, Lexie). Real differentiators: "what to practise next" daily tasks + spaced-repetition vocabulary + mobile app. Lexie and WordDive are the only app rivals.
- No free trial or refund promise, while WordDive has a guarantee, Solva a free trial and Lexie a free plan.
- No short-syllabus course, no autumn-2027 or grade-raiser offer.
- Access ends on exam day; Lara and Solva run to 1.4.2027.
- Far less content than Lara (~9 articles vs ~50 on English).

Pricing: 44.99 € is already the second-lowest; trust and visibility are the levers, not price. Owner decisions: a no-card free trial; extending access to 1.4.2027; later, a paid human essay-review add-on only if a real teacher is available; a grade guarantee only with clear, lawful terms.

Content to write: spring 2027 dates and the 1.12 registration deadline; kirjoitelma FAQ (otsikko, pituus, pisteytys); pisterajat page and post-exam analysis per sitting; lukuloma study plan; grammar pages with mini-checks (aikamuodot, prepositiot, futuuri, passiivi, relatiivilauseet); short-syllabus guide; theme vocabulary pages linked to flashcards; an honest, disclosed "Englannin abikurssit 2027 vertailu"; autumn-2027 retake guide; "Abitreenit + abikurssi" how-to.

Partnerships and backlinks (no outreach done): free class or teacher access for lukio English teachers and guidance counsellors via SUKOL and SOOL; printable study plan for abi-info evenings; lukio student unions and SLL; listings on Studentum.fi and etaopiskelu.fi; ask Solva and Lara to include Opiskeluakatemia; a named teacher reviewer; real, permissioned reviews after results on 19.5.2027.

## Top 5 actions

1. Deploy the public SEO content now and fix crawling: homepage serves real content, sitemap returns 200, grammar test live; verify in Search Console and Bing, submit the sitemap, check Cloudflare bot/AI blocking lets Googlebot, Bingbot and AI crawlers through. Peak season is November–March; registration closes 1.12.2026.
2. Add a no-card free trial with one AI-graded essay, and publish clear terms (one-time payment, refund policy, access dates). Consider extending access to 1.4.2027.
3. Get into the places answers are built from: an honest, disclosed comparison page; Studentum and etaopiskelu.fi listings; ask Solva and Lara to include Opiskeluakatemia.
4. Build the exam-season content set before the February reading week: 2027 dates, kirjoitelma FAQ, pisterajat and post-exam analysis, reading-week plan, grammar mini-checks — each linking to the free check and the trial.
5. Launch the mobile app and lead with "daily tasks and vocabulary review on your phone" to stand out from browser-only Lara, Solva, Mafy and Eezy; use it in teacher and counsellor outreach.

## Sources (all accessed 28.10.2026)

- YTL: ylioppilastutkinto.fi/fi/tutkinnon-suorittaminen/koepaivat/kevaan-2027-koepaivat, …/syksyn-2027-koepaivat, …/ilmoittautuminen
- Lara: lara.fi, lara.fi/englannin-abikurssi, lara.fi/artikkelit, lara.fi/artikkelit/miten-valita-abikurssi
- Solva: solvalearn.com, solvalearn.com/artikkelit/englannin-abikurssit-vertailu
- WordDive: worddive.com/fi/kielikurssit/englannin-abikurssi/
- Eezy Valmennuskeskus: valmennuskeskus.fi/englannin-abikurssi/, valmennuskeskus.fi/kurssikategoria/abikurssit-englanti/
- Mafy: mafy.fi/tuote/yo-kertaus-a-englanti/, mafy.fi/ylioppilaskirjoitukset/valmennuskurssit-yo-kirjoituksiin/
- Lexie: lexielearn.com/fi/yo-kertaus/englanti-pitka
- Studeo: studeo.fi/preppaaja/
- Tutorhouse: tutorhouse.fi/abikurssit/englanti
- Kesäyliopistot: ppkyo.fi/fi/abikurssit/, hsky.fi/kurssit/abikurssit/kielikurssit-abi/englannin-abikurssi-ryhma-a-2-op/
- Otava: otava.kauppakv.fi/EN/page/product/abilities-lops21-digikirja-12-kk-onl/4778348
- Yle Abitreenit: yle.fi/aihe/abitreenit/englanti
- Aggregator: studentum.fi/koulutushaku/abikurssit
- Forums: keskustelu.suomi24.fi/t/17420771, vauva.fi/keskustelu/4518239
- Autocomplete: Google, via suggestqueries.google.com
