#
# Copyright 2021-2023 Picovoice Inc.
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
from collections import namedtuple
from ctypes import *
from enum import Enum
from typing import Dict, Iterable, Sequence


class OctopusError(Exception):
    def __init__(self, message: str = '', message_stack: Sequence[str] = None):
        super().__init__(message)

        self._message = message
        self._message_stack = list() if message_stack is None else message_stack

    def __str__(self):
        message = self._message
        if len(self._message_stack) > 0:
            message += ':'
            for i in range(len(self._message_stack)):
                message += '\n  [%d] %s' % (i, self._message_stack[i])
        return message

    @property
    def message(self) -> str:
        return self._message

    @property
    def message_stack(self) -> Sequence[str]:
        return self._message_stack


class OctopusMemoryError(OctopusError):
    pass


class OctopusIOError(OctopusError):
    pass


class OctopusInvalidArgumentError(OctopusError):
    pass


class OctopusStopIterationError(OctopusError):
    pass


class OctopusKeyError(OctopusError):
    pass


class OctopusInvalidStateError(OctopusError):
    pass


class OctopusRuntimeError(OctopusError):
    pass


class OctopusActivationError(OctopusError):
    pass


class OctopusActivationLimitError(OctopusError):
    pass


class OctopusActivationThrottledError(OctopusError):
    pass


class OctopusActivationRefusedError(OctopusError):
    pass


class OctopusMetadata(object):
    """
    Python representation of the metadata object.
    """

    def __init__(self, handle: c_void_p, size: int) -> None:
        self._handle = handle
        self._size = size

    @property
    def handle(self) -> c_void_p:
        return self._handle

    @property
    def size(self) -> int:
        return self._size

    def to_bytes(self) -> bytes:
        return self._to_bytes(self.handle, self.size)

    @classmethod
    def from_bytes(cls, metadata_bytes: bytes) -> 'OctopusMetadata':
        byte_ptr = (c_byte * len(metadata_bytes)).from_buffer_copy(metadata_bytes)
        handle = cast(byte_ptr, c_void_p)
        return cls(handle=handle, size=len(metadata_bytes))

    @staticmethod
    def _to_bytes(ptr: c_void_p, size: int) -> bytes:
        # noinspection PyTypeChecker
        return bytes(cast(ptr, POINTER(c_byte * size)).contents)


