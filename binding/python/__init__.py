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

from .octopus import Octopus
from .octopus import OctopusActivationError
from .octopus import OctopusActivationLimitError
from .octopus import OctopusActivationRefusedError
from .octopus import OctopusActivationThrottledError
from .octopus import OctopusError
from .octopus import OctopusIOError
from .octopus import OctopusInvalidArgumentError
from .octopus import OctopusInvalidStateError
from .octopus import OctopusKeyError
from .octopus import OctopusMemoryError
from .octopus import OctopusMetadata
from .octopus import OctopusRuntimeError
from .octopus import OctopusStopIterationError
from .util import pv_library_path
from .util import pv_model_path

LIBRARY_PATH = pv_library_path('')

MODEL_PATH = pv_model_path('')


def create(access_key, library_path=None, model_path=None):
    """
    Factory method for Octopus Speech-to-Index engine.

    :param access_key: AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
    :param library_path: Absolute path to Octopus' dynamic library. If not set it will be set to the default
    location.
    :param model_path: Absolute path to the file containing model parameters. If not set it will be set to the default
    location.
    :return An instance of Octopus Speech-to-Index engine.
    """

    if library_path is None:
        library_path = LIBRARY_PATH

    if model_path is None:
        model_path = MODEL_PATH

    return Octopus(access_key=access_key, library_path=library_path, model_path=model_path)
