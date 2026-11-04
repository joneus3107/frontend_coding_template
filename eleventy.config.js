import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pugPlugin from '@11ty/eleventy-plugin-pug';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, '_site');
const imagesSrc = path.join(srcDir, 'images');
const imagesOut = path.join(outDir, 'images');

// Pages written by the last build: source file -> output file
let pageOutputs = new Map();
let srcWatcher = null;

// Passthrough copy only ever adds files to _site/images, it never removes them.
// This deletes anything in _site/images that no longer exists in src/images.
function removeDeletedImages(dir = imagesOut) {
	if (!fs.existsSync(dir)) {
		return;
	}

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const outPath = path.join(dir, entry.name);
		const srcPath = path.join(imagesSrc, path.relative(imagesOut, outPath));

		if (!fs.existsSync(srcPath)) {
			fs.rmSync(outPath, { recursive: true, force: true });
		} else if (entry.isDirectory()) {
			removeDeletedImages(outPath);
		}
	}
}

// Same problem for pages: deleting src/about.pug leaves _site/about.html behind.
// After a full build, delete every .html in _site (outside assets/ and images/) that wasn't just written,
// then the folders that are left empty (e.g. _site/news/).
function removeDeletedPages(results) {
	pageOutputs = new Map(
		results.filter((r) => r.outputPath).map((r) => [path.resolve(r.inputPath), path.resolve(r.outputPath)]),
	);

	const written = new Set(pageOutputs.values());
	const outFiles = fs
		.readdirSync(outDir, { recursive: true })
		.filter((file) => !/^(assets|images)([\\/]|$)/.test(file))
		.map((file) => path.join(outDir, file));

	for (const file of outFiles) {
		if (file.endsWith('.html') && !written.has(file)) {
			fs.rmSync(file, { force: true });
		}
	}

	// Deepest folders first, so a parent emptied by its children is removed too
	const dirs = outFiles.filter((file) => fs.existsSync(file) && fs.statSync(file).isDirectory());

	for (const dir of dirs.sort((a, b) => b.length - a.length)) {
		if (fs.readdirSync(dir).length === 0) {
			fs.rmdirSync(dir);
		}
	}
}

// Eleventy doesn't rebuild when a file is deleted, so while serving/watching, src/ is watched
// directly and the outputs of deleted images/pages are removed right away. Empty folders are
// left for the next build: Eleventy may be writing a new page into the same folder right now.
function onSrcDelete() {
	removeDeletedImages();

	for (const [input, output] of pageOutputs) {
		if (!fs.existsSync(input)) {
			fs.rmSync(output, { force: true });
			pageOutputs.delete(input);
		}
	}
}

export default function (eleventyConfig) {
	eleventyConfig.addWatchTarget('./_site/assets/.vite/manifest.json');

	// Eleventy only updates its list of pages when the watcher reports a file as "added" or "deleted".
	// The native macOS watcher sometimes reports a new file as "changed" instead (e.g. delete a.pug,
	// create b.pug in VS Code), and then Eleventy keeps building a.pug and ignores b.pug until restart.
	// Polling compares the folder contents every 200ms, so additions/deletions are never missed.
	eleventyConfig.setChokidarConfig({
		usePolling: true,
		interval: 200,
	});

	eleventyConfig.setServerOptions({
		headers: {
			'Cache-Control': 'no-store',
		},
	});
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
	// Only runs for `npm run build`: it takes about half of each rebuild, so `npm start` skips it.
	eleventyConfig.addTransform('prettify-html', async function (content) {
		if (process.env.ELEVENTY_RUN_MODE !== 'build') {
			return content;
		}

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

	// Copy images straight through to the output
	eleventyConfig.addPassthroughCopy({ 'src/images': 'images' });

	// Clean up the outputs of deleted images (before each build) and pages (after each full build)
	eleventyConfig.on('eleventy.before', ({ runMode }) => {
		removeDeletedImages();

		if (runMode !== 'build' && !srcWatcher) {
			srcWatcher = fs.watch(srcDir, { recursive: true }, (event, file) => {
				if (file && !fs.existsSync(path.join(srcDir, file))) {
					onSrcDelete();
				}
			});
		}
	});

	eleventyConfig.on('eleventy.after', ({ results, incremental }) => {
		if (!incremental) {
			removeDeletedPages(results);
		}
	});

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
				// Manifest not built yet (Eleventy run before `vite build`)
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
