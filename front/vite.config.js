import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	return {
		plugins: [react()],
		server: {
			fs: {
				allow: [
					searchForWorkspaceRoot(process.cwd()),
					"../../"
				]
			}
		},
		resolve: {
			alias: [
				{ find: '@shared', replacement: path.resolve(__dirname, '../back/shared') },
				{ find: '@scripts', replacement: path.resolve(__dirname, 'src/scripts') },
				{ find: '@components', replacement: path.resolve(__dirname, 'src/components') },
				{ find: '@assets', replacement: path.resolve(__dirname, 'src/assets') }
			]
		}
	};
});