# Octopus

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation. This
acoustic-only approach boosts accuracy by removing out-of-vocabulary limitation and eliminating the problem of competing
hypothesis (e.g. homophones)

## Compatibility

- Python 3
- Runs on Linux (x86_64), macOS (x86_64), Windows (x86_64)

## Installation

```console
pip3 install pvoctopus
```

## AccessKey

Octopus requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Octopus SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine:

```python
import pvoctopus

access_key = ""  # AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
handle = pvoctopus.create(access_key=access_key)
```

Octopus consists of two steps: Indexing and Searching. Indexing transforms audio data into a `Metadata` object that
searches can be run against.

Octopus indexing has two modes of operation: indexing PCM audio data, or indexing an audio file.

When indexing PCM audio data, the valid audio sample rate is given by `handle.pcm_sample_rate`.
The engine accepts 16-bit linearly-encoded PCM and operates on single-channel audio:

```python
audio_data = [..]
metadata = handle.index(audio_data)
```

Similarly, files can be indexed by passing in the absolute file path to the audio object.
Supported file formats are mp3, flac, wav and opus:

```python
audio_file_path = "/path/to/my/audiofile.wav"
metadata = handle.index_file(audio_file_path)
```

Once the `Metadata` object has been created, it can be used for searching:

```python
search_term = 'picovoice'
matches = octopus.search(metadata, [search_term])
```

Multiple search terms can be given:
```python
matches = octopus.search(metadata, ['picovoice', 'Octopus', 'rhino'])
```

The `matches` object is a dictionary where the `key` is the `phrase`, and the `value` is a `list` of `Match` objects.
The `Match` object contains the `start_sec`, `end_sec` and `probablity` of each match:

```python
matches = octopus.search(metadata, ['avocado'])

avocado_matches = matches['avocado']
for match in avocado_matches:
    print(f"Match for `avocado`: {match.start_sec} -> {match.end_sec} ({match.probablity})")
```

The `Metadata` object can be cached or stored to skip the indexing step on subsequent searches.
This can be done with the `to_bytes()` and `from_bytes()` methods:

```python
metadata_bytes = metadata.to_bytes()

# ... Write & load `metadata_bytes` from cache/filesystem/etc.

cached_metadata = pvoctopus.OctopusMetadata.from_bytes(metadata_bytes)
matches = self.octopus.search(cached_metadata, ['avocado'])
```

When done the handle resources have to be released explicitly:

```python
handle.delete()
```
