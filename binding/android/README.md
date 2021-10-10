# Octopus

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This
acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation and eliminating the problem of competing
hypothesis (e.g. homophones)

## Compatibility

- Android 5.0 (SDK 21+)

## Installation

Octopus is hosted on Maven Central. To include the package in your Android project, ensure you have
included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your
app's `build.gradle`:

```groovy
dependencies {
    // ...
    implementation 'ai.picovoice:octopus-android:${VERSION}'
}
```

## Usage

Create an instance of the engine with the Octopus Builder class by passing in the Android app context:

```java
import ai.picovoice.octopus.*;

final String accessKey = "..."; // AccessKey provided by Picovoice Console (https://picovoice.ai/console/)
try {
    Octopus handle = new Octopus.Builder(accessKey).build(appContext);
} catch (OctopusException ex) { }
```

Octopus consists of two steps: Indexing and Searching.
Indexing transforms audio data into searchable `OctopusMetadata` object. Since indexing is computationally expensive,
`OctopusMetadata` can be cached or stored to skip the indexing step on subsequent search queries.
To retrieve the binary data for saving:
```java
byte[] metadataBytes = metadata.getBytes();
// .. save bytes
```

Octopus indexing has two input options: raw PCM audio data, or an audio file.

When indexing PCM audio data, the valid audio sample rate is given by `handle.getPcmDataSampleRate()`.
The engine accepts 16-bit linearly-encoded PCM and operates on single-channel audio:

```java
import ai.picovoice.octopus.*;

short[] audioData = [..];
try {
    OctopusMetadata metadata = handle.indexAudioData(audioData);
} catch (OctopusException ex) { }
```

Audio files can also be indexed by passing in the absolute file path to the audio object:

```java
String audioFilePath = "/path/to/my/audiofile.wav"
try {
    OctopusMetadata metadata = handle.indexAudioFile(audioFilePath);
} catch (OctopusException ex) { }
```

You can also create a new `OctopusMetadata` object from previously saved bytes:
```java
byte[] metadataBytes = // .. load metadata
OctopusMetadata metadata = new OctopusMetadata(metadataBytes);
```

Once you have an `OctopusMetadata` object, it can be used for searching:

```java
HashSet<String> phrases = new HashSet<>(Arrays.asList("gorilla", "terminator"));
HashMap <String, OctopusMatch[]> matches = handle.search(metadata, phrases);
```

Matches are returned in a hashmap, where the key is the input phrase and the associated value is an array
of immutable `OctopusMatch` objects that represent any instances of the phrase that were found in the input audio. 
The start time and end time of the match are given in seconds, while the probability is a floating-point value between [0, 1].

```java
HashMap <String, OctopusMatch[]> matches = handle.search(metadata, phrases);

for (Map.Entry<String, OctopusMatch[]> entry : map.entrySet()) {
    String phrase = entry.getKey();
    for (OctopusMatch phraseMatch : entry.getValue()){
        float startSec = phraseMatch.getStartSec();
        float endSec = phraseMatch.getEndSec();
        float probability = phraseMatch.getProbability();
    }
}
```

When done resources have to be released explicitly:

```java
metadata.delete();
handle.delete();
```
