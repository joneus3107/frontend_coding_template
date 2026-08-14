import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pugPlugin from '@11ty/eleventy-plugin-pug';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (eleventyConfig) {
	// Pug was moved out of Eleventy core in v3, so it's added back as a plugin.
	// `basedir` lets pages use absolute-style paths like `extends /layouts/base.pug`
	// that resolve from src/_includes, regardless of how deep the page itself is nested.
	eleventyConfig.addPlugin(pugPlugin, {
		basedir: path.join(__dirname, 'src/_includes'),
	});

	// Pug's plugin renders everything to a single minified line. Re-indent the
	// final HTML with Prettier (using .prettierrc.json) so output stays
	// readable — handy when you need to copy/convert markup into PHP or
	// another templating language.
	eleventyConfig.addTransform('prettify-html', async function (content) {
		if (!this.page.outputPath || !this.page.outputPath.endsWith('.html')) {
			return content;
		}

		const prettier = await import('prettier');

		return prettier.format(content, {
			parser: 'html',
			tabWidth: 2,
			useTabs: true,
		});
	});

	// Copy raw images (and generated .webp files) straight through to the output
	eleventyConfig.addPassthroughCopy({ 'src/images': 'images' });

	// By default Eleventy builds "pretty" URLs: about.pug -> about/index.html (served as /about/).
	// This overrides that globally so pages build as flat files instead: about.pug -> about.html.
	eleventyConfig.addGlobalData('permalink', () => {
		return (data) => `${data.page.filePathStem}.html`;
	});

	// asset('js/main.js')
	// Resolves the hashed filename Vite produced, using its manifest.json.
	// Exposed via global data (returning a function) so it's callable from Pug.
	eleventyConfig.addGlobalData('asset', () => {
		return function (name) {
			const manifestPath = path.join(__dirname, '_site/assets/.vite/manifest.json');

			if (!fs.existsSync(manifestPath)) {
				// Manifest not built yet (first run of `dev:html` before `dev:assets` finishes)
				return `/assets/${name}`;
			}

			const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
			const key = Object.keys(manifest).find((k) => k.endsWith(name));

			return key ? `/assets/${manifest[key].file}` : `/assets/${name}`;
		};
	});

	return {
		dir: {
			input: 'src',
			output: '_site',
			includes: '_includes',
		},
		templateFormats: ['pug', 'html', 'md'],
		htmlTemplateEngine: 'pug',
		markdownTemplateEngine: 'pug',
	};
}
