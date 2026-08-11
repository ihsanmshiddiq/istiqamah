import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";
import honoDevPlugin from "./vite/__plugins/hono-dev-plugin";
import assetOptimizerPlugin from "./vite/__plugins/asset-optimizer-plugin";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, root, '');
	Object.assign(process.env, env);

	return {
		// All env files live at the repo root — keep Vite's own env loading there too,
		// so packages/web/.env* files can never shadow the root .env.
		envDir: root,
		plugins: [honoDevPlugin(), react(), tailwind(), assetOptimizerPlugin()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src/web"),
			},
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						// Split vendor libraries into separate chunks.
						// NOTE: lucide-react intentionally NOT split — keeping it in the main
						// bundle avoids a Rollup circular-chunk initialization-order bug
						// where lazy-loaded page chunks (e.g. finance) crash with
						// "Cannot access 'q' before initialization" at runtime.
						"react-vendor": ["react", "react-dom"],
						"motion-vendor": ["motion/react"],
					},
				},
			},
			chunkSizeWarningLimit: 300,
		},
		server: {
			allowedHosts: true,
			hmr: { overlay: false, },
			cors: false
		}
	};
});
