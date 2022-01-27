#
# Copyright 2021 Picovoice Inc.
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

import soundfile

from octopus import *
from util import *


class OctopusTestCase(unittest.TestCase):
    octopus = None
    search_term = 'avocado'
    path = None
    cached_file = 'original_metadata.oif'

    @classmethod
    def setUpClass(cls):
        app_id = sys.argv[1]
        cls.octopus = Octopus(
            access_key=app_id,
            library_path=pv_library_path('../..'),
            model_path=pv_model_path('../..'))

        cls.path = os.path.join(os.path.dirname(__file__), '../../res/audio/multiple_keywords.wav')
        cls.audio, sample_rate = soundfile.read(cls.path, dtype='int16')
        assert sample_rate == cls.octopus.pcm_sample_rate

    @classmethod
    def tearDownClass(cls):
        if cls.octopus is not None:
            cls.octopus.delete()

        if os.path.isfile(cls.cached_file):
            os.remove(cls.cached_file)

    def check_matches(self, matches):
        self.assertIn(self.search_term, matches)
        self.assertEqual(len(matches[self.search_term]), 1)

        match = matches[self.search_term][0]
        expected_match = Octopus.Match(start_sec=11.52, end_sec=12.38, probability=1.0)
        self.assertAlmostEqual(match.start_sec, expected_match.start_sec, places=1)
        self.assertAlmostEqual(match.end_sec, expected_match.end_sec, places=1)

    def test_index(self):
        metadata = self.octopus.index_audio_data(self.audio)
        matches = self.octopus.search(metadata, [self.search_term])
        self.check_matches(matches)

    def test_index_file(self):
        metadata = self.octopus.index_audio_file(self.path)
        matches = self.octopus.search(metadata, [self.search_term])
        self.check_matches(matches)

    def test_empty_search_phrase(self):
        metadata = self.octopus.index_audio_file(self.path)
        with self.assertRaises(OctopusInvalidArgumentError):
            self.octopus.search(metadata, [''])

    def test_whitespace_search_phrase(self):
        metadata = self.octopus.index_audio_file(self.path)
        with self.assertRaises(OctopusInvalidArgumentError):
            self.octopus.search(metadata, ['   '])

    def test_numeric_search_phrase(self):
        metadata = self.octopus.index_audio_file(self.path)
        with self.assertRaises(OctopusInvalidArgumentError):
            self.octopus.search(metadata, ['12'])

    def test_hyphen_in_search_phrase(self):
        metadata = self.octopus.index_audio_file(self.path)
        with self.assertRaises(OctopusInvalidArgumentError):
            self.octopus.search(metadata, ['real-time'])

    def test_invalid_search_phrase(self):
        metadata = self.octopus.index_audio_file(self.path)
        with self.assertRaises(OctopusInvalidArgumentError):
            self.octopus.search(metadata, ['@@!%$'])

    def test_index_with_spaces(self):
        metadata = self.octopus.index_audio_data(self.audio)
        search_term = ' americano   avocado    '
        normalized_search_term = 'americano avocado'
        matches = self.octopus.search(metadata, [search_term])
        self.assertIn(normalized_search_term, matches)
        self.assertEqual(len(matches[normalized_search_term]), 1)

        match = matches[normalized_search_term][0]
        expected_match = Octopus.Match(start_sec=9.47, end_sec=12.25, probability=.33)
        self.assertAlmostEqual(match.start_sec, expected_match.start_sec, places=1)
        self.assertAlmostEqual(match.end_sec, expected_match.end_sec, places=1)

    def test_to_from_bytes(self):
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
        self.assertIsInstance(self.octopus.version, str)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_octopus.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
