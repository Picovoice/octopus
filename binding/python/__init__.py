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

from .octopus import Octopus, OctopusMetadata
from .util import *

LIBRARY_PATH = pv_library_path('')

MODEL_PATH = pv_model_path('')


def create(app_id, library_path=None, model_path=None):
    """
    Factory method for Octopus Speech-to-Index engine.

    :param app_id: AppID provided by Picovoice Console (https://picovoice.ai/console/)
    :param library_path: Absolute path to Octopus' dynamic library. If not set it will be set to the default
    location.
    :param model_path: Absolute path to the file containing model parameters. If not set it will be set to the default
    location.
    :return An instance of Ocotopus Speech-to-Index engine.
    """

    if library_path is None:
        library_path = LIBRARY_PATH

    if model_path is None:
        model_path = MODEL_PATH

    return Octopus(app_id=app_id, library_path=library_path, model_path=model_path)
