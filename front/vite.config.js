import { defineConfig, searchForWorkspaceRoot, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const basePath = env.VITE_BASE_PATH;

	const basicSettings = {
		plugins: [react()],
		server: {
			fs: {
				allow: [
					searchForWorkspaceRoot(process.cwd()),
					"../../"
				]
			},
			proxy: {
				'/auth': 'http://localhost:4000',
			},
		},
		resolve: {
			alias: [
				{ find: '@shared', replacement: path.resolve(__dirname, '../back/shared') },
				{ find: '@scripts', replacement: path.resolve(__dirname, 'src/scripts') },
				{ find: '@components', replacement: path.resolve(__dirname, 'src/components') },
				{ find: '@assets', replacement: path.resolve(__dirname, 'src/assets') }
			]
		},
		base: basePath
	};
	return basicSettings;
});