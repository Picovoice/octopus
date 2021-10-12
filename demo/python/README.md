# Octopus Speech-to-Index engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

This package contains commandline program for indexing and searching inside audio files using Octopus Speech-to-Index engine.

## Octopus

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation.

## Compatibility

- Python 3
- Runs on Linux (x86_64), Mac (x86_64), Windows (x86_64), Raspberry Pi (all variants), NVIDIA Jetson (Nano), and BeagleBone.

## Installation


```console
sudo pip3 install pvoctopusdemo
```

## Usage

This demo allows testing Octopus interactively through commandline. It accepts MP3, WAV, FLAC, and OPUS audio files with sample rates higher than 16kHz. The following command processes all files in the `{AUDIO_PATH}` list and then asks for a search phrase:

```console
octopus_demo  --access_key {AccessKey} --input_audio_path ${AUDIO_PATH}
```
where `{AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://picovoice.ai/console/).