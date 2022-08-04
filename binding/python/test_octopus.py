#
# Copyright 2021-2022 Picovoice Inc.
#
# You may not use this file except in compliance with the license.
# A copy of the license is located in the "LICENSE" file accompanying this
# source.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import os
import sys
import unittest
from typing import *

from parameterized import parameterized

from octopus import *
from test_util import *
from util import *

INDEX_PARAMS = [
    ["en", {"alexa": [(7.648, 8.352, 1)], "porcupine": [(5.728, 6.752, 1), (35.360, 36.416, 1)]}],
    ["de", {"ananas": [(0.000, 0.704, 0.954)]}],
    ["es", {"manzana": [(5.184, 5.984, 1)]}],
    ["fr", {"perroquet": [(4.352, 5.184, 0.952)]}],
    ["it", {"porcospino": [(0.480, 1.728, 1)]}],
    ["ja", {"りんご": [(0.960, 1.664, 1)]}],
    ["ko", {"아이스크림": [(6.592, 7.520, 0.961)]}],
    ["pt", {"porco espinho": [(0.480, 1.792, 1)]}],
]


class OctopusTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]

    @parameterized.expand(INDEX_PARAMS)
    def test_index_xx(self, language: str, phrase_occurrences: Dict[str, Sequence[Tuple[float, float, float]]]):
        octopus = None

        try:
            octopus = Octopus(
                access_key=self._access_key,
                library_path=pv_library_path('../..'),
                model_path=pv_model_path('../..', language))

            audio_path = os.path.join(
                os.path.dirname(__file__),
                '../../res/audio/multiple_keywords%s.wav' % ('' if language == 'en' else ('_' + language)))
            metadata = octopus.index_audio_data(read_wav_file(audio_path, octopus.pcm_sample_rate))
            phrase_matches = octopus.search(metadata, list(phrase_occurrences.keys()))
            for phrase, occurrences in phrase_occurrences.items():
                self.assertIn(phrase, phrase_matches)
                self.assertEqual(len(phrase_matches[phrase]), len(occurrences))
                for match, occurrence in zip(phrase_matches[phrase], occurrences):
                    self.assertAlmostEqual(match.start_sec, occurrence[0], delta=0.01)
                    self.assertAlmostEqual(match.end_sec, occurrence[1], delta=0.01)
                    self.assertAlmostEqual(match.probability, occurrence[2], delta=0.1)
        finally:
            if octopus is not None:
                octopus.delete()

    @parameterized.expand(INDEX_PARAMS)
    def _test_index_file_xx(self, language: str, phrase_occurrences: Dict[str, Sequence[Tuple[float, float, float]]]):
        octopus = None

        try:
            octopus = Octopus(
                access_key=self._access_key,
                library_path=pv_library_path('../..'),
                model_path=pv_model_path('../..', language))

            audio_path = os.path.join(
                os.path.dirname(__file__),
                '../../res/audio/multiple_keywords%s.wav' % ('' if language == 'en' else ('_' + language)))
            metadata = octopus.index_audio_file(audio_path)
            phrase_matches = octopus.search(metadata, list(phrase_occurrences.keys()))
            for phrase, occurrences in phrase_occurrences.items():
                self.assertIn(phrase, phrase_matches)
                self.assertEqual(len(phrase_matches[phrase]), len(occurrences))
                for match, occurrence in zip(phrase_matches[phrase], occurrences):
                    self.assertAlmostEqual(match.start_sec, occurrence[0], delta=0.01)
                    self.assertAlmostEqual(match.end_sec, occurrence[1], delta=0.01)
                    self.assertAlmostEqual(match.probability, occurrence[2], delta=0.1)
        finally:
            if octopus is not None:
                octopus.delete()

    # def test_empty_search_phrase(self):
    #     metadata = self.octopus.index_audio_file(self.path)
    #     with self.assertRaises(OctopusInvalidArgumentError):
    #         self.octopus.search(metadata, [''])
    #
    # def test_whitespace_search_phrase(self):
    #     metadata = self.octopus.index_audio_file(self.path)
    #     with self.assertRaises(OctopusInvalidArgumentError):
    #         self.octopus.search(metadata, ['   '])
    #
    # def test_numeric_search_phrase(self):
    #     metadata = self.octopus.index_audio_file(self.path)
    #     with self.assertRaises(OctopusInvalidArgumentError):
    #         self.octopus.search(metadata, ['12'])
    #
    # def test_hyphen_in_search_phrase(self):
    #     metadata = self.octopus.index_audio_file(self.path)
    #     with self.assertRaises(OctopusInvalidArgumentError):
    #         self.octopus.search(metadata, ['real-time'])
    #
    # def test_invalid_search_phrase(self):
    #     metadata = self.octopus.index_audio_file(self.path)
    #     with self.assertRaises(OctopusInvalidArgumentError):
    #         self.octopus.search(metadata, ['@@!%$'])
    #
    # def test_index_with_spaces(self):
    #     metadata = self.octopus.index_audio_data(self.audio)
    #     search_term = ' americano   avocado    '
    #     normalized_search_term = 'americano avocado'
    #     matches = self.octopus.search(metadata, [search_term])
    #     self.assertIn(normalized_search_term, matches)
    #     self.assertEqual(len(matches[normalized_search_term]), 1)
    #
    #     match = matches[normalized_search_term][0]
    #     expected_match = Octopus.Match(start_sec=9.47, end_sec=12.25, probability=.33)
    #     self.assertAlmostEqual(match.start_sec, expected_match.start_sec, places=1)
    #     self.assertAlmostEqual(match.end_sec, expected_match.end_sec, places=1)

        # octopus = None
        #
        # try:
        #     octopus = Octopus(
        #         access_key=self._access_key,
        #         library_path=pv_library_path('../..'),
        #         model_path=pv_model_path('../..', 'en'))
        # finally:
        #     if octopus is not None:
        #         octopus.delete()

    @staticmethod
    def _audio_path(language: str) -> str:
        return os.path.join(
            os.path.dirname(__file__),
            '../../res/audio/multiple_keywords%s.wav' % ('' if language == 'en' else ('_' + language)))

    def test_to_from_bytes(self):
        octopus = None

        try:
            octopus = Octopus(
                access_key=self._access_key,
                library_path=pv_library_path('../..'),
                model_path=pv_model_path('../..', 'en'))
            original_metadata = octopus.index_audio_file(self._audio_path('en'))
            metadata_bytes = original_metadata.to_bytes()

            metadata = OctopusMetadata.from_bytes(metadata_bytes)
            matches = octopus.search(metadata, [self.search_term])
            self.check_matches(matches)
        finally:
            if octopus is not None:
                octopus.delete()

        original_metadata = self.octopus.index_audio_file(self.path)
        metadata_bytes = original_metadata.to_bytes()

        metadata = OctopusMetadata.from_bytes(metadata_bytes)
        matches = self.octopus.search(metadata, [self.search_term])
        self.check_matches(matches)

    def test_to_from_bytes_file(self):
        original_metadata = self.octopus.index_audio_file(self.path)
        with open(self.cached_file, 'wb') as f:
            f.write(original_metadata.to_bytes())

        with open(self.cached_file, 'rb') as f:
            metadata = OctopusMetadata.from_bytes(f.read())

        matches = self.octopus.search(metadata, [self.search_term])
        self.check_matches(matches)

    def test_version(self):
        octopus = None

        try:
            octopus = Octopus(
                access_key=self._access_key,
                library_path=pv_library_path('../..'),
                model_path=pv_model_path('../..', 'en'))
            self.assertIsInstance(octopus.version, str)
        finally:
            if octopus is not None:
                octopus.delete()


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_octopus.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
