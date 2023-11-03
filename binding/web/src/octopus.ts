/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import { simd } from 'wasm-feature-detect';

import {
  aligned_alloc_type,
  arrayBufferToStringAtIndex,
  buildWasm,
  isAccessKeyValid,
  loadModel,
  pv_free_type,
  PvError,
} from '@picovoice/web-utils';

import {
  OctopusMatch,
  OctopusMetadata,
  OctopusModel,
  OctopusOptions,
  PvStatus,
} from './types';

import * as OctopusErrors from './octopus_errors';
import { pvStatusToException } from './octopus_errors';

/**
 * WebAssembly function types
 */

type pv_octopus_init_type = (
  accessKey: number,
  modelPath: number,
  object: number
) => Promise<number>;
type pv_octopus_index_size_type = (
  object: number,
  numSamples: number,
  numIndicesBytes: number
) => Promise<number>;
type pv_octopus_index_type = (
  object: number,
  pcm: number,
  numSamples: number,
  indices: number
) => Promise<number>;
type pv_octopus_search_type = (
  object: number,
  indices: number,
  numIndicesBytes: number,
  phrase: number,
  matches: number,
  numMatches: number
) => Promise<number>;
type pv_octopus_delete_type = (object: number) => Promise<void>;
type pv_octopus_matches_delete_type = (matches: number) => Promise<void>;
type pv_status_to_string_type = (status: number) => Promise<number>;
type pv_sample_rate_type = () => Promise<number>;
type pv_octopus_version_type = () => Promise<number>;
type pv_set_sdk_type = (sdk: number) => Promise<void>;
type pv_get_error_stack_type = (
  messageStack: number,
  messageStackDepth: number
) => Promise<number>;
type pv_free_error_stack_type = (messageStack: number) => Promise<void>;

/**
 * JavaScript/WebAssembly Binding for Octopus
 */

type OctopusWasmOutput = {
  memory: WebAssembly.Memory;
  alignedAlloc: aligned_alloc_type;
  pvFree: pv_free_type;
  pvOctopusDelete: pv_octopus_delete_type;
  pvOctopusMatchesDelete: pv_octopus_matches_delete_type;
  pvOctopusIndexSize: pv_octopus_index_size_type;
  pvOctopusIndex: pv_octopus_index_type;
  pvOctopusSearch: pv_octopus_search_type;
  pvStatusToString: pv_status_to_string_type;
  pvGetErrorStack: pv_get_error_stack_type;
  pvFreeErrorStack: pv_free_error_stack_type;
  sampleRate: number;
  version: string;
  objectAddress: number;
  metadataLengthAddress: number;
  octopusMatchAddressAddress: number;
  octopusMatchLengthAddress: number;
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;
  pvError: PvError;
};

const MAX_PCM_LENGTH_SEC = 60 * 15;

export class Octopus {
  private readonly _pvOctopusDelete: pv_octopus_delete_type;
  private readonly _pvOctopusMatchesDelete: pv_octopus_matches_delete_type;
  private readonly _pvOctopusIndexSize: pv_octopus_index_size_type;
  private readonly _pvOctopusIndex: pv_octopus_index_type;
  private readonly _pvOctopusSearch: pv_octopus_search_type;
  private readonly _pvStatusToString: pv_status_to_string_type;
  private readonly _pvGetErrorStack: pv_get_error_stack_type;
  private readonly _pvFreeErrorStack: pv_free_error_stack_type;

  private _wasmMemory?: WebAssembly.Memory;
  private _pvFree: pv_free_type;
  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _alignedAlloc: CallableFunction;
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;
  private readonly _metadataLengthAddress: number;
  private readonly _octopusMatchAddressAddress: number;
  private readonly _octopusMatchLengthAddress: number;

  private static _sampleRate: number;
  private static _version: string;
  private static _wasm: string;
  private static _wasmSimd: string;
  private static _sdk: string = 'web';

