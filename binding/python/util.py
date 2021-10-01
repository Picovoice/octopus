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

import logging
import os
import platform

log = logging.getLogger('OCT')
log.setLevel(logging.WARNING)


def _pv_platform():
    pv_system = platform.system()
    if pv_system not in {'Darwin', 'Linux', 'Windows'}:
        raise ValueError(f"Unsupported system '{pv_system}'.")

    pv_machine = platform.machine()

    return pv_system, pv_machine


_PV_SYSTEM, _PV_MACHINE = _pv_platform()


def pv_library_path(relative_path):
    if _PV_SYSTEM == 'Darwin':
        if _PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/mac/x86_64/libpv_octopus.dylib')
        elif _PV_MACHINE == "arm64":
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/mac/arm64/libpv_octopus.dylib')
    elif _PV_SYSTEM == 'Linux':
        if _PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/linux/x86_64/libpv_octopus.so')
    elif _PV_SYSTEM == 'Windows':
        return os.path.join(os.path.dirname(__file__), relative_path, 'lib/windows/amd64/libpv_octopus.dll')

    raise NotImplementedError('Unsupported platform.')


def pv_model_path(relative_path):
    return os.path.join(os.path.dirname(__file__), relative_path, 'lib/common/octopus_params.pv')
