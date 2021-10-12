#
# Copyright 2021 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import argparse
import os
import sys
import threading
import time

import pvoctopus
import soundfile
from tabulate import tabulate


class Animation(threading.Thread):
    def __init__(self, sleep_time=0.1):
        self._sleep_time_sec = sleep_time
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
        while not self._done:
            for frame in self._frames:
                if self._done:
                    break
                sys.stdout.write('\r' + frame)
                time.sleep(self._sleep_time_sec)

    def stop(self):
        self._done = True


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--input_audio_path', nargs='+', help='Absolute path to input audio files', required=True)

    parser.add_argument('--library_path', help='Absolute path to dynamic library', default=pvoctopus.LIBRARY_PATH)

    parser.add_argument(
        '--model_path',
        help='Absolute path to the file containing model parameters',
        default=pvoctopus.MODEL_PATH)

    parser.add_argument(
        '--access_key',
        help='AccessKey provided by Picovoice Console (https://picovoice.ai/console/)',
        required=True)

    args = parser.parse_args()

    octopus = pvoctopus.create(access_key=args.access_key, library_path=args.library_path, model_path=args.model_path)
    print("Octopus version: %s" % octopus.version)

    indexing_animation = Animation()
    metadata_list = list()
    indexing_animation.start()
    for audio_file in args.input_audio_path:
        print("\rindexing '%s'" % os.path.basename(audio_file))
        audio, sample_rate = soundfile.read(audio_file, dtype='int16')
        if audio.ndim == 2:
            print('Octopus processes single-channel audio, but stereo file was provided. Processing left channel only.')
            audio = audio[0, :]
        if sample_rate != octopus.pcm_sample_rate:
            raise ValueError(
                "Audio file should have a sample rate of %d. got %d" % (octopus.pcm_sample_rate, sample_rate))
        metadata_list.append(octopus.index_audio_data(audio))
    indexing_animation.stop()

    try:
        while True:
            search_phrase = input("\rEnter search phrase (Ctrl+c to exit): ")
            if not search_phrase.isalpha():
                print("The search phrase should only consist of alphabetic characters.")
                continue
            for i, metadata in enumerate(metadata_list):
                print("Matches in '%s':" % (os.path.basename(args.input_audio_path[i])))
                matches = octopus.search(metadata, [str(search_phrase)])
                if len(matches) != 0:
                    results = matches[str(search_phrase)]
                    result_row = list()
                    for result in results:
                        result_row.append([result.start_sec, result.end_sec, result.probability])
                    print(tabulate(result_row, headers=['Start time (s)', 'End time (s)', 'Probability']))
                else:
                    print("nothing found!")
            print("\n")

    except KeyboardInterrupt:
        print('Stopping ...')
    finally:
        octopus.delete()
        for metadata in metadata_list:
            metadata.delete()


if __name__ == '__main__':
    main()
