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

import soundfile
import sys
import unittest

from octopus import Octopus, OctopusMetadata
from util import *


class OcotopusTestCase(unittest.TestCase):
    octopus = None
    search_term = 'avocado'

    @classmethod
    def setUpClass(cls):
        app_id = sys.argv[1]
        cls.octopus = Octopus(
            app_id=app_id,
            library_path=pv_library_path('../..'),
            model_path=pv_model_path('../..'))

        cls.path = os.path.join(os.path.dirname(__file__),
                                '../../res/audio/multiple_keywords.wav')
        cls.audio, sample_rate = soundfile.read(cls.path, dtype='int16')
        assert sample_rate == cls.octopus.pcm_sample_rate

    @classmethod
    def tearDownClass(cls):
        if cls.octopus is not None:
            cls.octopus.delete()

    def check_matches(self, matches):
        self.assertIn(self.search_term, matches)
        self.assertEqual(len(matches[self.search_term]), 1)

        match = matches[self.search_term][0]
        expected_match = Octopus.Match(
            start_sec=11.519995,
            end_sec=12.383999,
            probability=1.0)
        self.assertAlmostEqual(match.start_sec,
                               expected_match.start_sec,
                               places=5)
        self.assertAlmostEqual(match.end_sec,
                               expected_match.end_sec,
                               places=5)
        self.assertAlmostEqual(match.probability,
                               expected_match.probability,
                               places=5)

    def test_index(self):
        metadata = self.octopus.index_audio_data(self.audio)
        matches = self.octopus.search(metadata, [self.search_term])
        self.check_matches(matches)

    def test_index_file(self):
        metadata = self.octopus.index_audio_file(self.path)
        matches = self.octopus.search(metadata, [self.search_term])
        self.check_matches(matches)

    def test_to_from_bytes(self):
        original_metadata = self.octopus.index_audio_file(self.path)
        metadata_bytes = original_metadata.to_bytes()
        original_metadata.delete()

        metadata = OctopusMetadata.from_bytes(metadata_bytes)
        matches = self.octopus.search(metadata, [self.search_term])
        self.check_matches(matches)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_octopus.py ${APP_ID}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
