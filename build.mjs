import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");
const apiUrl = process.env.API_URL;

if (!apiUrl) {
	console.error(
		"\x1b[31mError: API_URL environment variable is required.\x1b[0m",
	);
	process.exit(1);
}

const entryPoints = fs
	.readdirSync("src")
	.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
	.map((file) => path.join("src", file));

const buildOptions = {
	entryPoints,
	bundle: true,
	outdir: "dist",
	target: "es2020",
	define: {
		"process.env.API_URL": JSON.stringify(apiUrl),
	},
};

if (isWatch) {
	const ctx = await esbuild.context(buildOptions);
	await ctx.watch();
	console.log("Watching for changes...");
} else {
	await esbuild.build(buildOptions);
	console.log("Build complete.");
}
