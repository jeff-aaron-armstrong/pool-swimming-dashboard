# Pool Swimming Dashboard

Interactive dashboard for Jeff's pool-swimming data.

## Headline benchmark

The primary comparison is the **best rolling pause-free 500 m** in each swim:
the fastest 20 consecutive 25 m lengths that do not cross a timer pause.

## Local preview

Serve the repository root with any static web server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

This dashboard is designed to work as a static GitHub Pages site from the repository root.

## Data

`data/swims.json` contains:
- full length-by-length pace, stroke count, cadence and distance/stroke
- pause boundaries
- pause-separated segment summaries
- the best rolling pause-free 500 m for each swim

`analysis.py` contains the FIT parsing and benchmark logic used to regenerate the JSON.
