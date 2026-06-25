# Spirit Forest Run — Bikram & the Betaal

A mobile auto-runner platformer in an 80s comic/halftone style. Bikram runs
through a haunted forest, tap to jump and double-tap to double-jump past snakes,
bats and spirits, grab energy spheres, and rescue Betaal at the end of each of 5
levels. No build step.

## Play
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
Tap = jump · double-tap = double jump · fill the energy meter for a Spirit Dash.

## Art
Drop PNGs named per `assets/manifest.json` into `assets/`. Until then the game
renders programmatic halftone placeholders.

## Test
```bash
node --test
```
