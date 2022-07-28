const fs = require("fs");
const { join } = require("path");

const params = [
    "octopus_params.pv",
    "octopus_params_de.pv",
    "octopus_params_es.pv",
    "octopus_params_fr.pv",
    "octopus_params_it.pv",
    "octopus_params_ja.pv",
    "octopus_params_ko.pv",
    "octopus_params_pt.pv",
]

console.log("Copying octopus params...");

const sourceDirectory = join(
    __dirname,
    "..",
    "..",
    "..",
    "lib",
    "common",
    "light"
);

const outputDirectory = join(__dirname, "..", "test");

try {
    fs.mkdirSync(outputDirectory, { recursive: true });
    params.forEach(param => {
        fs.copyFileSync(join(sourceDirectory, param), join(outputDirectory, param))
    })
} catch (error) {
    console.error(error);
}

console.log("... Done!");
