"""Reproduce the Vipunen cutoff audit using only the Python standard library."""
import collections
import json
import pathlib
import urllib.parse
import urllib.request

BASE = 'https://api.vipunen.fi/api/resources/korkeakoulutus_hakeneet_ja_paikan_vastaanottaneet/data'
OUT = pathlib.Path(__file__).resolve().parent
summary = []
records = []
for year in (2024, 2025, 2026):
    cached = pathlib.Path(f'/tmp/todistusvalinta-verification/{year}.json')
    if cached.exists():
        rows = json.loads(cached.read_text())
    else:
        url = BASE + '?' + urllib.parse.urlencode({'filter': f'koulutuksenAlkamisvuosi=={year}', 'limit': 100000})
        with urllib.request.urlopen(url, timeout=120) as response:
            rows = json.load(response)
    assert len(rows) < 100000, 'Potential truncation: pagination required'
    assert all(row['koulutuksenAlkamisvuosi'] == year for row in rows)
    certificate = [row for row in rows if row['valintatapajononTyyppi'] == 'Todistusvalinta']
    records.extend(certificate)
    sectors = {}
    for sector in sorted({row['sektori'] for row in certificate}):
        group = [row for row in certificate if row['sektori'] == sector]
        scored = [row for row in group if row['alinHyvaksyttyPistemaara'] is not None]
        sectors[sector] = {'records': len(group), 'with_cutoff': len(scored), 'distinct_hakukohde_oids_with_cutoff': len({row['kooditHakukohde'] for row in scored}), 'institutions_with_cutoff': len({row['korkeakoulu'] for row in scored})}
    summary.append({'education_start_year': year, 'all_records': len(rows), 'certificate_records': len(certificate), 'sectors': sectors, 'source_updated_dates': sorted({row['tietojoukkoPaivitettyPvm'] for row in rows})})
(OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
(OUT / 'certificate-records.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=2))
