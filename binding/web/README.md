# octopus-web

**NOTE**: This is a beta build.

The Picovoice Octopus library for web browsers, powered by WebAssembly.

This library transcribes audio samples in-browser, offline. All processing is done via WebAssembly and Workers in a separate thread.

Looking for Octopus on NodeJS? See the [@picovoice/octopus-node](https://www.npmjs.com/package/@picovoice/octopus-node) package.

## Compatibility

- Chrome / Edge
- Firefox
- Safari

This library requires several modern browser features: `WebAssembly`, `Web Workers`, `IndexedDB` and `Promise`. Internet Explorer will _not_ work.

## Installation & Usage

### Package

Install the [Octopus-Web package](https://www.npmjs.com/package/@picovoice/octopus-web) using `yarn`:

```console
yarn add @picovoice/octopus-web
```

or using `npm`:

```console
npm install --save @picovoice/octopus-web
```

### AccessKey

Octopus requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Octopus SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### Octopus Models

Octopus requires a model file on initialization. Create a custom model file from [Picovoice Console](https://console.picovoice.ai/cat)
or you can use the [default model file](/lib/common/octopus_params.pv).

For the web packages, there are two methods to initialize Octopus.

#### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches the model file from the public directory and feeds it to Octopus. Copy the model file into the public directory:

```console
cp ${LEOPARD_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

#### Base64

**NOTE**: This method works without hosting a server, but increases the size of the model file roughly by 33%.

This method uses a base64 string of the model file and feeds it to Octopus. Use the built-in script `pvbase64` to
base64 your model file:

```console
npx pvbase64 -i ${LEOPARD_MODEL_FILE} -o ${OUTPUT_DIRECTORY}/${MODEL_NAME}.js
```

The output will be a js file which you can import into any file of your project. For detailed information about `pvbase64`,
run:

```console
npx pvbase64 -h
```

### Usage

#### Init options

Octopus saves and caches your model file in IndexedDB to be used by WebAssembly. Use a different `modelPath` variable
to hold multiple models and set the `forceWrite` value to true to force re-save a model file. Set `enableAutomaticPunctuation`
to false, if you do not wish to enable capitalization and punctuation in transcription.
If the model file (`.pv`) changes, `version` should be incremented to force the cached model to be updated.

```typescript
// these are default
const options = {
  modelPath: "octopus_model",
  forceWrite: false,
  enableAutomaticPunctuation: true,
  version: 1
}
```

#### Initialize in Main Thread

Use `Octopus` to initialize from public directory:

```typescript
const handle = await Octopus.fromPublicDirectory(
  ${ACCESS_KEY},
  ${MODEL_FILE_RELATIVE_TO_PUBLIC_DIRECTORY},
  options // optional options
);
```

or initialize using a base64 string:

```typescript
import octopusParams from "${PATH_TO_BASE64_LEOPARD_PARAMS}";

const handle = await Octopus.fromBase64(
  ${ACCESS_KEY},
  octopusParams,
  options // optional options
)
```

#### Initialize in Worker Thread

Use `OctopusWorker` to initialize from public directory:

```typescript
const handle = await OctopusWorker.fromPublicDirectory(
  ${ACCESS_KEY},
  ${MODEL_FILE_RELATIVE_TO_PUBLIC_DIRECTORY},
  options // optional options
);
```

or initialize using a base64 string:

```typescript
import octopusParams from "${PATH_TO_BASE64_LEOPARD_PARAMS}";

const handle = await OctopusWorker.fromBase64(
  ${ACCESS_KEY},
  octopusParams,
  options // optional options
)
```

#### Process Audio Frames

The process result is an object with:
- `transcription`: A string containing the transcribed data.
- `words`: A list of objects containing a `word`, `startSec`, and `endSec`. Each object indicates
the start and end time of the word.

```typescript
function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

const result = await handle.process(getAudioData());
console.log(result.transcription);
console.log(result.words);
```

For processing using worker, you may consider transferring the buffer instead for performance:

```typescript
const pcm = new Int16Array();
const result = await handle.process(pcm, {
  transfer: true,
  transferCB: (data) => {pcm = data}
});
console.log(result.transcription);
console.log(result.words);
```

#### Clean Up

Clean up used resources by `Octopus` or `OctopusWorker`:

```typescript
await handle.release();
```

#### Terminate

Terminate `OctopusWorker` instance:

```typescript
await handle.terminate();
```

## Build from source (IIFE + ESM outputs)

This library uses Rollup and TypeScript along with Babel and other popular rollup plugins. There are two outputs: an IIFE version intended for script tags / CDN usage, and a JavaScript module version intended for use with modern JavaScript/TypeScript development (e.g. Angular, Create React App, Webpack).

```console
yarn
yarn build
```

The output will appear in the ./dist/ folder.
