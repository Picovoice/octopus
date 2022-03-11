# Octopus Speech-to-Index engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

This package contains commandline program for indexing and searching inside audio files using Octopus Speech-to-Index engine.

## Octopus

Octopus is Picovoice's Speech-to-Index engine. It directly indexes speech without relying on a text representation.

## Compatibility

- Python 3
- Runs on Linux (x86_64), macOS (x86_64), Windows (x86_64).

## AccessKey

Octopus requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Octopus SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Installation

```console
sudo pip3 install pvoctopusdemo
```

## Usage

This demo allows testing Octopus interactively through commandline. It accepts MP3, WAV, FLAC, and OPUS audio files with sample rates higher than 16kHz. The following command processes all files in the space-separated `{AUDIO_PATHS}` list:

```console
octopus_demo  --access_key {AccessKey} --audio_paths ${AUDIO_PATHS}
```
where `{AccessKey}` is an AccessKey which should be obtained from [Picovoice Console](https://console.picovoice.ai/).

After processing audio files, you are asked for a search phrase:

```console
Enter search phrase (Ctrl+c to exit):
```

The search phrase can have several words separated by space, but each word should only consist of alphabetic characters. As shown in the prompt above, press `Ctrl` and `C` keys at the same time to exit the program.
