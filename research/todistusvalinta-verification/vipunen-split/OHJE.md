# Vipunen pisterajat – night run brief

## Goal
Collect admission score limits (pisterajat) from ONE source only, the Vipunen report:
https://vipunen.fi/fi-fi/_layouts/15/xlviewer.aspx?id=/fi-fi/Raportit/Haku-%20ja%20valintatiedot%20-%20korkeakoulu%20-%20pisterajat.xlsb

Order of work:
1. AMK autumn 2025, all 22 AMKs → append to ~/Downloads/vipunen-amk-yo.csv
2. AMK autumn 2024, all 22 AMKs → same file
3. If time is left: universities 2026 → 2025 → 2024 → ~/Downloads/vipunen-yliopisto.csv

Autumn 2026 AMK is already done (555 rows). Do not touch those rows.

## Hard rules (from the user)
- Never sign in with any account. If the page requires sign-in, stop and report.
- Do not bypass blocks or login protections. Do not download the xlsb via download.aspx / curl
  (this was blocked earlier as circumvention – do not retry). Read values from the viewer only.
- Never use third-party sites (e.g. todistusvalinta.fi).
- Never estimate or fill in numbers. Missing value = empty cell.

## Resume / progress
- Progress log: ~/Downloads/vipunen-tyo/PROGRESS.md. Read it first; append one line after each
  school+year is merged, e.g. "Metropolia 2025 done (45)".
- Before merging a school+year, check the CSV doesn't already contain rows for that
  korkeakoulu+vuosi (grep). If it does, skip it – a previous run did it.
- Put per-school value files in ~/Downloads/vipunen-tyo/data/ (e.g. metropolia2025_kaikki.txt).
- If you have to stop, write in PROGRESS.md which school and year you reached.

## CSV format
Separator `;`, decimal comma, UTF-8. Header:
`korkeakoulu;hakukohde;vuosi;kausi;kaikki;ensikertalaiset;ei_ensikertalaiset`
kausi = `syksy`. kaikki = lowest accepted score in the YO certificate queue for all applicants;
ensikertalaiset = with filter "Ensikertalainen hakija"; ei_ensikertalaiset = with filter
"Ei ensikertalainen hakija" (lowest accepted non-first-timer, as-is). Values with two decimals
("75,00"). hakukohde = programme name exactly as the report shows it.

## AMK scope and order
Sektori: Ammattikorkeakoulukoulutus, yhteishaku, varsinainen haku, Valintatapajonon tyyppi =
Todistusvalinta, YO queue only. Skip master's / ylempi AMK rows.
Order and the exact korkeakoulu names to write in the CSV:
1. Metropolia Ammattikorkeakoulu
2. Turun ammattikorkeakoulu
3. Oulun ammattikorkeakoulu
4. Jyväskylän ammattikorkeakoulu
5. Kaakkois-Suomen ammattikorkeakoulu
6. Savonia-ammattikorkeakoulu
7. LAB-ammattikorkeakoulu
8. Lapin ammattikorkeakoulu
9. Karelia-ammattikorkeakoulu
10. Seinäjoen ammattikorkeakoulu
11. Satakunnan ammattikorkeakoulu
12. Vaasan ammattikorkeakoulu
13. Centria-ammattikorkeakoulu
14. Kajaanin ammattikorkeakoulu
15. Yrkeshögskolan Novia
16. Yrkeshögskolan Arcada
17. Humanistinen ammattikorkeakoulu
18. Diakonia-ammattikorkeakoulu
19. Tampereen ammattikorkeakoulu
20. Haaga-Helia ammattikorkeakoulu
21. Laurea-ammattikorkeakoulu
22. Hämeen ammattikorkeakoulu

## University scope (only after AMK 2025+2024 are complete)
Sektori = Yliopistokoulutus, yhteishaku, varsinainen haku, todistusvalinta, only programmes that
start at the bachelor stage (I sykli), autumn start; years 2026 → 2025 → 2024. Same three values
and same columns → ~/Downloads/vipunen-yliopisto.csv (write the header first if the file doesn't
exist). Sanity check row: Aalto, Automaatio ja robotiikka 2026, kaikki = 134,3.

## How to operate the report (learned in the 2026 pass)
- Use the built-in browser (mcp__Claude_Browser__* tools). The report is Excel Online in a
  cross-origin iframe: values can only be read from screenshots / zooms.
- Filters to set: Koul. alkamisvuosi = the year, Koul. alkamiskausi = Syksy,
  Valintatapajonon tyyppi = Todistusvalinta, Korkeakoulu = one school at a time.
  The Ensikertalaisena filter is cycled: none (kaikki) → Ensikertalainen hakija → Ei ensikertalainen hakija.
- Approximate coordinates (verify with a screenshot first; layout may differ):
  open filter panel (15,102); clear Ensikertalaisena funnel (204,262), collapse it (110,262);
  expand Korkeakoulu (100,209); Ensikertalaisena section (110,476); its options around
  (130,290)/(130,317); collapse panel (204,65).
- The school list inside the panel scrolls only while the mouse hovers over it (hover ~(120,380), then scroll).
  After clicking a school, zoom to verify it's the selected one.
- Option order in Ensikertalaisena can change between schools – always zoom region (30,240,230,360)
  to verify which option is highlighted. A greyed-out option = no rows for that school (leave blank).
- Scroll max 10 ticks per action. Expand ⊞ row icons bottom-up at x≈80–82, waiting 3–4 s each.
  If "Käsitellään…" shows, wait and re-screenshot; clicks during it are lost.
- YO rows are labelled "Todistusvalinta (YO)" or, for English programmes,
  "Certificate-based selection (Matriculation Examination)". Ignore AMM rows.
- A programme with no YO row under a filter → blank value.

## Helper scripts (in ~/Downloads/vipunen-tyo/)
Value files are lines `hakukohde|value`.
- mkvals.py kaikki.txt out.txt "v1 v2 - v4 …" – writes ensi/ei files in kaikki order ('-' = blank).
- check.py kaikki.txt ensi.txt ei.txt – kaikki must equal min(ensi, ei); prints MISMATCH lines.
  Re-check the screenshots for any mismatch before merging.
- merge.py "<korkeakoulu>" <year> syksy kaikki.txt ensi.txt ei.txt <csv> – appends rows.
Run with `python3 -I`.

## Final report
At the end report: CSV paths, row counts per year (and per school if useful), where it stopped
if unfinished, and notes about blank cells.
