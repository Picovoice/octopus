# Octopus C Demos

## Requirements

- An `x86_64` machine running `Linux`, `macOS`, or `Windows`
- [CMake](https://cmake.org/) version `3.4` or higher.
- [Mingw-w64](http://mingw-w64.org/doku.php) (Windows Only)
- This doc assumes commands are run from the [root](../..) of the repository.

## AccessKey

Octopus requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Octopus SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret. 
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Build

### Linux and macOS

```console
cmake -S demo/c -B demo/c/build && cmake --build demo/c/build
```

### Windows

```console
cmake -S demo/c -B demo/c/build -G "MinGW Makefiles" && cmake --build demo/c/build
```

## Run Index Demo

Indexes a given audio file and saves the metadata. In the following, replace `${ACCESS_KEY}` with
the AccessKey provided by [Picovoice Console](https://picovoice.ai/console/),
replace `${AUDIO_PATH}` with the path to a given audio file and replace `${INDEX_PATH}` with the path to cached index file.

### Ubuntu

```console
./demo/c/build/octopus_index_demo \
lib/linux/x86_64/libpv_octopus.so \
lib/common/octopus_params.pv \
${ACCESS_KEY} \
${AUDIO_PATH} \
${INDEX_PATH}
```

### macOS

```console
# Macos with Intel Chip
./demo/c/build/octopus_index_demo \
lib/mac/x86_64/libpv_octopus.dylib \
lib/common/octopus_params.pv \
${ACCESS_KEY} \
${AUDIO_PATH} \
${INDEX_PATH}

# Macos with Apple Chip
./demo/c/build/octopus_index_demo \
lib/mac/arm64/libpv_octopus.dylib \
lib/common/octopus_params.pv \
${ACCESS_KEY} \
${AUDIO_PATH} \
${INDEX_PATH}
```

### Windows

```console
demo\\c\\build\\octopus_index_demo ^
lib\\windows\\amd64\\libpv_octopus.dll ^
lib\\common\\octopus_params.pv ^
${ACCESS_KEY} ^
${AUDIO_PATH} ^
${INDEX_PATH}
```

## Run Search Demo

Searches cached metadata for utterances of a given search phrase. In the following, replace `${ACCESS_KEY}` with
the AccessKey provided by [Picovoice Console](https://picovoice.ai/console/),
replace `${INDEX_PATH}` with the path to a given index file and replace `${PHRASE}` to a search phrase.

### Ubuntu

```console
./demo/c/build/octopus_search_demo \
lib/linux/x86_64/libpv_octopus.so \
lib/common/octopus_params.pv \
${ACCESS_KEY} \
${INDEX_PATH} \
${PHRASE}
```

### macOS

```console
# Macos with Intel Chip
./demo/c/build/octopus_search_demo \
lib/mac/x86_64/libpv_octopus.dylib \
lib/common/octopus_params.pv \
${ACCESS_KEY} \
${INDEX_PATH} \
${PHRASE}

# Macos with Apple Chip
./demo/c/build/octopus_search_demo \
lib/mac/arm64/libpv_octopus.dylib \
lib/common/octopus_params.pv \
${ACCESS_KEY} \
${INDEX_PATH} \
${PHRASE}
```

### Windows

```console
demo\\c\\build\\octopus_search_demo ^
lib\\windows\\amd64\\libpv_octopus.dll ^
lib\\common\\octopus_params.pv ^
${ACCESS_KEY} ^
${INDEX_PATH} ^
${PHRASE}
```
