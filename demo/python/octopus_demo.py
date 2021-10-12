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
from tabulate import tabulate


class LoadingAnimation(threading.Thread):
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

    indexing_animation = LoadingAnimation()
    metadata_list = list()
    indexing_animation.start()
    for audio_file in args.input_audio_path:
        try:
            print("\rindexing '%s'" % os.path.basename(audio_file))
            metadata_list.append(octopus.index_audio_file(os.path.abspath(audio_file)))
        except OSError as e:
            print("Failed to process '%s' with %s" % (os.path.basename(audio_file), e))
            indexing_animation.stop()
            exit(1)

    indexing_animation.stop()

    try:
        while True:
            search_phrase = input("\rEnter search phrase (Ctrl+c to exit): ")
            if not search_phrase.replace(" ", "").isalpha():
                print("The search phrase should only consist of alphabetic characters.")
                continue
            for i, metadata in enumerate(metadata_list):
                print("Matches in '%s':" % (os.path.basename(args.input_audio_path[i])))
                matches = octopus.search(metadata, [str(search_phrase.strip())])
                if len(matches) != 0:
                    results = matches[str(search_phrase)]
                    result_table = list()
                    for result in results:
                        result_table.append([result.start_sec, result.end_sec, result.probability])
                    print(tabulate(result_table, headers=['Start time (s)', 'End time (s)', 'Probability']))
                else:
                    print("Nothing found!")
            print("\n")

    except KeyboardInterrupt:
        print('Stopping ...')
    finally:
        octopus.delete()
        for metadata in metadata_list:
            metadata.delete()


if __name__ == '__main__':
    main()
