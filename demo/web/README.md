# octopus-web-demo

This is a basic demo to show how to use Octopus for web browsers, using the IIFE version of the library
(i.e. an HTML script tag). It instantiates an Octopus worker engine and uses it to index and search an audio file.

## Install & run

```console
yarn
yarn start
```

(or)

```console
npm
npm run start
```

Open `localhost:5000` in your web browser, as hinted at in the output:

```console
   ┌──────────────────────────────────────────────────┐
   │                                                  │
   │   Serving!                                       │
   │                                                  │
   │   - Local:            http://localhost:5000      │
   │   - On Your Network:  http://192.168.1.69:5000   │
   │                                                  │
   │   Copied local address to clipboard!             │
   │                                                  │
   └──────────────────────────────────────────────────┘
```

## Usage

1. Enter your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/)
2. Wait until Octopus has initialized. Then, upload a file use the file selector.
3. Wait for the audio to index, events will display on the webpage.
4. Enter your search term and then press search, matches will appear on the page.
5. You can continue to enter in terms and search without needing to reindex the audio file!
