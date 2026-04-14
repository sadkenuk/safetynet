# SafetyNet

A crime map for Lyndhurst and surrounding areas, built with data from the UK Police API.

## Features

- Interactive map showing crimes near any UK postcode
- Filter by crime category, outcome, and street
- Stop & search data overlay
- Neighbourhood police priorities
- Trend chart by month
- Dark/light map toggle
- Automatic HTTPS deployment via Traefik + Cloudflare

## Data sources

- [data.police.uk](https://data.police.uk) — crime, stop & search, neighbourhood data
- [postcodes.io](https://postcodes.io) — postcode lookup

## Running locally

```bash
docker compose up --build
```

Then open [http://localhost:8080](http://localhost:8080).

## Deployment

Pushes to `main` automatically deploy to [safetynet.sadken.co.uk](https://safetynet.sadken.co.uk) via GitHub Actions.

The workflow SSHes into the server, pulls the latest code, builds a Docker image, and restarts the container behind Traefik.

See `.github/workflows/deploy.yml` for details.
