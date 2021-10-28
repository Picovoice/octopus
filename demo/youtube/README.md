# Octopus YouTube Demo

## Prerequisite

- [FFmpeg](https://www.ffmpeg.org/)
- Python 3.5+

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
--phrases ${SEARCH_PHRASE0} ${SEARCH_PHRASE1}
```

replace `${ACCESS_KEY}` with your own obtained from [Picovoice Console](https://console.picovoice.ai/). Here
is a sample output:

```console
searched 3024 seconds of audio for 1 phrases in 0.02068 seconds
pied piper >>>
[0.5] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=784
[1.0] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=840
[1.0] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=2355
[1.0] https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=2940
```
