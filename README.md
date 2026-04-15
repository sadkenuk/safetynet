# SafetyNet

An interactive crime map to help support local communities — built with publicly available UK police data. Created by a resident of Lyndhurst, New Forest, after the village was impacted by a wave of unsolved burglaries. Read more in [The Guardian](https://www.theguardian.com/uk-news/2023/sep/02/we-dont-need-police-the-new-forest-village-taking-the-law-into-its-own-hands).

🌐 **Live at [safetynet.sadken.co.uk](https://safetynet.sadken.co.uk)**

---

## Features

- Interactive map showing crimes near any UK postcode
- Crime dots coloured by severity (blue → red) based on the Home Office Crime Severity Score
- Grouped location markers showing count of incidents per point
- Filter by crime category, outcome, and street
- Stop & search data overlay
- Neighbourhood policing priorities
- Monthly trend chart
- Share button — generates a URL with postcode and date range pre-filled
- Dark/light map toggle
- Fully responsive — works on mobile as a bottom-sheet layout
- Automatic HTTPS deployment via Traefik + Cloudflare

## Data sources

- [data.police.uk](https://data.police.uk) — crime, stop & search, neighbourhood data
- [postcodes.io](https://postcodes.io) — postcode lookup
- [ONS Crime Severity Score](https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/articles/thecrimeseverityscoreexperimentalstatistics/2016-11-29) — severity classification methodology

## Running locally

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment

Pushes to `main` automatically deploy to [safetynet.sadken.co.uk](https://safetynet.sadken.co.uk) via GitHub Actions.

The workflow SSHes into the Hetzner server, pulls the latest code, builds a Docker image, restarts the container behind Traefik, and purges the Cloudflare cache.

See `.github/workflows/deploy.yml` and `homeserver/deploy.sh` for details.

## Tech stack

- Vanilla JS ES modules — no build step
- [Leaflet](https://leafletjs.com) for mapping (CartoDB dark/light tiles)
- nginx reverse proxy routing `/api/` → `data.police.uk` (fixes CORS)
- Docker + Docker Compose
- [Traefik](https://traefik.io) reverse proxy with automatic Let's Encrypt SSL via Cloudflare DNS challenge
- GitHub Actions for CI/CD

## Legal

SafetyNet is an independent community project and is not affiliated with, endorsed by or connected to any police force, the Home Office or any government body. All data is published under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/).
