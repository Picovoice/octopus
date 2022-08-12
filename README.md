# Octopus

[![GitHub](https://img.shields.io/github/license/Picovoice/octopus)](https://github.com/Picovoice/octopus/)

[![PyPI](https://img.shields.io/pypi/v/pvoctopus)](https://pypi.org/project/pvoctopus/)
[![Maven Central](https://img.shields.io/maven-central/v/ai.picovoice/octopus-android?label=maven-central%20%5Bandroid%5D)](https://repo1.maven.org/maven2/ai/picovoice/octopus-android/)
[![Cocoapods](https://img.shields.io/cocoapods/v/Octopus-iOS)](https://github.com/Picovoice/octopus/tree/master/binding/ios)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

[![Twitter URL](https://img.shields.io/twitter/url?label=%40AiPicovoice&style=social&url=https%3A%2F%2Ftwitter.com%2FAiPicovoice)](https://twitter.com/AiPicovoice)
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UCAdi9sTCXLosG1XeqDwLx7w?label=YouTube&style=social)](https://www.youtube.com/channel/UCAdi9sTCXLosG1XeqDwLx7w)

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This
acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation and eliminating the problem of competing
hypothesis (e.g. homophones)

## Table of Contents

- [Octopus](#octopus)
  - [Table of Contents](#table-of-contents)
  - [Demos](#demos)
    - [Python](#python-demos)
    - [C](#c-demos)
    - [Android](#android-demos)
    - [iOS](#ios-demos)
    - [Web](#web-demos)
  - [SDKs](#sdks)
    - [Python](#python)
    - [C](#c)
    - [Android](#android)
    - [iOS](#ios)
    - [Web](#web)
  - [Releases](#releases)

## Demos

### Python Demos

Install the demo package:

```console
sudo pip3 install pvoctopusdemo
```

Run the following in the terminal:

```console
octopus_demo  --access_key {AccessKey} --audio_paths ${AUDIO_PATHS}
```

Replace `${AccessKey}` with your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/) and `${AUDIO_PATHS}` with a space-separated list of audio files.
Octopus starts processing the audio files and asks you for search phrases and shows results interactively.

For more information about the Python demos go to [demo/python](/demo/python).

### C Demos

Build the demo:

```console
cmake -S demo/c/ -B demo/c/build && cmake --build demo/c/build
```

Index a given audio file:

```console
./demo/c/build/octopus_index_demo ${LIBRARY_PATH} ${ACCESS_KEY} ${AUDIO_PATH} ${INDEX_PATH}
```

Then search the index for a given phrase:

```console
./demo/c/build/octopus_search_demo ${LIBRARY_PATH} ${MODEL_PATH} ${ACCESS_KEY} ${INDEX_PATH} ${SEARCH_PHRASE}
```

Replace `${LIBRARY_PATH}` with path to appropriate library available under [lib](/lib), `${ACCESS_KEY}` with
AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/), `${AUDIO_PATH}` with the path to a given
audio file and format, `${INDEX_PATH}` with the path to cached index file and `${SEARCH_PHRASE}` to a search phrase.

For more information about C demos go to [demo/c](/demo/c).

### Android Demos

Using [Android Studio](https://developer.android.com/studio/index.html), open [demo/android/OctopusDemo](/demo/android/OctopusDemo)
as an Android project.

Replace `"${YOUR_ACCESS_KEY_HERE}"` inside [MainActivity.java](/demo/android/OctopusDemo/octopus-demo-app/src/main/java/ai/picovoice/octopusdemo/MainActivity.java)
with your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/). Then run the demo.

For more information about Android demos go to [demo/android](/demo/android).

### iOS Demos

From the [demo/ios/OctopusDemo](demo/ios/OctopusDemo), run the following to install the Octopus CocoaPod:

```console
pod install
```

Replace `"{YOUR_ACCESS_KEY_HERE}"` inside [`ViewModel.swift`](/demo/ios/OctopusDemo/OctopusDemo/ViewModel.swift) with your
AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/).  Then, using [Xcode](https://developer.apple.com/xcode/),
open the generated `OctopusDemo.xcworkspace` and run the application.

For more information about iOS demos go to [demo/ios](/demo/ios).

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

Open `http://localhost:5000` in your browser to try the demo.

## SDKs

### Python

Create an instance of the engine:

```python
import pvoctopus
access_key = ""  # AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
handle = pvoctopus.create(access_key=access_key)
```

Index your raw audio data or file:

```python
audio_data = [..]
metadata = handle.index(audio_data)
# or
audio_file_path = "/path/to/my/audiofile.wav"
metadata = handle.index_file(audio_file_path)
```

Then search the metadata for phrases:

```python
avocado_matches = matches['avocado']
for match in avocado_matches:
    print(f"Match for `avocado`: {match.start_sec} -> {match.end_sec} ({match.probablity})")
```

When done the handle resources have to be released explicitly:

```python
handle.delete()
```

### C

[pv_octopus.h](/include/pv_octopus.h) header file contains relevant information. Build an instance of the object:

```c
    const char *model_path = "..."; // absolute path to the model file available at `lib/common/octopus_params.pv`
    const char *access_key = "..." // AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
    pv_octopus_t *handle = NULL;
    pv_status_t status = pv_octopus_init(access_key, model_path, &handle);
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

Create an instance of the engine:

```java
import ai.picovoice.octopus.*;

final String accessKey = "..."; // AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
try {
    Octopus handle = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
} catch (OctopusException ex) { }
```

Index audio data using constructed object:

```java
final String audioFilePath = "/path/to/my/audiofile.wav"
try {
    OctopusMetadata metadata = handle.indexAudioFile(audioFilePath);
} catch (OctopusException ex) { }
```

Search the indexed data:

```java
HashMap <String, OctopusMatch[]> matches = handle.search(metadata, phrases);

for (Map.Entry<String, OctopusMatch[]> entry : map.entrySet()) {
    final String phrase = entry.getKey();
    for (OctopusMatch phraseMatch : entry.getValue()){
        final float startSec = phraseMatch.getStartSec();
        final float endSec = phraseMatch.getEndSec();
        final float probability = phraseMatch.getProbability();
    }
}
```

When done be sure to release the acquired resources:

```java
metadata.delete();
handle.delete();
```

### iOS

Create an instance of the engine:

```swift
import Octopus

let accessKey : String = // .. AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
do {
    let handle = try Octopus(accessKey: accessKey)
} catch { }
```

Index audio data using constructed object:

```swift
let audioFilePath = "/path/to/my/audiofile.wav"
do {
    let metadata = try handle.indexAudioFile(path: audioFilePath)
} catch { }
```

Search the indexed data:

```swift
let matches: Dictionary<String, [OctopusMatch]> = try octopus.search(metadata: metadata, phrases: phrases)
for (phrase, phraseMatches) in matches {
    for phraseMatch in phraseMatches {
        var startSec = phraseMatch.startSec;
        var endSec = phraseMatch.endSec;
        var probability = phraseMatch.probability;
    }
}
```

When done be sure to release the acquired resources:

```swift
handle.delete();
```

### Web

Install the web SDK using yarn:

```console
yarn add @picovoice/octopus-web
```

or using npm:

```console
npm install --save @picovoice/octopus-web
```

Create an instance of the engine using `OctopusWorker` and transcribe an audio file:

```typescript
import { Octopus } from "@picovoice/octopus-web";
import octopusParams from "${PATH_TO_BASE64_OCTOPUS_PARAMS}";

function getAudioData(): Int16Array {
... // function to get audio data
  return new Int16Array();
}

const octopus = await OctopusWorker.fromBase64(
  "${ACCESS_KEY}", 
  octopusParams
);

const octopusMetadata = await octopus.index(getAudioData());
const searchResult = await octopus.search(octopusMetadata, "${SEARCH_PHRASE}");
console.log(searchResult);
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console]((https://console.picovoice.ai/)). Finally, when done release the resources using `octopus.release()`.

## Releases

### v1.2.0 August 11th, 2022

* added language support for French, German, Spanish, Japanese, Korean, Italian, and Portuguese
* improved testing infrastructure

### v1.1.0 May 12th, 2022

* various bug fixes and improvements

### v1.0.0 October 8th, 2021

* Initial release.
