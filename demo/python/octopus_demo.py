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
    def __init__(self, sleep_time_sec=0.1):
        self._sleep_time_sec = sleep_time_sec
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

    parser.add_argument('--audio_paths', nargs='+', help='Absolute paths to input audio files', required=True)

    parser.add_argument('--library_path', help='Absolute path to dynamic library', default=pvoctopus.LIBRARY_PATH)

    parser.add_argument(
        '--model_path',
        help='Absolute path to the file containing model parameters',
        default=pvoctopus.MODEL_PATH)

    parser.add_argument(
        '--access_key',
        help='AccessKey provided by Picovoice Console (https://console.picovoice.ai/)',
        required=True)

    args = parser.parse_args()

    try:
        octopus = pvoctopus.create(
            access_key=args.access_key,
            library_path=args.library_path,
            model_path=args.model_path)
        print("Octopus version: %s" % octopus.version)
    except (MemoryError, ValueError, RuntimeError, PermissionError) as e:
        print(e)
        sys.exit(1)

    indexing_animation = LoadingAnimation()
    metadata_list = list()
    indexing_animation.start()
    for audio_file in args.audio_paths:
        try:
            print("\rindexing '%s'" % os.path.basename(audio_file))
            metadata_list.append(octopus.index_audio_file(os.path.abspath(audio_file)))
        except (MemoryError, ValueError, RuntimeError, PermissionError, IOError) as e:
            print("Failed to process '%s' with '%s'" % (os.path.basename(audio_file), e))
            octopus.delete()
            sys.exit(1)
        finally:
            indexing_animation.stop()

    try:
        while True:
            search_phrase = input("\rEnter search phrase (Ctrl+c to exit): ")
            search_phrase = search_phrase.strip()
            for i, metadata in enumerate(metadata_list):
                try:
                    matches = octopus.search(metadata, [str(search_phrase)])
                except pvoctopus.OctopusInvalidArgumentError as e:
                    print(e)
                    continue
                if len(matches) != 0:
                    print("Matches in '%s':" % (os.path.basename(args.audio_paths[i])))
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


if __name__ == '__main__':
    main()
