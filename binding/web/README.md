# octopus-web-template

This is a template package for building the octopus-web-* projects.

## Create octopus-web-\* projects

Use `yarn` then `yarn build` to gather dependencies and generate projects from the project template:

```console
yarn
yarn build
```

Now each individual project will exist. E.g.:

```console
cd octopus-web-en-worker
yarn
yarn build
```

## Running Octopus web tests

### Browser

1. Open the file `octopus-web-en-factory/test/index.html`.
2. Add the access key provided by [Picovoice Console](https://console.picovoice.ai/access_key).
3. Add the audio file located under [/res/audio/multiple_keywords.wav](/res/audio/multiple_keywords.wav).
4. Press the start button.

### Selenium

**Note**: Requires Python 3, [Selenium](https://selenium-python.readthedocs.io/installation.html#installing-python-bindings-for-selenium) and [Chrome WebDriver](https://chromedriver.chromium.org/downloads).

Refer to `{ACCESS_KEY}` to the access key provided by [Picovoice Console](https://console.picovoice.ai/access_key).

Go to the individual project and run the Python script to run the tests. E.g.:

```console
cd octopus-web-en-factory
python3 test/selenium_test.py --access_key {ACCESS_KEY} --audio_file ../../../res/audio/multiple_keywords.wav
```



