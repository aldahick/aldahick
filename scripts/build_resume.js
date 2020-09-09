const { default: axios } = require("axios");
const { promises: fs } = require("fs");
const { resolve } = require("path");

const VARIABLE_REGEX = /{{([A-z0-9]+)}}/g;

const interpolateVariables = raw => {
  const variables = [...new Set( // uniquify
    (raw.match(VARIABLE_REGEX) || [])
      .map(v => v.slice(2, -2))// {{foo}} to foo
  )];
  const missingVariables = variables.filter(v => !process.env[v]);
  if (missingVariables.length > 0) {
    throw new Error("Missing environment variable(s): " + missingVariables.join(", "));
  }
  return variables.reduce((p, v) =>
    p.replace(new RegExp("{{" + v + "}}", "g"), process.env[v]),
    raw
  );
};

const main = async ([resumeFilename, outputFilename]) => {
  if (!resumeFilename || !outputFilename) {
    throw new Error("Usage: yarn build:resume <resume-filename> <output-filename>");
  }
  try {
    await fs.access(resumeFilename);
  } catch (err) {
    throw new Error(`Input file ${resumeFilename} does not exist.`);
  }
  const raw = await fs.readFile(resumeFilename, "utf8");

  const interpolated = interpolateVariables(raw);
  console.log("Successfully interpolated environment variables.");

  const styles = await fs.readFile(__dirname + "/../node_modules/github-markdown-css/github-markdown.css", "utf8");

  const { data: html } = await axios.post("https://api.github.com/markdown/raw", interpolated, {
    headers: {
      "content-type": "text/plain"
    }
  });
  await fs.writeFile(outputFilename, `<style>${styles}</style>\n<div class="markdown-body">${html}</div>`);
  console.log("Successfully converted markdown to HTML.");
};

main(process.argv.slice(2)).catch(err => {
  console.error(process.env.NODE_ENV === "debug" ? err : err.message);
  process.exit(1);
});