  private static _octopusMutex = new Mutex();

  private readonly _pvError = new PvError();

  private constructor(handleWasm: OctopusWasmOutput) {
    Octopus._sampleRate = handleWasm.sampleRate;
    Octopus._version = handleWasm.version;

    this._alignedAlloc = handleWasm.alignedAlloc;
    this._pvFree = handleWasm.pvFree;

    this._pvOctopusDelete = handleWasm.pvOctopusDelete;
    this._pvOctopusMatchesDelete = handleWasm.pvOctopusMatchesDelete;
    this._pvOctopusIndexSize = handleWasm.pvOctopusIndexSize;
    this._pvOctopusIndex = handleWasm.pvOctopusIndex;
    this._pvOctopusSearch = handleWasm.pvOctopusSearch;
    this._pvStatusToString = handleWasm.pvStatusToString;
    this._pvGetErrorStack = handleWasm.pvGetErrorStack;
    this._pvFreeErrorStack = handleWasm.pvFreeErrorStack;

    this._wasmMemory = handleWasm.memory;
    this._objectAddress = handleWasm.objectAddress;
    this._messageStackAddressAddressAddress =
      handleWasm.messageStackAddressAddressAddress;
    this._messageStackDepthAddress = handleWasm.messageStackDepthAddress;
    this._metadataLengthAddress = handleWasm.metadataLengthAddress;
    this._octopusMatchAddressAddress = handleWasm.octopusMatchAddressAddress;
    this._octopusMatchLengthAddress = handleWasm.octopusMatchLengthAddress;

    this._processMutex = new Mutex();

    this._pvError = handleWasm.pvError;
  }

  public static setSdk(sdk: string): void {
    Octopus._sdk = sdk;
  }

  /**
   * Get Octopus engine version.
   */
  get version(): string {
    return Octopus._version;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return Octopus._sampleRate;
  }

