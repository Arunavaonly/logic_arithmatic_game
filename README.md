# Puzzle Parthenon

A browser-based arithmetic + logic puzzle game with progressive levels, hints, score, and a guided “Archimedes” character.

## Run locally

- **Option 1 (simple)**: open `index.html` in your browser.
- **Option 2 (recommended)**: serve the folder with a local web server (avoids some browser file/asset restrictions).

Example (Python):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Project structure

- **`index.html`**: app screens (home/game/reward) and script/style includes
- **`css/`**: styles (including Archimedes animations in `css/archimedes.css`)
- **`js/`**: game logic and UI controllers
- **`images/`**: image assets

## Archimedes character (PNG + optional sprite animation)

The character is injected by `js/archimedes-svg.js` (name kept for compatibility).

### Static PNG (required)

- Put the main image here: `images/archimedes.png`
- The app injects it into:
  - `#archimedes-home-fig`
  - `#archimedes-game-fig`
  - `#archimedes-reward-fig`

### Sprite sheet (optional, more expressive animation)

If you add a sprite sheet, the app will automatically use it for animated states:

- **Preferred path**: `images/archimedes-sprite.png`
- **Fallback path**: `archimedes-sprite.png` (project root)

**Sprite format expected by default**

- **Frames**: 8
- **Layout**: 1 row (left → right)
- **Frame size**: 220×380 px
- **Total size**: 1760×380 px
- **Background**: transparent PNG

You can change the default frame count/size in `js/archimedes-svg.js` (`DEFAULT_SPRITE`).

## Notes

- This is a static frontend project (no build step required).
- If you reorganize assets, update paths in `js/archimedes-svg.js`.

