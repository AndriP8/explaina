import { defineConfig } from "vitest/config";

export default defineConfig({
	define: {
		"process.env.API_URL": JSON.stringify("http://localhost:3001/api/explain"),
	},
	test: {
		environment: "node",
		include: ["src/__tests__/**/*.test.ts"],
	},
});
