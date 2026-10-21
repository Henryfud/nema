// Inlines the data and the simulation code into site/template.html.
// Writes site/index.html (full page) and site/artifact.html (fragment for hosts that wrap the page themselves).
//   GITHUB_URL  repo link on the page   (default https://github.com/Henryfud/nema)
//   SITE_URL    where the page is hosted, used for link previews (optional: leave unset until a domain is chosen)
//   X_HANDLE    the X account without @, for the twitter:site tag (optional)
import fs from "node:fs";
const root = new URL("../", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8");
const strip = (src) => src.replace(/^import .*$/gm, "").replace(/^export (default )?/gm, "");
const gh = process.env.GITHUB_URL || "https://github.com/Henryfud/nema";
const site = (process.env.SITE_URL || "").replace(/\/$/, "");
const xHandle = process.env.X_HANDLE || "";

const json = (p) => JSON.stringify(JSON.parse(read(p)));
const logo = "data:image/png;base64," + fs.readFileSync(new URL("site/assets/logo.png", root)).toString("base64");
// the page only needs the summary of the null model experiment, not every row. null until it has been run.
const nullFile = new URL("docs/results/null-models.json", root);
const nullModels = fs.existsSync(nullFile) ? JSON.parse(fs.readFileSync(nullFile, "utf8")) : null;
const results = nullModels ? JSON.stringify({ generated: nullModels.generated, graphsPerKind: nullModels.graphsPerKind, summary: nullModels.summary }) : "null";

const code = ["src/network.mjs", "src/steer.mjs", "src/graphs.mjs"].map((p) => strip(read(p))).join("\n");
const data = [
  `const CONNECTOME = ${json("data/connectome.json")};`,
  `const GC_WINDOWS = ${json("data/gc_windows.json")};`,
  `const GENE_WINDOWS = ${json("data/gene_windows.json")};`,
  `const NULL_RESULTS = ${results};`,
].join("\n");

let html = read("site/template.html")
  .replace("/*__DATA__*/", () => data)
  .replace("/*__NETWORK__*/", () => code)
  .replaceAll("__GITHUB_URL__", gh)
  .replaceAll("__SITE_URL__", site)
  .replaceAll("__LOGO__", logo);

const left = html.match(/__[A-Z_]+__|\/\*__[A-Z]+__\*\//g);
if (left) { console.error("unreplaced placeholders:", [...new Set(left)].join(", ")); process.exit(1); }

fs.writeFileSync(new URL("site/artifact.html", root), html);
const title = "NEMA, a living wiring system";
const desc = "Life wired it. We switched it on. The complete wiring diagram of a nematode, every neuron and every connection, running in your browser and steering AI on your own machine.";
const head = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${desc}">
<meta name="theme-color" content="#120a05">
${site ? `<link rel="canonical" href="${site}/">\n` : ""}<link rel="icon" type="image/png" href="${logo}">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NEMA">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
${site ? `<meta property="og:url" content="${site}/">
<meta property="og:image" content="${site}/assets/logo.png">
<meta property="og:image:width" content="1024">
<meta property="og:image:height" content="1024">
<meta property="og:image:alt" content="The NEMA mark, a nematode crossing an agar plate, dithered in amber">
` : ""}<meta name="twitter:card" content="summary">
${xHandle ? `<meta name="twitter:site" content="@${xHandle}">\n` : ""}<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
${site ? `<meta name="twitter:image" content="${site}/assets/logo.png">\n` : ""}<style>html,body{margin:0}</style></head><body>
`;
const full = head + html + "\n</body></html>\n";
fs.writeFileSync(new URL("site/index.html", root), full);
console.log("built site/index.html", (full.length / 1024).toFixed(0) + " KB");
