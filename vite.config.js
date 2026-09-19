import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

export default defineConfig({
	root: 'src',
	base: '/assets/',
	build: {
		outDir: '../_site/assets',
		assetsDir: '',
		emptyOutDir: !isWatch,
		manifest: true,
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'src/js/main.js'),
				style: path.resolve(__dirname, 'src/sass/main.sass'),
			},
			output: {
				entryFileNames: 'js/[name].js',
				assetFileNames: (assetInfo) => {
					return assetInfo.name?.endsWith('.css')
						? 'css/[name][extname]'
						: 'assets/[name][extname]';
				},
			},
		},
	},
});
