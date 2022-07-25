import os
import subprocess
import sys
import time
import wave
from argparse import ArgumentParser
from threading import Thread

import pvoctopus
from pytube import YouTube


class ProgressAnimation(Thread):
    def __init__(self, prefix, step_sec=0.1):
        self._prefix = prefix
        self._step_sec = step_sec
        self._frames = [
            ".  ",
            ".. ",
            "...",
            " ..",
            "  .",
            "   "
        ]
        self._done = False
        super().__init__()

    def run(self):
        self._done = False
        while True:
            for frame in self._frames:
                if self._done:
                    sys.stdout.write('\r%s\r' % " " * (len(self._prefix) + 1 +len(frame)))
                    return
                sys.stdout.write('\r%s %s' % (self._prefix, frame))
                time.sleep(self._step_sec)

    def stop(self):
        self._done = True


def download(url, folder):
    webm_path = os.path.join(folder, '%s.webm' % url.split("watch?v=")[1])
    if not os.path.exists(webm_path):
        anime = ProgressAnimation('Downloading %s' % url)
        anime.start()
        youtube = YouTube(url)
        audio_stream = youtube.streams.filter(only_audio=True, audio_codec='opus').order_by('bitrate').last()
        audio_stream.download(output_path=folder, filename=os.path.basename(webm_path), skip_existing=True)
        anime.stop()

    wav_path = webm_path.replace('.webm', '.wav')
    if not os.path.exists(wav_path):
        anime = ProgressAnimation('Converting WebM to WAV format')
        anime.start()
        subprocess.check_output(
            'ffmpeg -y -i %s -f wav -fflags bitexact -ac 1 -ar 16000 -acodec pcm_s16le %s' % (webm_path, wav_path),
            stderr=subprocess.STDOUT,
            shell=True)
        anime.stop()

    return wav_path


def main():
    parser = ArgumentParser()
    parser.add_argument('--access-key', required=True)
    parser.add_argument('--url', required=True)
    parser.add_argument('--phrases', nargs='+', required=True)
    parser.add_argument('--min-prob', type=float, default=0.25)
    parser.add_argument('--work-folder', default=os.path.expanduser('~/'))
    args = parser.parse_args()

    wav_path = download(url=args.url, folder=args.work_folder)
    with wave.open(wav_path) as f:
        length_sec = f.getnframes() / f.getframerate()

    o = pvoctopus.create(access_key=args.access_key)

    metadata_path = wav_path.replace('.wav', '.oif')
    if not os.path.exists(metadata_path):
        start_sec = time.time()
        anime = ProgressAnimation('Indexing')
        anime.start()
        metadata = o.index_audio_file(wav_path)
        anime.stop()
        with open(metadata_path, 'wb') as f:
            f.write(metadata.to_bytes())

        print('\rIndexed %d seconds of audio in %.2f seconds' % (int(length_sec), time.time() - start_sec))

    with open(metadata_path, 'rb') as f:
        metadata = pvoctopus.OctopusMetadata.from_bytes(f.read())

    start_sec = time.time()
    matches = o.search(metadata, phrases=args.phrases)
    print(
        'Searched %d seconds of audio for %d phrases in %.5f seconds', % (int(length_sec), len(args.phrases), time.time() - start_sec))
    for phrase, phrase_matches in matches.items():
        phrase_matches = [x for x in phrase_matches if x.probability >= args.min_prob]
        if len(phrase_matches) > 0:
            print('%s >>>' % phrase)
            for phrase_match in phrase_matches:
                print('[%d%] %s&t=%d' % (int(phrase_match.probability * 100), args.url, int(phrase_match.start_sec)))


if __name__ == '__main__':
    main()
