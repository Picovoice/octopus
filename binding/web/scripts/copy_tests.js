import fs from "fs";
import ncp from "ncp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LANGUAGES = ["en"];

for (const language of LANGUAGES) {
  for (const flavour of ["factory"]) {
    console.log(`Test: ${flavour}`);

    const projectRootPath = join(__dirname, "..");
    const testFile = join(
      projectRootPath,
      "tests",
      `${flavour}`
    );

    const projectLocation = join(
      projectRootPath,
      `octopus-web-${language}-${flavour}`,
      "test"
    );

    // Create the output directory structure, if it doesn't exist
    fs.mkdirSync(projectLocation, { recursive: true });

    ncp(testFile, projectLocation, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}