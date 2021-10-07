# Octopus

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This
acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation and eliminating the problem of competing
hypothesis (e.g. homophones)

## Table of Contents

- [Octopus](#octopus)
  - [Table of Contents](#table-of-contents)
  - [Demos](#demos)
    - [Python Demos](#python-demos)
    - [C Demos](#c-demos)
    - [Android Demos](#android-demos)
    - [iOS Demos](#ios-demos)
    - [Web Demos](#web-demos)
  - [SDKs](#sdks)
    - [Python](#python)
    - [C](#c)
    - [Android](#android)
    - [iOS](#ios)
    - [Web](#web)
      - [Vanilla JavaScript and HTML (CDN Script Tag)](#vanilla-javascript-and-html-cdn-script-tag)
      - [Vanilla JavaScript and HTML (ES Modules)](#vanilla-javascript-and-html-es-modules)
  - [Releases](#releases)
    - [v1.0.0 Oct 8th, 2021](#v100-oct-8th-2021)

## Demos

### Python Demos

TODO @laves

### C Demos

TODO @ksyeo1010

For more information about C demos go to [demo/c](/demo/c).

### Android Demos

TODO @ErisMik

### iOS Demos

TODO @ErisMik

### Web Demos

From [demo/web](/demo/web) run the following in the terminal:

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

Open http://localhost:5000 in your browser to try the demo.

## SDKs

### Python

TODO @laves

### C

[pv_octopus.h](/include/pv_octopus.h) header file contains relevant information. Build an instance of the object:

```c
    const char *model_path = "..."; // absolute path to the model file available at `lib/common/octopus_params.pv`
    const char *app_id = "..." // AppID provided by Picovoice Console (https://picovoice.ai/console/)
    pv_octopus_t *handle = NULL;
    pv_status_t status = pv_octopus_init(app_id, model_path, &handle);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
```

Index audio data using constructed object:

```c
const char *audio_path = "..."; // absolute path to the audio file to be indexed
void *indices = NULL;
int32_t num_indices_bytes = 0;
pv_status_t status = pv_octopus_index_file(handle, audio_path, &indices, &num_indices_bytes);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}
```

Search the indexed data:

```c
const char *phrase = "...";
pv_octopus_match_t *matches = NULL;
int32_t num_matches = 0;
pv_status_t status = pv_octopus_search(handle, indices, num_indices_bytes, phrase, &matches, &num_matches);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}
```

When done be sure to release the acquired resources:

```c
pv_octopus_delete(handle);
```

### Android

TODO @ErisMik

### iOS

TODO @ErisMik

### Web

Octopus is available on modern web browsers (i.e., not Internet Explorer) via [WebAssembly](https://webassembly.org/). Octopus is provided pre-packaged as a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) to allow it to perform processing off the main thread.

#### Vanilla JavaScript and HTML (CDN Script Tag)

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <script src="https://unpkg.com/@picovoice/octopus-web-en-worker/dist/iife/index.js"></script>
  <script type="application/javascript">
    // The metadata object to save the result of indexing for later searches
    let octopusMetadata = undefined

    function octopusIndexCallback(metadata) {
      octopusMetadata = metadata
    }

    function octopusSearchCallback(matches) {
      console.log(`Search results (${matches.length}):`)
      console.log(`Start: ${match.startSec}s -> End: ${match.endSec}s (Probability: ${match.probability})`)
    }

    async function startOctopus() {
      // Create an Octopus Worker
      // Note: you receive a Worker object, _not_ an individual Octopus instance
      const accessKey = ... // .. AccessKey string provided by Picovoice Console (https://picovoice.ai/console/)
      const OctopusWorker = await OctopusWorkerFactory.create(
        accessKey,
        octopusIndexCallback,
        octopusSearchCallback
      )
    }

    document.addEventListener("DOMContentLoaded", function () {
      startOctopus();
      // Send Octopus the audio signal
      const audioSignal = new Int16Array(/* Provide data with correct format*/)
      OctopusWorker.postMessage({
        command: "index",
        input: audioSignal,
      });
    });

    const searchText = ...
    OctopusWorker.postMessage({
      command: "search",
      metadata: octopusMetadata,
      searchPhrase: searchText,
    });
  </script>
</head>

<body></body>

</html>
```

#### Vanilla JavaScript and HTML (ES Modules)

```console
yarn add @picovoice/octopus-web-en-worker
```

(or)

```console
npm install @picovoice/octopus-web-en-worker
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
  console.log(`Start: ${match.startSec}s -> End: ${match.endSec}s (Probability: ${match.probability})`);
}


async function startOctopus() {
  // Create an Octopus Worker
  // Note: you receive a Worker object, _not_ an individual Octopus instance
  const accessKey = // .. AccessKey provided by Picovoice Console (https://picovoice.ai/console/)
  const OctopusWorker = await OctopusWorkerFactory.create(
    accessKey,
    octopusIndexCallback,
    octopusSearchCallback
  );
}

startOctopus()

...

// Send Octopus the audio signal
const audioSignal = new Int16Array(/* Provide data with correct format*/)
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
```

## Releases

### v1.0.0 Oct 8th, 2021
- Initial release.
