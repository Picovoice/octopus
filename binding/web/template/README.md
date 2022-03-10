# octopus-web

The Picovoice Octopus library for web browsers, powered by WebAssembly.

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation. All processing is done via WebAssembly and Workers in a separate thread.

## Compatibility

- Chrome / Edge
- Firefox
- Safari

This library requires several modern browser features: WebAssembly, Web Workers, and promises. Internet Explorer will _not_ work.

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret. 
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Packages

The Octopus SDK for Web is split into separate worker and factory packages; import each as required.

### Workers 

For typical cases, use the worker package. The worker package creates complete `OctopusWorker` instances that can be immediately used.

* [@picovoice/octopus-web-en-worker](https://www.npmjs.com/package/@picovoice/octopus-web-en-worker)

### Factories

Factory packages allow you to create instances of `Octopus` directly. Useful for building your own custom Worker/Worklet, or some other bespoke purpose.

* [@picovoice/octopus-web-en-factory](https://www.npmjs.com/package/@picovoice/octopus-web-en-factory)

## Installation & Usage

### Worker

To obtain an `OctopusWorker`, we can use the static `create` factory method from the OctopusWorkerFactory. Here is a complete example that:

1. Obtains an `OctopusWorker` from the `OctopusWorkerFactory`
2. Passes a standard audio stream to be indexed and stores the result in `octopusMetadata` object. The audio should be in the voice recognition standard format (16-bit 16kHz linear PCM, single-channel)
3. Searches a phrase and receives the occurrences time if there are any matches with their probabilities


E.g.:

```console
yarn add @picovoice/octopus-web-en-worker
```

```javascript
import { OctopusWebEnWorker } from "@picovoice/octopus-web-en-worker";

// The metadata object to save the result of indexing for later searches
let octopusMetadata = undefined;

function octopusIndexCallback(metadata) {
  octopusMetadata = metadata;
}

function octopusSearchCallback(matches) {
  console.log(`Search results (${matches.length}):`);
  console.log(
    `Start: ${match.startSec}s -> End: ${match.endSec}s (Probability: ${match.probability})`
  );
}

async function startOctopus() {
  // Create an Octopus Worker
  // Note: you receive a Worker object, _not_ an individual Octopus instance
  const accessKey = ... // .. AccessKey string provided by Picovoice Console (https://picovoice.ai/console/)
  const OctopusWorker = await OctopusWorkerFactory.create(
    accessKey,
    octopusIndexCallback,
    octopusSearchCallback
  );
}

startOctopus();

// Send Octopus the audio signal
const audioSignal = new Int16Array(/* Provide data with correct format*/);
OctopusWorker.postMessage({
  command: "index",
  input: audioSignal,
});

...

const searchText = ...;
OctopusWorker.postMessage({
  command: "search",
  metadata: octopusMetadata,
  searchPhrase: searchText,
});

...

// Finished with Octopus? Release the worker.
if (done) {
  OctopusWorker.sendMessage({ command: "release" });
}

```
**Important Note**: Because the workers are all-in-one packages that run an entire machine learning inference model in WebAssembly, they are approximately 9MB in size. While this is tiny for a speech recognition model, it's large for web delivery. Because of this, you likely will want to use dynamic `import()` instead of static `import {}` to reduce your app's starting bundle size. See e.g. https://webpack.js.org/guides/code-splitting/ for more information.

### Factory

If you wish to build your own worker, or perhaps not use workers at all, use the factory packages. This will let you instantiate Octopus engine instances directly.

E.g.:

```javascript
import { Octopus } from "@picovoice/octopus-web-en-factory";

async function startOctopus() {
  const accessKey = ""; // .. AccessKey string provided by Picovoice Console (https://picovoice.ai/console/)
  const handle = await Octopus.create(accessKey);
}

startOctopus();

...

// Send Octopus the audio signal
const audioSignal = new Int16Array(/* Provide data with correct format*/);
let octopusMetadata = await handle.index(audioSignal);

...

const searchText = "";
let octopusMatches = await handle.search(octopusMetadata, searchText);
console.log(`Search results (${octopusMatches.length}):`);
console.log(
  `Start: ${octopusMatches.startSec}s -> End: ${octopusMatches.endSec}s (Probability: ${octopusMatches.probability})`
);

```
**Important Note**: Because the workers are all-in-one packages that run an entire machine learning inference model in WebAssembly, they are approximately 9MB in size. While this is tiny for a speech recognition model, it's large for web delivery. Because of this, you likely will want to use dynamic `import()` instead of static `import {}` to reduce your app's starting bundle size. See e.g. https://webpack.js.org/guides/code-splitting/ for more information.

## Build from source (IIFE + ESM outputs)

This library uses Rollup and TypeScript along with Babel and other popular rollup plugins. There are two outputs: an IIFE version intended for script tags / CDN usage, and a JavaScript module version intended for use with modern JavaScript/TypeScript development (e.g. Angular, Create React App, Webpack).

```console
yarn
yarn build
```

The output will appear in the ./dist/ folder.

For example usage refer to the [web demo](/demo/web/)