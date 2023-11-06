#
# Copyright 2022-2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import struct
import wave
from typing import Sequence


def read_wav_file(file_name: str, sample_rate: int) -> Sequence[int]:
    wav_file = wave.open(file_name, mode="rb")
    channels = wav_file.getnchannels()
    num_frames = wav_file.getnframes()

    if wav_file.getframerate() != sample_rate:
        raise ValueError(
            "Audio file should have a sample rate of %d, got %d" % (sample_rate, wav_file.getframerate()))

    samples = wav_file.readframes(num_frames)
    wav_file.close()

    frames = struct.unpack('h' * num_frames * channels, samples)

    if channels == 2:
        print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")

    return frames[::channels]


def get_audio_path_by_language(relative: str, language: str = 'en') -> str:
    audio_file_path = 'res/audio/multiple_keywords%s.wav' % ('' if language == 'en' else ('_' + language))
    return os.path.join(
        os.path.dirname(__file__),
        relative,
        audio_file_path)


def get_model_path_by_language(relative: str, language: str = 'en'):
    model_file_path = 'lib/common/param/octopus_params%s.pv' % ('' if language == 'en' else ('_%s' % language))
    return os.path.join(
        os.path.dirname(__file__),
        relative,
        model_file_path)


__all__ = [
    'get_audio_path_by_language',
    'get_model_path_by_language',
    'read_wav_file'
]
