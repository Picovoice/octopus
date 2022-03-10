# Octopus Demo

## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret. 
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Setup

Replace `"${YOUR_ACCESS_KEY_HERE}"` inside [MainActivity.java](octopus-demo-app/src/main/java/ai/picovoice/octopusdemo/MainActivity.java)
with your AccessKey obtained from [Picovoice Console](https://picovoice.ai/console/).

## Usage

Launch the demo on your phone using Android Studio.

1. Press the record button.
2. Start talking. Record some phrases or whatever audio you would like to search.
3. Press stop. Wait for the info box to display "Indexing Complete". This may take a few seconds.
4. Enter your search phrase into the text input and press search. The results will appear below.
5. You can continue to enter in new search phrases without re-recording or re-indexing the audio.


## Running the Instrumented Unit Tests

Ensure you have an Android device connected or simulator running. Then run the following from the terminal:

```console
cd demo/android/OctopusDemo
./gradlew connectedAndroidTest -PpvTestingAccessKey="YOUR_ACCESS_KEY_HERE"
```

The test results are stored in `octopus-demo-app/build/reports`.
