import fs from "fs";
import ncp from "ncp";
import { dirname, join } from "path";
import editJsonFile from "edit-json-file";
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LANGUAGES = ["en"];

for (const language of LANGUAGES) {
  for (const flavour of ["factory", "worker"]) {
    console.log(`Language: ${language} Template: ${flavour}`);

    const projectRootPath = join(__dirname, "..");
    const templateDirectory = join(projectRootPath, "template");
    const buildTarget = `octopus-web-${language}-${flavour}`;
    const outputDirectory = join(projectRootPath, buildTarget);
    ncp(templateDirectory, outputDirectory, (err) => {
      if (err) {
        console.error(err);
      } else {
        // Copy language-specific library
        const languageDirectory = join(projectRootPath, "language", language);
        ncp(
          join(languageDirectory, "octopus_b64.ts"),
          join(outputDirectory, "src", "octopus_b64.ts"),
          (err) => {
            if (err) {
              console.error(error);
            } else {
              // index.ts: Rollup's entry point is different for workers/factories
              console.log(join(projectRootPath, flavour, "index.ts"));
              console.log(join(outputDirectory, "src"));
              ncp(
                join(projectRootPath, flavour, "index.ts"),
                join(outputDirectory, "src", "index.ts"),
                (err) => {
                  if (err) {
                    console.error(error);
                  } else {
                    console.log("index.ts copied");

                    // Customize the package.json to have the correct names and build targets
                    const packageJson = editJsonFile(
                      join(outputDirectory, "package.json")
                    );
                    packageJson.set("name", `@picovoice/${buildTarget}`);
                    packageJson.save((e) => {
                      console.log(`${buildTarget} Package JSON updated`);
                    });
                  }
                }
              );
            }
          }
        );
      }
    });
  }
}
