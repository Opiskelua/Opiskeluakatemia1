# Vipunen AMK YO collection progress
CSV: ~/Downloads/vipunen-amk-yo.csv (merge.py appends; args: korkeakoulu vuosi kausi kaikki ensi ei out)
Filters in viewer: Koul. alkamisvuosi=2026, alkamiskausi=Syksy, Valintatapajonon tyyppi=Todistusvalinta, Korkeakoulu=one AMK.
Method per AMK: clear Ensikertalaisena filter -> select AMK -> expand all bachelor rows (+, bottom-up) -> read YO ("Todistusvalinta (YO)" or "Certificate-based selection (Matriculation Examination)") alin -> set Ensikertalainen hakija -> read -> set Ei ensikertalainen hakija -> read -> merge.
Skip ylempi AMK / Master rows. Programme without YO row: kaikki blank.
Done 2026 syksy: Metropolia(47), Turku(44; Finnish programmes have no Ei-rows -> blank), Oamk(29), JAMK(23), Xamk(40), Savonia(18), LAB(28), Lapin AMK(29), Karelia(22), SeAMK(21), SAMK(19; Finnish queues are first-timer-only -> ei blank), VAMK(16)
Next 2026: Centria, Kamk, Novia, Arcada, Humak, Diak, then TAMK, Haaga-Helia, Laurea, HAMK. Then 2025, 2024.
QUEUED AFTER AMKs (peer session request, on user's behalf): universities, same report. Sektori=Yliopistokoulutus, todistusvalinta, I sykli (kandidaattivaihe), syksy; 2026->2025->2024; kaikki/ensi/ei. Output ~/Downloads/vipunen-yliopisto.csv (same columns). Check row: Aalto Automaatio ja robotiikka 2026 kaikki=134,3 (univ own stat ensikertalaisjono 137,7).
Expand + click x=82 works for both layouts (with/without scrollbar).
- Centria 2026 done (23)
- Kamk 2026 done (20). check.py validates kaikki=min(ensi,ei)
- Novia 2026 done (30)
- Arcada 2026 done (12)
- Humak 2026 done (16)
- Diak 2026 done (11); no ei rows at all (first-timer-only queues, filter table empty)
- TAMK 2026 done (32)
- Haaga-Helia 2026 done (20)
- Laurea 2026 done (22)
- HAMK 2026 done (33). 2026 COMPLETE. Next: 2025 starting Metropolia
--- 2026-10-30: scheduled night run; next: 2025 starting Metropolia
- Metropolia 2025 done (44)
- Turku 2025 done (41)
- Oamk 2025 done (29)
- JAMK 2025 done (23)
- Xamk 2025 done (35)
- Savonia 2025 done (19)
- LAB 2025 done (33)
- Lapin 2025 done (30)
- Karelia 2025 done (13)
- SeAMK 2025 done (22)
- SAMK 2025 done (19)
- VAMK 2025 done (14)
- Centria 2025 done (28)
- Kamk 2025 done (19)
! RECHECK ensi (stale-render risk; ensi read from screenshot right after filter switch):
!   JAMK 2025 rows Sos varhaiskasvatus..Tradenomi tietojenkäsittely (18-23)
!   SeAMK 2025 rows Digitaalinen liiketoiminta, Kirjasto, liiketalous päivä (19-21)
!   Karelia 2025 rows Sh mm, Sh päivä, Sosionomi, Tradenomi (9-11,13)
!   VAMK 2025 rows Sh päivä, Sosionomi, Terveydenhoitaja, Trade kv kauppa, Trade päivä (8-12)
- RECHECK done: JAMK, SeAMK, Karelia, VAMK ensi rows verified, all matched (no changes)
- Arcada 2025 done (12)
- Novia 2025 done (30)
- Humak 2025 done (13)
- Diak 2025 done (11; Ei option greyed -> ei blank)
- TAMK 2025 done (27)
- Haaga-Helia 2025 done (21)
- Laurea 2025 done (22)
- HAMK 2025 done (32) -- AMK 2025 COMPLETE
- 2024 started (year filter switched to 2024); working on Metropolia 2024
- Metropolia 2024 done (42)
- Turku 2024: kaikki read (40), ensi/ei pending
- Turku 2024 done (40; ei only for 6 English programmes)
- Oamk 2024: ei read (data/oamk2024_ei_raw.txt), ensi+kaikki pending
- NOTE Oamk 2024 Sh Oulu has two YO queues (YO ensikertalaiset / YO kaikki); used 'YO, kaikki' queue for all columns
- Oamk 2024 done (29)
- JAMK 2024 done (20)
- Xamk 2024: ei read (37), ensi+kaikki pending
- Xamk 2024 done (38)
- Savonia 2024 done (18)
- LAB 2024: ei read (32), ensi+kaikki pending
- LAB 2024 done (32)
- Lapin 2024: kaikki read (28), ensi/ei pending
- Lapin 2024 done (28)
- Karelia 2024 done (15)
- CHECKPOINT: 2024 done for Metropolia, Turku, Oamk, JAMK, Xamk, Savonia, LAB, Lapin, Karelia. Next: SeAMK 2024 (year filter=2024, Ensikertalaisena filter currently cleared)
- SeAMK 2024 done (20)
- SAMK 2024 done (16) (ei greyed -> blank)
- VAMK 2024 done (13)
- Centria 2024 done (26)
- Kamk 2024 done (21)
- Novia 2024 done (29)
- Arcada 2024 done (11)
- Humak 2024 done (9)
- Diak 2024 done (8) (ei greyed -> blank)
- TAMK 2024 done (25)
- Haaga-Helia 2024 done (20)
- Laurea 2024 done (24)
- HAMK 2024 done (28) -- AMK 2024 COMPLETE
- UNIV started: 2026, filters Yliopisto+I sykli+Todistusvalinta; programme-level Todistusvalinta row used (min over both queues). Aalto check 134,30 OK
- UNIV Aalto 2026 done (16)
- CHECKPOINT UNIV: filters = 2026, Syksy, Yliopistokoulutus, I sykli, Todistusvalinta; Ensikertaisena currently = Ei. Next: Helsingin yliopisto 2026. Read programme-level 'Todistusvalinta' row (no need to expand). Files data/u_<school><year>_*.txt
- UNIV Helsinki 2026: ei pass saved (41 rows, data/u_hy2026_ei_raw.txt); next kaikki + ensi
- UNIV Helsinki 2026: ensi pass saved (55 rows, u_hy2026_ensi_raw.txt); next kaikki (clear filter)
- UNIV Helsinki 2026 done (56)
- UNIV UEF 2026: kaikki saved (45); next ensi+ei
- UNIV UEF 2026 done (45)
- UNIV JYU 2026: kaikki saved (31); next ensi+ei
- UNIV JYU 2026: NOTE first pass was under Ei filter -> saved as u_jyu2026_ei_raw.txt (31); next ensi + kaikki
- CHECKPOINT 2026-10-31 11:04: Excel session timed out (needs Lataa uudelleen -> all filters reset). UNIV 2026 done: Aalto, Helsinki, UEF. JYU 2026 partial: ei saved (u_jyu2026_ei_raw.txt), ensi+kaikki still needed. Remaining UNIV 2026 after JYU: Lapin, LUT, Oulu, Hanken, Tampere, Turku, Vaasa, Åbo Akademi, Taideyliopisto(?); then 2025, 2024.
- UNIV JYU 2026 done (39)
- [2025-session] started UNIV 2025 in own tab; filters 2025,Syksy,Todistusvalinta,I sykli (Sektori not set, Korkeakoulu used). Aalto kaikki saved (16)
- [2025-session] UNIV Aalto 2025 done (16)
- [2025-session] UNIV HY 2025: kaikki (53) + ensi saved; next ei
- [2025-session] UNIV HY 2025 done (53)
- [2025-session] UNIV UEF 2025 done (41)
- [2025-session] UNIV JYU 2025: kaikki(35)+ensi saved; next ei
- [2025-session] UNIV JYU 2025 done (35)
- [2025-session] CHECKPOINT: Aalto, HY, UEF, JYU 2025 merged (145 rows). Lapin 2025: table appeared empty under all filters then viewer froze -> reloading
- [2025-session] reloaded viewer, filters re-set (2025,Syksy,Todistusvalinta,I sykli). Lapin kaikki saved (6)
- [2025-session] UNIV Lapin 2025 done (6)
- [2025-session] UNIV LUT 2025 done (19)
- [2025-session] UNIV Oulu 2025: kaikki saved (36); next ensi+ei
- [2025-session] UNIV Oulu 2025 done (36)
- [2025-session] UNIV Tampere 2025: kaikki saved (45); next ensi+ei
- [2025-session] UNIV Tampere 2025 done (45)
- [2025-session] UNIV Turku 2025: kaikki saved (45); next ensi+ei
- [2025-session] UNIV Turku 2025 done (45)
- [2025-session] UNIV Vaasa 2025 done (8)
- [2025-session] UNIV Åbo 2025: kaikki saved (25)
- [2025-session] UNIV Åbo 2025 done (25)
- [2025-session] UNIV 2025 COMPLETE: 329 rows in vipunen-yliopisto-2025.csv. Hanken not in Korkeakoulu slicer for 2025; Taideyliopisto greyed (no data)
[2024-session] started UNIV 2024 in own tab; CSV header written to vipunen-yliopisto-2024.csv
- UNIV Lappi 2026 done (7)
- UNIV LUT 2026 done (11)
[2024-session] kaikki pass (no Korkeakoulu filter, whole table) saved: aalto 22, hy 54, uef 38, jyu 34, lapin 8, lut 19, oulu 37, hanken 3
- UNIV Oulu 2026: kaikki saved (39); next ensi+ei
- UNIV Oulu 2026 done (39)
- UNIV Tampere 2026: ei saved (33). Hanken 2026 has no Ei rows (not in list under Ei filter) -> ei blank; Hanken kaikki+ensi still TODO
- UNIV Tampere 2026: ensi saved (45); next kaikki
[2024-session] ensi pass saved for all 12 (u24_*_ensi.txt); next: ei pass
- UNIV Tampere 2026 done (45)
- UNIV Hanken 2026 done (2) (Ei greyed -> blank)
- UNIV Turku 2026: ensi saved (46); next ei + kaikki
- [2024-session] UNIV 2024 COMPLETE: 338 rows in vipunen-yliopisto-2024.csv (Aalto 22, HY 54, UEF 38, JYU 34, Lapin 8, LUT 19, Oulu 37, Hanken 3, Tampere 44, Turku 44, Vaasa 8, Åbo 27). Read whole table with no Korkeakoulu filter (filters 2024, Syksy, Yliopistokoulutus, Todistusvalinta, I sykli); check.py OK for all. Blank ensi: HY Suomen kieli ja kulttuuri (vieraskielisille), Lapin LUC-väylä, Oulu Saamen kieli. Hanken has no ei rows. No other universities in the 2024 table.
- UNIV Turku 2026 done (46)
- UNIV Vaasa 2026 done (10)
- UNIV Åbo 2026: ei saved (21); next ensi+kaikki
- UNIV Åbo 2026 done (23) -- UNIV 2026 COMPLETE
- UNIV 2025+2024 merged into vipunen-yliopisto.csv. ALL DONE.
