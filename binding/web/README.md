# Octopus Binding for Web

## Octopus Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This
acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation and eliminating the problem of competing
hypothesis (e.g. homophones)

## Compatibility

- Chrome / Edge
- Firefox
- Safari

## Installation

Using `yarn`:

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

### Usage

For the web packages, there are two methods to initialize Cheetah.

#### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches the model file from the public directory and feeds it to Octopus. Copy the model file into the public directory:

```console
cp ${OCTOPUS_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

#### Base64

**NOTE**: This method works without hosting a server, but increases the size of the model file roughly by 33%.

This method uses a base64 string of the model file and feeds it to Octopus. Use the built-in script `pvbase64` to
base64 your model file:

```console
npx pvbase64 -i ${OCTOPUS_MODEL_FILE} -o ${OUTPUT_DIRECTORY}/${MODEL_NAME}.js
```

The output will be a js file which you can import into any file of your project. For detailed information about `pvbase64`,
run:

```console
npx pvbase64 -h
```

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
import octopusParams from "${PATH_TO_BASE64_OCTOPUS_PARAMS}";

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
import octopusParams from "${PATH_TO_BASE64_OCTOPUS_PARAMS}";

const handle = await OctopusWorker.fromBase64(
  ${ACCESS_KEY},
  octopusParams,
  options // optional options
)
```

#### Index Audio Frames

The index result is an object holding the metadata information of your audio file. This is used later
to search for a phrase.

```typescript
function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

const octopusMetadata = await handle.index(getAudioData());
```

For processing using **worker**, you may consider transferring the buffer instead for performance:

```typescript
const pcm = new Int16Array();
const octopusMetadata = await handle.index(pcm, {
  transfer: true,
  transferCB: (data) => {pcm = data}
});
```

#### Search

Using the metadata from the previous step, you can search for a phrase. The result is a list of objects
with each element containing the following properties:

- `startSec`: Start of the matched audio in seconds.
- `endSec`: End of the matched audio in seconds.
- `probability`:  Probability (confidence) that this matches the search phrase (between 0 and 1).

```typescript
const result = await handle.search(octopusMetadata, "${SEARCH_PHRASE}");
for (const elem of result) {
  console.log(elem.startSec, elem.endSec, elem.probability);
}
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

## Demo

For example usage refer to our [Web demo application](https://github.com/Picovoice/octopus/tree/master/demo/web).
