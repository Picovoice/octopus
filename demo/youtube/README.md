# Octopus YouTube Demo

## Prerequisite

- [FFmpeg](https://www.ffmpeg.org/) (On Windows you need to add FFmpeg to your `PATH`)
- Python 3.5+

## AccessKey

Octopus requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Octopus SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Install Python dependencies:

```console
pip3 install -r demo/youtube/requirements.txt
```

From the root of the repository run:

```console
python3 demo/youtube/octotube.py \
--access-key ${ACCESS_KEY} \
--url ${YOUTUBE_VIDEO_URL} \
--phrases ${SEARCH_PHRASES}
```

Replace `${ACCESS_KEY}` with your own obtained from [Picovoice Console](https://console.picovoice.ai/). Replace `${YOUTUBE_VIDEO_URL}`
with the URL to a video (not a playlist or channel). A video URL on YouTube should look like this: `https://www.youtube.com/watch?v=${VIDEO_UUID}`.

Here is a sample output:

```console
searched 3024 seconds of audio for 1 phrases in 0.02068 seconds
pied piper >>>
[50%] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=784
[100%] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=840
[100%] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=2355
[100%] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=2940
```