  /**
   * Set base64 wasm file.
   * @param wasm Base64'd wasm file to use to initialize wasm.
   */
  public static setWasm(wasm: string): void {
    if (this._wasm === undefined) {
      this._wasm = wasm;
    }
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Creates an instance of the Picovoice Octopus Speech-to-Text engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param model Octopus model options.
   * @param model.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `octopus` instances.
   * @param model.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param model.version Version of the model file. Increment to update the model file in storage.
   * @param options Optional configuration arguments.
   *
   * @returns An instance of the Octopus engine.
   */
  public static async create(
    accessKey: string,
    model: OctopusModel,
    options: OctopusOptions = {}
  ): Promise<Octopus> {
    const customWritePath = model.customWritePath
      ? model.customWritePath
      : 'octopus_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    return Octopus._init(accessKey, modelPath, options);
  }

  public static async _init(
    accessKey: string,
    modelPath: string,
    options: OctopusOptions = {}
  ): Promise<Octopus> {
    if (!isAccessKeyValid(accessKey)) {
      throw new OctopusErrors.OctopusInvalidArgumentError('Invalid AccessKey');
    }
    return new Promise<Octopus>((resolve, reject) => {
      Octopus._octopusMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          const wasmOutput = await Octopus.initWasm(
            accessKey.trim(),
            isSimd ? this._wasmSimd : this._wasm,
            modelPath,
            options
          );
          return new Octopus(wasmOutput);
        })
        .then((result: Octopus) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Processes multiple frames of audio samples. The required sample rate can be retrieved from '.sampleRate'.
   * The audio needs to bit 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm - A sample of audio with properties described above.
   * @return Octopus metadata object.
   */
  public async index(pcm: Int16Array): Promise<OctopusMetadata> {
    if (!(pcm instanceof Int16Array)) {
      throw new OctopusErrors.OctopusInvalidArgumentError(
        "The argument 'pcm' must be provided as an Int16Array"
      );
    }
    const maxSize = MAX_PCM_LENGTH_SEC * Octopus._sampleRate * 2;
    if (pcm.length > maxSize) {
      throw new OctopusErrors.OctopusInvalidArgumentError(
        `'pcm' size must be smaller than ${maxSize}`
      );
    }

    return new Promise<OctopusMetadata>((resolve, reject) => {
      this._processMutex
        .runExclusive(async () => {
          if (this._wasmMemory === undefined) {
            throw new OctopusErrors.OctopusInvalidStateError(
              'Attempted to call Octopus index after release.'
            );
          }

          const memoryBufferView = new DataView(this._wasmMemory.buffer);
          const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);

          let status = await this._pvOctopusIndexSize(
            this._objectAddress,
            pcm.length,
            this._metadataLengthAddress
          );
          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Octopus.getMessageStack(
              this._pvGetErrorStack,
              this._pvFreeErrorStack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              memoryBufferView,
              memoryBufferUint8
            );

            throw pvStatusToException(
              status,
              'Index size failed',
              messageStack
            );
          }

          const metadataLength = memoryBufferView.getInt32(
            this._metadataLengthAddress,
            true
          );

          const pcmAddress = await this._alignedAlloc(
            Int16Array.BYTES_PER_ELEMENT,
            pcm.length * Int16Array.BYTES_PER_ELEMENT
          );
          if (pcmAddress === 0) {
            throw new OctopusErrors.OctopusOutOfMemoryError(
              'malloc failed: Cannot allocate memory'
            );
          }
          const memoryBufferInt16 = new Int16Array(this._wasmMemory.buffer);
          memoryBufferInt16.set(pcm, pcmAddress / Int16Array.BYTES_PER_ELEMENT);

          const metadataAddress = await this._alignedAlloc(
            Uint8Array.BYTES_PER_ELEMENT,
            Uint8Array.BYTES_PER_ELEMENT * metadataLength
          );
          if (metadataAddress === 0) {
            throw new OctopusErrors.OctopusOutOfMemoryError(
              'malloc failed: Cannot allocate memory'
            );
          }

          status = await this._pvOctopusIndex(
            this._objectAddress,
            pcmAddress,
            pcm.length,
            metadataAddress
          );
          await this._pvFree(pcmAddress);
          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Octopus.getMessageStack(
              this._pvGetErrorStack,
              this._pvFreeErrorStack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              memoryBufferView,
              memoryBufferUint8
            );

            throw pvStatusToException(status, 'Index failed', messageStack);
          }

          const buffer = memoryBufferUint8.slice(
            metadataAddress / Uint8Array.BYTES_PER_ELEMENT,
            metadataAddress / Uint8Array.BYTES_PER_ELEMENT + metadataLength
          );
          await this._pvFree(metadataAddress);
          return { buffer };
        })
        .then((result: OctopusMetadata) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Searches metadata for a given search phrase.
   *
   * @param octopusMetadata - An octopus metadata object.
   * @param searchPhrase - The text phrase to search the metadata (indexed audio) for.
   * @return An array of OctopusMatch objects.
   */
  public async search(
    octopusMetadata: OctopusMetadata,
    searchPhrase: string
  ): Promise<OctopusMatch[]> {
    const searchPhraseCleaned = searchPhrase.trim();
    if (searchPhraseCleaned === '') {
      throw new OctopusErrors.OctopusInvalidArgumentError(
        'The search phrase cannot be empty'
      );
    }

    return new Promise<OctopusMatch[]>((resolve, reject) => {
      this._processMutex
        .runExclusive(async () => {
          if (this._wasmMemory === undefined) {
            throw new OctopusErrors.OctopusInvalidStateError(
              'Attempted to call Octopus search after release.'
            );
          }

          const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
          const memoryBufferView = new DataView(this._wasmMemory.buffer);

          const encoded = new TextEncoder().encode(searchPhraseCleaned);

          const phraseAddress = await this._alignedAlloc(
            Uint8Array.BYTES_PER_ELEMENT,
            (encoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT
          );
          if (phraseAddress === 0) {
            throw new OctopusErrors.OctopusOutOfMemoryError(
              'malloc failed: Cannot allocate memory'
            );
          }
          memoryBufferUint8.set(encoded, phraseAddress);
          memoryBufferUint8[phraseAddress + encoded.length] = 0;

          const metadataAddress = await this._alignedAlloc(
            Uint8Array.BYTES_PER_ELEMENT,
            octopusMetadata.buffer.length * Uint8Array.BYTES_PER_ELEMENT
          );
          if (metadataAddress === 0) {
            throw new OctopusErrors.OctopusOutOfMemoryError(
              'malloc failed: Cannot allocate memory'
            );
          }
          memoryBufferUint8.set(octopusMetadata.buffer, metadataAddress);

          const status = await this._pvOctopusSearch(
            this._objectAddress,
            metadataAddress,
            octopusMetadata.buffer.length,
            phraseAddress,
            this._octopusMatchAddressAddress,
            this._octopusMatchLengthAddress
          );
          await this._pvFree(phraseAddress);
          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Octopus.getMessageStack(
              this._pvGetErrorStack,
              this._pvFreeErrorStack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              memoryBufferView,
              memoryBufferUint8
            );

            throw pvStatusToException(status, 'Search failed', messageStack);
          }

          const matches: OctopusMatch[] = [];
          const octopusMatchAddress = memoryBufferView.getInt32(
            this._octopusMatchAddressAddress,
            true
          );
          const octopusMatchLength = memoryBufferView.getInt32(
            this._octopusMatchLengthAddress,
            true
          );

          for (let i = 0; i < octopusMatchLength; i++) {
            const octopusMatch =
              octopusMatchAddress +
              i * (3 * Number(Float32Array.BYTES_PER_ELEMENT));

            const startSec = memoryBufferView.getFloat32(octopusMatch, true);
            const endSec = memoryBufferView.getFloat32(
              octopusMatch + Number(Float32Array.BYTES_PER_ELEMENT),
              true
            );
            const probability = memoryBufferView.getFloat32(
              octopusMatch + 2 * Number(Float32Array.BYTES_PER_ELEMENT),
              true
            );

            matches.push({
              startSec,
              endSec,
              probability,
            });
          }

          await this._pvOctopusMatchesDelete(octopusMatchAddress);
          await this._pvFree(metadataAddress);

          return matches;
        })
        .then((result: OctopusMatch[]) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvOctopusDelete(this._objectAddress);
    delete this._wasmMemory;
    this._wasmMemory = undefined;
  }

  private static async initWasm(
    accessKey: string,
    wasmBase64: string,
    modelPath: string,
    _: OctopusOptions
  ): Promise<any> {
    // A WebAssembly page has a constant size of 64KiB. -> 1MiB ~= 16 pages
    const memory = new WebAssembly.Memory({ initial: 10240 });

    const memoryBufferView = new DataView(memory.buffer);
    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const pvError = new PvError();

    const exports = await buildWasm(memory, wasmBase64, pvError);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;
    const pv_free = exports.pv_free as pv_free_type;

    const pv_octopus_version =
      exports.pv_octopus_version as pv_octopus_version_type;
    const pv_octopus_index_size =
      exports.pv_octopus_index_size as pv_octopus_index_size_type;
    const pv_octopus_index = exports.pv_octopus_index as pv_octopus_index_type;
    const pv_octopus_search =
      exports.pv_octopus_search as pv_octopus_search_type;
    const pv_octopus_delete =
      exports.pv_octopus_delete as pv_octopus_delete_type;
    const pv_octopus_matches_delete =
      exports.pv_octopus_matches_delete as pv_octopus_matches_delete_type;
    const pv_octopus_init = exports.pv_octopus_init as pv_octopus_init_type;
    const pv_status_to_string =
      exports.pv_status_to_string as pv_status_to_string_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;
    const pv_set_sdk = exports.pv_set_sdk as pv_set_sdk_type;
    const pv_get_error_stack =
      exports.pv_get_error_stack as pv_get_error_stack_type;
    const pv_free_error_stack =
      exports.pv_free_error_stack as pv_free_error_stack_type;

    const metadataLengthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (metadataLengthAddress === 0) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const octopusMatchAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (octopusMatchAddressAddress === 0) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const octopusMatchLengthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (octopusMatchLengthAddress === 0) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (objectAddressAddress === 0) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (accessKeyAddress === 0) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    for (let i = 0; i < accessKey.length; i++) {
      memoryBufferUint8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    memoryBufferUint8[accessKeyAddress + accessKey.length] = 0;

    const encodedModelPath = new TextEncoder().encode(modelPath);
    const modelPathAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (encodedModelPath.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (modelPathAddress === 0) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    memoryBufferUint8.set(encodedModelPath, modelPathAddress);
    memoryBufferUint8[modelPathAddress + encodedModelPath.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (!sdkAddress) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    memoryBufferUint8.set(sdkEncoded, sdkAddress);
    memoryBufferUint8[sdkAddress + sdkEncoded.length] = 0;
    await pv_set_sdk(sdkAddress);

    const messageStackDepthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackDepthAddress) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const messageStackAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackAddressAddressAddress) {
      throw new OctopusErrors.OctopusOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const status = await pv_octopus_init(
      accessKeyAddress,
      modelPathAddress,
      objectAddressAddress
    );
    await pv_free(accessKeyAddress);
    await pv_free(modelPathAddress);
    if (status !== PvStatus.SUCCESS) {
      const messageStack = await Octopus.getMessageStack(
        pv_get_error_stack,
        pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        memoryBufferView,
        memoryBufferUint8
      );

      throw pvStatusToException(
        status,
        'Initialization failed',
        messageStack,
        pvError
      );
    }

    const objectAddress = memoryBufferView.getInt32(objectAddressAddress, true);
    await pv_free(objectAddressAddress);

    const sampleRate = await pv_sample_rate();
    const versionAddress = await pv_octopus_version();
    const version = arrayBufferToStringAtIndex(
      memoryBufferUint8,
      versionAddress
    );

    return {
      memory: memory,
      alignedAlloc: aligned_alloc,
      pvFree: pv_free,
      pvOctopusDelete: pv_octopus_delete,
      pvOctopusMatchesDelete: pv_octopus_matches_delete,
      pvOctopusIndexSize: pv_octopus_index_size,
      pvOctopusIndex: pv_octopus_index,
      pvOctopusSearch: pv_octopus_search,
      pvStatusToString: pv_status_to_string,
      pvGetErrorStack: pv_get_error_stack,
      pvFreeErrorStack: pv_free_error_stack,
      sampleRate: sampleRate,
      version: version,
      objectAddress: objectAddress,
      metadataLengthAddress: metadataLengthAddress,
      octopusMatchAddressAddress: octopusMatchAddressAddress,
      octopusMatchLengthAddress: octopusMatchLengthAddress,
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,
      pvError: pvError,
    };
  }

  private static async getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferView: DataView,
    memoryBufferUint8: Uint8Array
  ): Promise<string[]> {
    const status = await pv_get_error_stack(
      messageStackAddressAddressAddress,
      messageStackDepthAddress
    );
    if (status !== PvStatus.SUCCESS) {
      throw pvStatusToException(status, 'Unable to get Octopus error state');
    }

    const messageStackAddressAddress = memoryBufferView.getInt32(
      messageStackAddressAddressAddress,
      true
    );

    const messageStackDepth = memoryBufferView.getInt32(
      messageStackDepthAddress,
      true
    );
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferView.getInt32(
        messageStackAddressAddress + i * Int32Array.BYTES_PER_ELEMENT,
        true
      );
      const message = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        messageStackAddress
      );
      messageStack.push(message);
    }

    await pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }
}