class Octopus(object):
    """
    Python binding for Octopus Speech-to-Index engine.
    """

    class PicovoiceStatuses(Enum):
        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6
        RUNTIME_ERROR = 7
        ACTIVATION_ERROR = 8
        ACTIVATION_LIMIT_REACHED = 9
        ACTIVATION_THROTTLED = 10
        ACTIVATION_REFUSED = 11

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: OctopusMemoryError,
        PicovoiceStatuses.IO_ERROR: OctopusIOError,
        PicovoiceStatuses.INVALID_ARGUMENT: OctopusInvalidArgumentError,
        PicovoiceStatuses.STOP_ITERATION: OctopusStopIterationError,
        PicovoiceStatuses.KEY_ERROR: OctopusKeyError,
        PicovoiceStatuses.INVALID_STATE: OctopusInvalidStateError,
        PicovoiceStatuses.RUNTIME_ERROR: OctopusRuntimeError,
        PicovoiceStatuses.ACTIVATION_ERROR: OctopusActivationError,
        PicovoiceStatuses.ACTIVATION_LIMIT_REACHED: OctopusActivationLimitError,
        PicovoiceStatuses.ACTIVATION_THROTTLED: OctopusActivationThrottledError,
        PicovoiceStatuses.ACTIVATION_REFUSED: OctopusActivationRefusedError
    }

    class COctopus(Structure):
        pass

    def __init__(
            self,
            access_key: str,
            model_path: str,
            library_path: str) -> None:
        """
        Constructor.

        :param access_key: AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
        :param model_path: Absolute path to file containing model parameters.
        :param library_path: Absolute path to Octopus' dynamic library.
        """

        if not isinstance(access_key, str) or len(access_key) == 0:
            raise OctopusInvalidArgumentError("`access_key` should be a non-empty string.")

        if not os.path.exists(model_path):
            raise OctopusIOError("Couldn't find model file at `%s`." % model_path)

        if not os.path.exists(library_path):
            raise OctopusIOError("Couldn't find dynamic library at '%s'." % library_path)

        library = cdll.LoadLibrary(library_path)

        set_sdk_func = library.pv_set_sdk
        set_sdk_func.argtypes = [c_char_p]
        set_sdk_func.restype = None

        set_sdk_func('python'.encode('utf-8'))

        self._get_error_stack_func = library.pv_get_error_stack
        self._get_error_stack_func.argtypes = [POINTER(POINTER(c_char_p)), POINTER(c_int)]
        self._get_error_stack_func.restype = self.PicovoiceStatuses

        self._free_error_stack_func = library.pv_free_error_stack
        self._free_error_stack_func.argtypes = [POINTER(c_char_p)]
        self._free_error_stack_func.restype = None

        init_func = library.pv_octopus_init
        init_func.argtypes = [c_char_p, c_char_p, POINTER(POINTER(self.COctopus))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.COctopus)()

        status = init_func(
            access_key.encode('utf-8'),
            model_path.encode('utf-8'),
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Initialization failed',
                message_stack=self._get_error_stack())

        self._delete_func = library.pv_octopus_delete
        self._delete_func.argtypes = [POINTER(self.COctopus)]
        self._delete_func.restype = None

        self._index_size_func = library.pv_octopus_index_size
        self._index_size_func.argtypes = [
            POINTER(self.COctopus),
            c_int32,
            POINTER(c_int32)]
        self._index_size_func.restype = self.PicovoiceStatuses

        self._index_func = library.pv_octopus_index
        self._index_func.argtypes = [
            POINTER(self.COctopus),
            POINTER(c_short),
            c_int32,
            c_void_p]
        self._index_func.restype = self.PicovoiceStatuses

        self._index_file_size_func = library.pv_octopus_index_file_size
        self._index_file_size_func.argtypes = [
            POINTER(self.COctopus),
            c_char_p,
            POINTER(c_int32)]
        self._index_file_size_func.restype = self.PicovoiceStatuses

        self._index_file_func = library.pv_octopus_index_file
        self._index_file_func.argtypes = [
            POINTER(self.COctopus),
            c_char_p,
            c_void_p]
        self._index_file_func.restype = self.PicovoiceStatuses

        self._search_func = library.pv_octopus_search
        self._search_func.argtypes = [
            POINTER(self.COctopus),
            c_void_p,
            c_int32,
            c_char_p,
            POINTER(POINTER(self.CMatch)),
            POINTER(c_int32)]
        self._search_func.restype = self.PicovoiceStatuses

        self._matches_delete_func = library.pv_octopus_matches_delete
        self._matches_delete_func.argtypes = [POINTER(self.CMatch)]
        self._matches_delete_func.restype = None

        version_func = library.pv_octopus_version
        version_func.argtypes = []
        version_func.restype = c_char_p
        self._version = version_func().decode('utf-8')

        self._sample_rate = library.pv_sample_rate()

    def delete(self) -> None:
        """Releases resources acquired by Octopus."""

        self._delete_func(self._handle)

    def index_audio_data(self, pcm: Sequence[int]) -> OctopusMetadata:
        """
        Indexes audio data.

        :param pcm: Audio data. The audio needs to have a sample rate equal to `.sample_rate` and be 16-bit
        linearly-encoded. Octopus operates on single-channel audio.
        :return metadata: An immutable metadata object.
        """

        metadata_size = c_int32()
        status = self._index_size_func(
            self._handle,
            c_int32(len(pcm)),
            byref(metadata_size))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Index size failed',
                message_stack=self._get_error_stack())

        metadata_bytes = create_string_buffer(metadata_size.value)
        metadata_bytes_ptr = cast(metadata_bytes, c_void_p)
        status = self._index_func(
            self._handle,
            (c_short * len(pcm))(*pcm),
            c_int32(len(pcm)),
            metadata_bytes_ptr)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Index failed',
                message_stack=self._get_error_stack())

        return OctopusMetadata(metadata_bytes_ptr, metadata_size.value)

    def index_audio_file(self, path: str) -> OctopusMetadata:
        """
        Indexes audio file.

        :param path: Absolute path to the audio file.
        :return metadata: An immutable metadata object.
        """

        if not os.path.exists(path):
            raise OctopusIOError("Couldn't find input file at `%s`." % path)

        metadata_size = c_int32()
        status = self._index_file_size_func(
            self._handle,
            path.encode('utf-8'),
            byref(metadata_size))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Index file size failed',
                message_stack=self._get_error_stack())

        metadata_bytes = create_string_buffer(metadata_size.value)
        metadata_bytes_ptr = cast(metadata_bytes, c_void_p)
        status = self._index_file_func(
            self._handle,
            path.encode('utf-8'),
            metadata_bytes)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Index file failed',
                message_stack=self._get_error_stack())

        return OctopusMetadata(metadata_bytes_ptr, metadata_size.value)

    Match = namedtuple('Match', ['start_sec', 'end_sec', 'probability'])

    class CMatch(Structure):
        _fields_ = [
            ("start_sec", c_float),
            ("end_sec", c_float),
            ("probability", c_float)]

    def search(self, metadata: OctopusMetadata, phrases: Iterable[str]) -> Dict[str, Sequence[Match]]:
        """
        Searches metadata for occurrences of given phrases.

        :param metadata: Metadata object.
        :param phrases: An iterable of phrases to search the index for.
        :return matches: A dictionary map of found matches.
        """

        phrases_set = set(' '.join(x.strip().split()) for x in phrases)

        if any(len(x) == 0 for x in phrases_set):
            raise OctopusInvalidArgumentError("Search phrase cannot be empty")

        matches = dict()

        for phrase in phrases_set:
            c_phrase_matches = POINTER(self.CMatch)()
            num_phrase_matches = c_int32()
            status = self._search_func(
                self._handle,
                metadata.handle,
                metadata.size,
                phrase.encode('utf-8'),
                byref(c_phrase_matches),
                byref(num_phrase_matches))
            if status is not self.PicovoiceStatuses.SUCCESS:
                raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                    message='Search failed',
                    message_stack=self._get_error_stack())
            if num_phrase_matches.value > 0:
                phrase_matches = list()
                for i in range(num_phrase_matches.value):
                    match = self.Match(
                        start_sec=c_phrase_matches[i].start_sec,
                        end_sec=c_phrase_matches[i].end_sec,
                        probability=c_phrase_matches[i].probability)
                    phrase_matches.append(match)
                matches[phrase] = phrase_matches
            self._matches_delete_func(c_phrase_matches)

        return matches

    @property
    def version(self) -> str:
        """Version."""

        return self._version

    @property
    def sample_rate(self) -> int:
        """Audio sample rate accepted by `.index_audio_data`."""

        return self._sample_rate

    def _get_error_stack(self) -> Sequence[str]:
        message_stack_ref = POINTER(c_char_p)()
        message_stack_depth = c_int()
        status = self._get_error_stack_func(byref(message_stack_ref), byref(message_stack_depth))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](message='Unable to get Porcupine error state')

        message_stack = list()
        for i in range(message_stack_depth.value):
            message_stack.append(message_stack_ref[i].decode('utf-8'))

        self._free_error_stack_func(message_stack_ref)

        return message_stack


__all__ = [
    'OctopusError',
    'OctopusMemoryError',
    'OctopusIOError',
    'OctopusInvalidArgumentError',
    'OctopusStopIterationError',
    'OctopusKeyError',
    'OctopusInvalidStateError',
    'OctopusRuntimeError',
    'OctopusActivationError',
    'OctopusActivationLimitError',
    'OctopusActivationThrottledError',
    'OctopusActivationRefusedError',
    'OctopusMetadata',
    'Octopus',
]
