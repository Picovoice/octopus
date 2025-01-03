#
# Copyright 2021-2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import platform
from typing import Tuple


def _pv_platform() -> Tuple[str, str]:
    pv_system = platform.system()
    if pv_system not in {'Darwin', 'Linux', 'Windows'}:
        raise ValueError("Unsupported system '%s'." % pv_system)

    pv_machine = platform.machine()

    return pv_system, pv_machine


_PV_SYSTEM, _PV_MACHINE = _pv_platform()


def default_library_path(relative_path: str = '') -> str:
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


def default_model_path(relative_path: str = '') -> str:
    return os.path.join(
        os.path.dirname(__file__),
        relative_path,
        'lib/common/param/octopus_params.pv')


__all__ = [
    'default_library_path',
    'default_model_path',
]
