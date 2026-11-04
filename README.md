# Frontend Template — Pug

Static-site starter: **Eleventy** builds the pages (Pug layouts/partials), **Vite** bundles the
Sass (indented `.sass` syntax) and JS.

Pages use Pug's native `extends` / `block` inheritance for the shared layout (instead of
Eleventy's front-matter `layout:` key).

## Install

```bash
npm install
```

## Commands

| Command          | What it does                                          |
| ---------------- | ----------------------------------------------------- |
| `npm start`      | Dev server with live reload (same as `npm run dev`)   |
| `npm run build`  | Production build into `_site/`, with re-indented HTML |
| `npm run format` | Runs Prettier on the project's JS/JSON/Markdown files |

## Develop

```bash
npm start      # or: npm run dev (same thing)
```

This builds the assets once (so the Vite manifest exists), then runs Vite (watches `src/js`
and `src/sass`) and Eleventy (serves `src/**/*.pug` with live reload) side by side. Stopping one
(or Ctrl+C) stops both.

Open the URL Eleventy prints (usually http://localhost:8080).

> Always stop the server with Ctrl+C before closing the terminal. If a server keeps running in
> the background, two servers end up writing to `_site/` at the same time and pages go missing.
> Check with `ps aux | grep -E "eleventy|vite" | grep -v grep`.

## Build for production

```bash
npm run build
```

This runs `vite build` first (so the asset manifest exists), then `eleventy`. Output goes to
`_site/`.

## Structure

```
src/
  _data/                  ← global data files (available in every template)
  _includes/
    layouts/base.pug      ← shared HTML shell (uses `block content`)
    mixins/               ← Pug mixins
    partials/header.pug
    partials/footer.pug
  images/                 ← images, copied as-is to _site/images/
  public/                 ← static files Vite copies as-is to _site/assets/ (e.g. vendor/)
  sass/
    main.sass             ← entry point, @use's the rest
    _variables.sass
    _mixins.sass
    _reset.sass
    _base.sass
    _components.sass
    partials/             ← one file per partial (header, footer, offcanvas)
    pages/                ← one file per page
  js/
    main.js               ← entry point
    modules/
  index.pug               ← page (uses Pug's own `extends`)
eleventy.config.js
vite.config.js
```

Output:

```
_site/
  index.html, contact.html, …   ← pages (Eleventy)
  images/                       ← copied from src/images/
  assets/css/style.css          ← Vite (from src/sass/main.sass)
  assets/js/main.js             ← Vite (from src/js/main.js)
  assets/…                      ← copied from src/public/
```

## Adding a new page

Create `src/contact.pug`:

```pug
---
title: My Site — Contact
---
extends /layouts/base.pug

block content
	section.container
		h1 Contact
```

It's built to `_site/contact.html` (served as `/contact.html`). Pages build as flat files
instead of Eleventy's default `contact/index.html`. A page in a subfolder keeps its folder:
`src/about/team.pug` → `_site/about/team.html`.

## Deleting or renaming pages and images

Eleventy on its own never removes anything from `_site/`, so a deleted page or image would stay
there (and get deployed). `eleventy.config.js` cleans this up:

- Deleting or renaming a `.pug` page removes its old `.html` from `_site/`, and folders left
  empty are removed after the next build.
- Deleting an image (or a folder of images) in `src/images/` removes its copy from `_site/images/`.
- `npm run build` also removes any leftover pages/images from earlier builds.

The dev server watches files by polling (checking the folders every 200ms) instead of relying
on macOS file events, which sometimes report a new file as "changed" and leave Eleventy building
a deleted page. Polling uses a little CPU while idle; with thousands of files you can raise
`interval` in `setChokidarConfig` in `eleventy.config.js`.

## Readable HTML output

Pug's Eleventy plugin renders everything to a single minified line — its own `pretty` option
exists but isn't actually wired through by the plugin, so it has no effect. Instead,
`eleventy.config.js` adds a transform that re-indents every generated `.html` file with Prettier
(tab indentation) — handy when a page has to be hand-converted into PHP or another templating
language.

This only runs for **`npm run build`**. It takes about half of each rebuild, so `npm start`
skips it and the dev server outputs single-line HTML (the page looks the same in the browser,
and DevTools indents it for you).

## Formatting your source files

```bash
npm run format
```

Runs Prettier (`.prettierrc.json`: tabs, single quotes, 100-column lines) across the project.
VS Code also formats on save (`.vscode/settings.json`, needs the Prettier extension).

- Formatted: `.js`, `.mjs`, `.json`, `.md`.
- **Not** formatted: `.pug` and `.sass` — Prettier doesn't support Pug or the indented Sass
  syntax. For Pug, you can add `@prettier/plugin-pug` and list it under `"plugins"` in
  `.prettierrc.json`.
- Ignored (`.prettierignore`): `node_modules`, `_site`, `package-lock.json`, `src/public`.

## CSS vendor prefixes

There's no PostCSS/Autoprefixer: Vite minifies CSS with Lightning CSS, which adds the needed
vendor prefixes (`-webkit-user-select`, `-webkit-backdrop-filter`, …) while minifying. Keep
Vite's default `build.cssMinify` — setting it to `false` or `'esbuild'` turns the prefixes off.

## Why `extends /layouts/base.pug` (with a leading slash)?

`eleventy.config.js` sets Pug's `basedir` option to `src/_includes`. That makes any path
starting with `/` resolve from `src/_includes`, regardless of how deeply nested the page itself
is — so both a top-level page and one buried in a subfolder can write the exact same
`extends /layouts/base.pug` line. Partial `include`s inside the layout use the same convention.

## How the CSS/JS link tags work

`src/_includes/layouts/base.pug` calls `asset('css/style.css')` and `asset('js/main.js')`. That
helper (defined in `eleventy.config.js`) looks the file up in Vite's `manifest.json` and returns
its URL under `/assets/`, e.g. `/assets/css/style.css`. Vite currently outputs plain filenames
(no content hash), so the URL stays the same between builds.
