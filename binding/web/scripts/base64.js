import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LANGUAGES = ["en"];

const sourceDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "lib",
  "wasm"
);

console.log("Updating the WASM models...");
for (const language of LANGUAGES) {
  console.log(`Updating ${language}`);

  const outputDirectory = join(__dirname, "../language", language);

  const wasmFile = readFileSync(join(sourceDirectory, language, "pv_octopus.wasm"));
  const strBase64 = Buffer.from(wasmFile).toString("base64");
  const jsSourceFileOutput = `export const OCTOPUS_WASM_BASE64 = '${strBase64}'\n`;

  writeFileSync(
    join(outputDirectory, "octopus_b64.ts"),
    jsSourceFileOutput
  );
}

console.log("... Done!");
