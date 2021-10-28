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
indexed 3024 seconds of audio in 52.03 seconds
searched 3024 seconds of audio for 1 phrases in 0.01001 seconds
jian yang >>>
https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=1332
https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=1438
https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=1791
https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=2019
https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=2420
https://www.youtube.com/watch?v=Lt6PPiTTwbE&t=2478
```
