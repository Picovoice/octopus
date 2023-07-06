#
# Copyright 2022 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import sys
import time
from argparse import ArgumentParser
from threading import Thread
from typing import *

import pvoctopus
from yt_dlp import YoutubeDL


class ProgressAnimation(Thread):
    def __init__(self, prefix: str, step_sec: float = 0.1):
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
                    sys.stdout.write('\r%s\r' % " " * (len(self._prefix) + 1 + len(frame)))
                    return
                sys.stdout.write('\r%s %s' % (self._prefix, frame))
                time.sleep(self._step_sec)

    def stop(self):
        self._done = True


def download_ytdlp(url: str, output_dir: str, options: Optional[Dict[str, Any]] = None) -> List[str]:
    ydl_opts = {
        'outtmpl': "%(id)s.%(ext)s",
        'format': 'bestaudio',
        'paths': {
            'home': output_dir
        },
        'geo_bypass': True
    }
    if options is not None:
        ydl_opts.update(**options)
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.sanitize_info(ydl.extract_info(url, download=False))
        ydl.download([url])
        return os.path.join(output_dir, f"{info['id']}.webm"), info['duration']


def main():
    parser = ArgumentParser()
    parser.add_argument('--access-key', required=True)
    parser.add_argument('--url', required=True)
    parser.add_argument('--phrases', nargs='+', required=True)
    parser.add_argument('--min-prob', type=float, default=0.25)
    parser.add_argument('--work-folder', default=os.path.expanduser('~/'))
    args = parser.parse_args()

    webm_path = download_ytdlp(url=args.url, output_dir=args.work_folder)[0]

    o = pvoctopus.create(access_key=args.access_key)

    metadata_path = webm_path.replace('.webm', '.oif')
    if not os.path.exists(metadata_path):
        anime = ProgressAnimation('Indexing')
        anime.start()
        metadata = o.index_audio_file(webm_path)
        anime.stop()
        with open(metadata_path, 'wb') as f:
            f.write(metadata.to_bytes())

    with open(metadata_path, 'rb') as f:
        metadata = pvoctopus.OctopusMetadata.from_bytes(f.read())

    matches = o.search(metadata, phrases=args.phrases)
    for phrase, phrase_matches in matches.items():
        phrase_matches = [x for x in phrase_matches if x.probability >= args.min_prob]
        if len(phrase_matches) > 0:
            print('%s >>>' % phrase)
            for phrase_match in phrase_matches:
                print('[%d%%] %s&t=%d' % (int(phrase_match.probability * 100), args.url, int(phrase_match.start_sec)))


if __name__ == '__main__':
    main()
