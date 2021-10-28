import os
import subprocess
import time
import wave
from argparse import ArgumentParser

import pvoctopus
from pytube import YouTube


def download(url, folder):
    webm_path = os.path.join(folder, f'{url.split("watch?v=")[1]}.webm')
    if not os.path.exists(webm_path):
        youtube = YouTube(url)
        audio_stream = youtube.streams.filter(only_audio=True, audio_codec='opus').order_by('bitrate').last()
        audio_stream.download(output_path=folder, filename=os.path.basename(webm_path), skip_existing=True)

    wav_path = webm_path.replace('.webm', '.wav')
    if not os.path.exists(wav_path):
        subprocess.check_output(
            f'ffmpeg -y -i {webm_path} -f wav -fflags bitexact -ac 1 -ar 16000 -acodec pcm_s16le {wav_path}',
            stderr=subprocess.STDOUT,
            shell=True)

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
        metadata = o.index_audio_file(wav_path)
        with open(metadata_path, 'wb') as f:
            f.write(metadata.to_bytes())
        print(f'indexed {int(length_sec)} seconds of audio in {time.time() - start_sec:.2f} seconds')

    with open(metadata_path, 'rb') as f:
        metadata = pvoctopus.OctopusMetadata.from_bytes(f.read())

    start_sec = time.time()
    matches = o.search(metadata, phrases=args.phrases)
    print(
        f'searched {int(length_sec)} seconds of audio for {len(args.phrases)} phrases in {time.time() - start_sec:.5f} seconds')
    for phrase, phrase_matches in matches.items():
        phrase_matches = [x for x in phrase_matches if x.probability >= args.min_prob]
        if len(phrase_matches) > 0:
            print(f'{phrase} >>>')
            for phrase_match in phrase_matches:
                print(f'[{phrase_match.probability:.1f}] {args.url}&t={int(phrase_match.start_sec)}')


if __name__ == '__main__':
    main()
