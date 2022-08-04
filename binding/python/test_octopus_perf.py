#
# Copyright 2022 Picovoice Inc.
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
import time
import unittest

from octopus import *
from test_util import *
from util import *


class OctopusTestCase(unittest.TestCase):
    octopus = None

    @classmethod
    def setUpClass(cls):
        access_key = sys.argv[1]
        cls.num_test_iterations = int(sys.argv[2])
        cls.index_performance_threshold_sec = float(sys.argv[3])
        cls.search_performance_threshold_sec = float(sys.argv[4])
        cls.octopus = Octopus(
            access_key=access_key,
            library_path=pv_library_path('../..'),
            model_path=pv_model_path('../..', 'en'))

        cls.audio = read_wav_file(
            os.path.join(os.path.dirname(__file__), '../../res/audio/multiple_keywords.wav'),
            cls.octopus.sample_rate)

    @classmethod
    def tearDownClass(cls):
        if cls.octopus is not None:
            cls.octopus.delete()

    def test_index(self):
        perf_results = []
        for i in range(self.num_test_iterations):
            start = time.time()
            self.octopus.index_audio_data(self.audio)
            index_time = time.time() - start

            if i > 0:
                perf_results.append(index_time)

        avg_perf = sum(perf_results) / self.num_test_iterations
        print("Average index performance: %s" % avg_perf)
        self.assertLess(avg_perf, self.index_performance_threshold_sec)

    def test_search(self):
        metadata = self.octopus.index_audio_data(self.audio)

        perf_results = []
        for i in range(self.num_test_iterations):
            start = time.time()
            self.octopus.search(metadata, ['avocado'])
            index_time = time.time() - start

            if i > 0:
                perf_results.append(index_time)

        avg_perf = sum(perf_results) / self.num_test_iterations
        print("Average search performance: %s" % avg_perf)
        self.assertLess(avg_perf, self.search_performance_threshold_sec)


if __name__ == '__main__':
    print(sys.argv)
    if len(sys.argv) != 5:
        print("usage: test_octopus_perf.py ${ACCESS_KEY} ${NUM_TEST_INTERVALS} "
              "${INDEX_PERFORMANCE_THRESHOLD_SEC} ${SEARCH_PERFORMANCE_THRESHOLD_SEC}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
