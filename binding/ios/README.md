# Octopus

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This
acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation and eliminating the problem of competing
hypothesis (e.g. homophones)

## Compatibility

- iOS 9.0+

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret. 
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Installation

The Octopus iOS binding is available via [Cocoapods](https://cocoapods.org/pods/Octopus-iOS). To import it into your iOS project, add the following line to your Podfile: 

```ruby
pod 'Octopus-iOS'
```

## Usage

Create an instance of the engine:

```swift
import Octopus

let accessKey : String = // .. AccessKey provided by Picovoice Console (https://picovoice.ai/console/)
do {
    let handle = try Octopus(accessKey: accessKey)
} catch { }
```

Octpus consists of two steps: Indexing and Searching.
Indexing transforms audio data into searchable `OctopusMetadata` object. 

Octopus indexing has two input options: raw PCM audio data, or an audio file.

When indexing PCM audio data, the valid audio sample rate is given by `handle.getPcmDataSampleRate()`.
The engine accepts 16-bit linearly-encoded PCM and operates on single-channel audio:

```swift
audioData: [Int16] = // .. get audio
do {
    let metadata = try handle.indexAudioData(pcm: audioData)
} catch { }
```

Audio files can also be indexed by passing in the absolute file path to the audio object:

```swift
let audioFilePath = "/path/to/my/audiofile.wav"
do {
    let metadata = try handle.indexAudioFile(path: audioFilePath)
} catch { }
```

Since indexing is computationally expensive,
`OctopusMetadata` can be cached or stored to skip the indexing step on subsequent search queries.
To retrieve the binary data for saving:
```swift
let metadataBytes: [UInt8] = try metadata.getBytes()
// .. save bytes
```

You can also create a new `OctopusMetadata` object from previously saved bytes:
```swift
metadataBytes: [UInt8] = // .. load metadata
let metadata = OctopusMetadata(metadataBytes: metadataBytes)
```

Once you have an `OctopusMetadata` object, it can be used for searching:

```swift
let phrases: Set<String> = ["gorilla", "terminator"]
let matches = try octopus.search(metadata: metadata, phrases: phrases)
```

Matches are returned in a hashmap, where the key is the input phrase and the associated value is an array
of immutable `OctopusMatch` objects that represent any instances of the phrase that were found in the input audio. 
The start time and end time of the match are given in seconds, while the probability is a floating-point value between [0, 1].

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

When done resources have to be released explicitly:

```swift
metadata.delete();
handle.delete();
```

## Running Unit Tests

Copy your `AccessKey` into the `accessKey` variable in [`OctopusAppTestUITests.swift`](OctopusAppTest/OctopusAppTestUITests/OctopusAppTestUITests.swift). Open `OctopusAppTest.xcworkspace` with XCode and run the tests with `Product > Test`.
