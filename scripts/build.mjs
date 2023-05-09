import { promises as fs } from "fs";
import { dirname, resolve } from "path";

const GFM_API_URL = "https://api.github.com/markdown/raw";
const GFM_CSS_FILE = resolve(process.cwd(), "./node_modules/github-markdown-css/github-markdown.css");
const TEMPLATE_FILE = resolve(process.cwd(), './template.html');
const VARIABLE_REGEX = /{{([A-z0-9]+)}}/g;

/** @type {(raw: string, replacements?: object) => string} */
const interpolateVariables = (raw, replacements) => {
  const nameMatches = Array.from(raw.matchAll(VARIABLE_REGEX));
  const variableNames = Array.from(new Set(nameMatches.map(([, name]) => name)));
  const variableValues = { ...process.env, ...(replacements ?? {}) };
  const missingVariables = variableNames.filter(name => !(name in variableValues));
  if (missingVariables.length > 0) {
    throw new Error("Missing environment variable(s): " + missingVariables.join(", "));
  }
  return variableNames.reduce((output, name) =>
    output.replace(new RegExp("{{" + name + "}}", "g"), variableValues[name]),
    raw
  );
};

/** @type {(args: string[]) => Promise<void>} */
const main = async ([resumeFilename, outputFilename]) => {
  if (!resumeFilename || !outputFilename) {
    throw new Error("Usage: yarn build:resume <resume-filename> <output-filename>");
  }

  /** @type {string} */
  let raw;
  try {
    raw = await fs.readFile(resumeFilename, "utf8");
  } catch {
    throw new Error(`Input file ${resumeFilename} does not exist.`);
  }

  const interpolated = interpolateVariables(raw);
  console.log("Successfully interpolated environment variables.");


  const gfmRes = await fetch(GFM_API_URL, {
    method: "POST",
    body: interpolated,
    headers: { "content-type": "text/plain" }
  });
  const body = await gfmRes.text();

  const gfmStyle = '<style>' + (await fs.readFile(GFM_CSS_FILE, "utf8")) + '</style>';
  const templateHtml = await fs.readFile(TEMPLATE_FILE, "utf8");
  const html = interpolateVariables(templateHtml, { gfmStyle, body })
  await fs.mkdir(dirname(outputFilename), { recursive: true });
  await fs.writeFile(outputFilename, html);

  console.log("Successfully converted markdown to HTML.");
};

await main(process.argv.slice(2));
