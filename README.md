# Frontend Template — Pug

A modern replacement for a Gulp + templating + SCSS workflow: **Eleventy** (pages/partials/layouts) +
**Vite** (SCSS/JS bundling, minification, hashed filenames) + **sharp** (JPG/PNG → WebP).

This version uses **Pug** instead of EJS, with Pug's native `extends` / `block` inheritance
for the shared page layout (instead of Eleventy's front-matter `layout:` key).

## Install

```bash
npm install
```

## Develop

Run these in two terminals (or use `npm run dev`, which runs both in parallel):

```bash
npm run dev:assets   # Vite watches src/js and src/scss, rebuilds on change
npm run dev:html     # Eleventy serves src/*.pug with live reload
```

Open the URL Eleventy prints (usually http://localhost:8080).

> Note: on the very first run, start `dev:assets` a moment before `dev:html`
> so the Vite manifest exists before Eleventy tries to read it. After that,
> both watchers pick up changes fine in either order.

## Build for production

```bash
npm run build
```

This runs `vite build` first (so the asset manifest exists), then `eleventy`
(so pages can look up the correct hashed filenames). Output goes to `_site/`.

## Convert images to WebP

Drop JPG/PNG files into `src/images/`, then:

```bash
npm run images
```

This generates a `.webp` sibling next to each file (e.g. `hero.jpg` → `hero.webp`).
Reference both in your markup with a `<picture>` fallback:

```pug
picture
  source(srcset="/images/hero.webp" type="image/webp")
  img(src="/images/hero.jpg" alt="...")
```

## Structure

```
src/
  _includes/
    layouts/base.pug      ← shared HTML shell (uses `block content`)
    partials/header.pug
    partials/footer.pug
  images/                 ← source + generated .webp images (passthrough copied)
  scss/
    main.scss             ← entry point, @use's the rest
    _variables.scss
    _base.scss
  js/
    main.js                ← entry point
  index.pug                ← page (uses Pug's own `extends`)
  about.pug
eleventy.config.js
vite.config.js
postcss.config.js
scripts/convert-images.mjs
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

It'll be built to `_site/contact/index.html`.

## Readable HTML output

Pug's Eleventy plugin renders everything to a single minified line by default — its own
`pretty` option exists but isn't actually wired through by the plugin, so it has no effect.
Instead, `eleventy.config.js` adds a transform that re-indents every generated `.html` file
with Prettier (using `.prettierrc.json`, 2-space indent) right after Eleventy builds it. This
keeps output readable, which matters if you ever need to hand-convert a page into PHP or
another templating language.

## Formatting your source files

```bash
npm run format
```

Runs Prettier (`.prettierrc.json`, 2-space indent) across the project. Note: Prettier doesn't
format `.pug` files out of the box — it covers your `.js`, `.scss`, `.json`, and `.md` files.
If you want `.pug` files auto-formatted too, add `@prettier/plugin-pug` as a dependency and
list it under `"plugins"` in `.prettierrc.json`.

## Why `extends /layouts/base.pug` (with a leading slash)?

`eleventy.config.js` sets Pug's `basedir` option to `src/_includes`. That makes any path
starting with `/` resolve from `src/_includes`, regardless of how deeply nested the page
itself is — so both a top-level page and one buried in a subfolder can write the exact same
`extends /layouts/base.pug` line. Partial `include`s inside the layout use the same convention.

## How the CSS/JS link tags work

`src/_includes/layouts/base.pug` calls `asset('scss/main.scss')` and `asset('js/main.js')`.
That helper (defined in `eleventy.config.js`) reads Vite's `manifest.json` and swaps in the
real hashed filename, e.g. `/assets/assets/style-Gwew8YzD.css`. This means you never have to
manually update `link`/`script` tags when Vite's output hash changes.
