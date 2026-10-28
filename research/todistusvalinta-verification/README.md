# Vipunen cutoff data verification

Verified on 2026-10-28. Data source update date: 2026-10-13.

## Verified retrieval

Official resource schema:
https://api.vipunen.fi/api/resources/korkeakoulutus_hakeneet_ja_paikan_vastaanottaneet

Data endpoint (public JSON, no credentials required in this test):
https://api.vipunen.fi/api/resources/korkeakoulutus_hakeneet_ja_paikan_vastaanottaneet/data?filter=koulutuksenAlkamisvuosi%3D%3D2026&limit=100000

Downloaded all rows returned for each education-start year: 2024 (26,290), 2025 (26,254), 2026 (26,217). Additional requests with limit=1 and offset equal to each year's returned count returned empty arrays, confirming the end of each result set.

Certificate selection records with non-null lowest accepted scores:

| Education start year | University hakukohde OIDs | AMK hakukohde OIDs |
| --- | ---: | ---: |
| 2024 | 493 | 804 |
| 2025 | 476 | 848 |
| 2026 | 493 | 893 |

Each year has scored certificate records from 12 universities and 22 AMKs. 2026 additionally has two scored records whose sector is marked unknown; those are excluded from this table.

## Limitations that matter for the calculator

- These are counts of distinct application-option OIDs in this dataset, not a verified count of all YO-admission programmes. Some certificate records relate to master's admissions or other selection contexts.
- The year and season are EDUCATION START year/season, not application year/season. For example, spring 2026 starts may follow autumn 2025 applications. Additional application-round mapping is required.
- The schema has no explicit first-time/non-first-time applicant distinction, detailed selection queue ID/name, or YO/vocational certificate distinction. The queue field says only Todistusvalinta. Do not label these aggregate records as a particular quota or certificate type without further verification.
- University certificate rows with missing scores number 244 (2024), 260 (2025), and 237 (2026). Missing values must not become zero. Many missing samples are master's programmes.
- Source update date does not itself prove every selection result is final.
- Hakukohde OIDs identify application options, not a guaranteed cross-year programme identity. Cross-year matches need auditing.
- Historical comparison needs the scoring rules applicable to each year's selection.
- The old Vipunen report and direct XLSB download returned HTTP 403 in direct HTTP tests; browser-search retrieval redirected to authentication. No detailed report export was verified.

## Local evidence

- `certificate-records.json`: all 4,761 records classified Todistusvalinta, preserving original fields and null values.
- `summary.json`: per-year/sector counts.
- `verify.py`: reproducible standard-library download/audit script. Uses the full raw responses in /tmp/todistusvalinta-verification if present; otherwise downloads them.

Conclusion: bulk historical cutoff retrieval is verified. Complete programme coverage with quota-specific, YO-only cutoffs is not verified and is not supplied explicitly by this endpoint.
