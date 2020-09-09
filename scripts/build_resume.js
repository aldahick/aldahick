const fs = require("fs");

const VARIABLE_REGEX = /{{([A-z0-9]+)}}/g;

const main = ([resumeFilename, outputFilename]) => {
  if (!resumeFilename || !outputFilename) {
    throw new Error("Usage: yarn build:resume <resume-filename> <output-filename>");
  }
  try {
    fs.accessSync(resumeFilename);
  } catch (err) {
    throw new Error(`Input file ${resumeFilename} does not exist.`);
  }
  const raw = fs.readFileSync(resumeFilename, "utf8");

  const variables = [...new Set( // uniquify
    (raw.match(VARIABLE_REGEX) || [])
      .map(v => v.slice(2, -2))// {{foo}} to foo
  )];
  const missingVariables = variables.filter(v => !process.env[v]);
  if (missingVariables.length > 0) {
    throw new Error("Missing environment variable(s): " + missingVariables.join(", "));
  }
  const interpolated = variables.reduce((p, v) =>
    p.replace(new RegExp("{{" + v + "}}", "g"), process.env[v]),
    raw
  );
  console.log(`Successfully interpolated ${variables.length} environment variables.`);

  fs.writeFileSync(outputFilename, interpolated);
};

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(process.env.NODE_ENV === "debug" ? err : err.message);
  process.exit(1);
}
