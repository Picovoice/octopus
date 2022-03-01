/*
  Copyright 2021-2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

// @ts-ignore
import { Mutex } from 'async-mutex';

import { 
  aligned_alloc_type, 
  buildWasm,
  arrayBufferToStringAtIndex,
  isAccessKeyValid
} from '@picovoice/web-utils';

import type { OctopusEngine, OctopusMetadata, OctopusMatch } from '@picovoice/octopus-web-core';
import { OCTOPUS_WASM_BASE64 } from './octopus_b64';

/**
 * WebAssembly function types
 */

 type pv_octopus_version_type = () => Promise<number>;
 type pv_octopus_index_type = (
   object: number,
   pcm: number,
   numSamples: number,
   indices: number,
   numIndicesBytes: number
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
 type pv_octopus_init_type = (
   accessKey: number,
   object: number
) => Promise<number>
 type pv_status_to_string_type = (status: number) => Promise<number>;
 type pv_sample_rate_type = () => Promise<number>;

/**
 * JavaScript/WebAssembly Binding for the Picovoice Octopus Speech-To-Index engine.
 *
 * It initializes the WebAssembly module and exposes an async factory method `create` for creating
 * new instances of the engine.
 *
 * The instances have JavaScript bindings that wrap the calls to the C library and
 * do some rudimentary type checking and parameter validation.
 */

type OctopusWasmOutput = {
  memory: WebAssembly.Memory;
  alignedAlloc: aligned_alloc_type;
  objectAddress: number;
  pvOctopusDelete: pv_octopus_delete_type;
  pvOctopusIndex: pv_octopus_index_type;
  pvOctopusSearch: pv_octopus_search_type;
  pvStatusToString: pv_status_to_string_type;
  sampleRate: number;
  version: string;
  metadataAddressAddress: number;
  metadataLengthAddress: number;
  octopusMatchAddressAddress: number;
  octopusMatchLengthAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Octopus implements OctopusEngine {
  private _allignedAlloc: aligned_alloc_type;

  private _pvOctopusDelete: pv_octopus_delete_type;
  private _pvOctopusIndex: pv_octopus_index_type;
  private _pvOctopusSearch: pv_octopus_search_type;
  private _pvStatusToString: pv_status_to_string_type;

  private _wasmMemory: WebAssembly.Memory;
  private _memoryBufferView: DataView;
  private _processMutex: Mutex;

  private _objectAddress: number;
  private _metadataAddressAddress: number;
  private _metadataLengthAddress: number;
  private _octopusMatchAddressAddress: number;
  private _octopusMatchLengthAddress: number;

  private static _sampleRate: number;
  private static _version: string;
  private static _octopusMutex = new Mutex;

  private constructor(handleWasm: OctopusWasmOutput) {
    Octopus._sampleRate = handleWasm.sampleRate;
    Octopus._version = handleWasm.version;

    this._allignedAlloc = handleWasm.alignedAlloc;

    this._pvOctopusDelete = handleWasm.pvOctopusDelete;
    this._pvOctopusIndex = handleWasm.pvOctopusIndex;
    this._pvOctopusSearch = handleWasm.pvOctopusSearch;
    this._pvStatusToString = handleWasm.pvStatusToString;

    this._wasmMemory = handleWasm.memory;
    this._objectAddress = handleWasm.objectAddress;
    this._metadataAddressAddress = handleWasm.metadataAddressAddress;
    this._metadataLengthAddress = handleWasm.metadataLengthAddress;
    this._octopusMatchAddressAddress = handleWasm.octopusMatchAddressAddress;
    this._octopusMatchLengthAddress = handleWasm.octopusMatchLengthAddress;

    this._memoryBufferView = new DataView(handleWasm.memory.buffer);
    this._processMutex = new Mutex();
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvOctopusDelete(this._objectAddress);
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
      throw new Error("The argument 'pcm' must be provided as an Int16Array");
    }

    const returnPromise = new Promise<OctopusMetadata>((resolve, reject) => {
      this._processMutex.runExclusive(async () => {
        const pcmAddress = await this._allignedAlloc(
          Int16Array.BYTES_PER_ELEMENT,
          (pcm.length) * Int16Array.BYTES_PER_ELEMENT
        );

        const memoryBufferInt16 = new Int16Array(this._wasmMemory.buffer);
        memoryBufferInt16.set(pcm, pcmAddress / Int16Array.BYTES_PER_ELEMENT);

        const status = await this._pvOctopusIndex(
          this._objectAddress,
          pcmAddress,
          pcm.length,
          this._metadataAddressAddress,
          this._metadataLengthAddress
        );
        if (status !== PV_STATUS_SUCCESS) {
          const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
          throw new Error(
            `index failed with status ${arrayBufferToStringAtIndex(
              memoryBufferUint8,
              await this._pvStatusToString(status)
            )}`
          );
        }

        const metadataAddress = this._memoryBufferView.getInt32(
          this._metadataAddressAddress,
          true
        );

        const metadataLength = this._memoryBufferView.getInt32(
          this._metadataLengthAddress,
          true
        );

        return { metadataAddress, metadataLength };
      }).then((result: OctopusMetadata) => {
        resolve(result);
      }).catch((error: any) => {
        reject(error);
      });
    });
    return returnPromise;
  }

  /**
   * Searches metadata for a given search phrase.
   *
   * @param octopusMetadata - An octopus metadata object.
   * @param searchPhrase - The text phrase to search the metadata (indexed audio) for.
   * @return An array of OctopusMatch objects.
   */
  public async search(octopusMetadata: OctopusMetadata, searchPhrase: string): Promise<OctopusMatch[]> {
    const returnPromise = new Promise<OctopusMatch[]>((resolve, reject) => {
      this._processMutex.runExclusive(async () => {

        const searchPhraseCleaned = searchPhrase.trim();
        if (searchPhraseCleaned === '') {
          throw new Error('The search phrase cannot be empty');
        } else if (searchPhraseCleaned.replace(/\s/g, '').search(/[^A-Za-z' \s]/) !== -1) {
          throw new Error("Search phrases should only consist of alphabetic characters, apostrophes, and spaces:\n" +
            "\t12 >>> twelve\n" +
            "\t2021 >>> twenty twenty one\n" +
            "\tmother-in-law >>> mother in law\n" +
            "\t5-minute meeting >>> five minute meeting");
        }

        const phraseAddress = await this._allignedAlloc(
          Uint8Array.BYTES_PER_ELEMENT,
          (searchPhraseCleaned.length + 1) * Uint8Array.BYTES_PER_ELEMENT
        );

        if (phraseAddress === 0) {
          throw new Error('malloc failed: Cannot allocate memory');
        }

        const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
        for (let i = 0; i < searchPhraseCleaned.length; i++) {
          memoryBufferUint8[phraseAddress + i] = searchPhraseCleaned.charCodeAt(i);
        }
        memoryBufferUint8[phraseAddress + searchPhraseCleaned.length] = 0;

        const status = await this._pvOctopusSearch(
          this._objectAddress,
          octopusMetadata.metadataAddress,
          octopusMetadata.metadataLength,
          phraseAddress,
          this._octopusMatchAddressAddress,
          this._octopusMatchLengthAddress
        );
        if (status !== PV_STATUS_SUCCESS) {
          throw new Error(
            `search failed with status ${arrayBufferToStringAtIndex(
              memoryBufferUint8,
              await this._pvStatusToString(status)
            )}`
          );
        }

        const matches = [];
        const octopusMatchAddress = this._memoryBufferView.getInt32(this._octopusMatchAddressAddress, true);
        const octopusMatchLength = this._memoryBufferView.getInt32(this._octopusMatchLengthAddress, true);

        for (let i = 0; i < octopusMatchLength; i++) {
          const octopusMatch = octopusMatchAddress + i * (3 * Number(Float32Array.BYTES_PER_ELEMENT));

          const startSec = this._memoryBufferView.getFloat32(octopusMatch, true);
          const endSec = this._memoryBufferView.getFloat32(octopusMatch + 1 * Number(Float32Array.BYTES_PER_ELEMENT), true);
          const probability = this._memoryBufferView.getFloat32(octopusMatch + 2 * Number(Float32Array.BYTES_PER_ELEMENT), true);

          matches.push({
            startSec,
            endSec,
            probability
          });
        }

        return matches;
      }).then((result: OctopusMatch[]) => {
        resolve(result);
      }).catch((error: any) => {
        reject(error);
      });
    });
    return returnPromise;
  }

  get version(): string {
    return Octopus._version;
  }

  get sampleRate(): number {
    return Octopus._sampleRate;
  }

  /**
   * Creates an instance of the the Picovoice Octopus Speech-To-Index engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey - AccessKey generated by Picovoice Console (https://picovoice.ai/console/)
   *
   * @returns An instance of the Octopus engine.
   */
  public static async create(accessKey: string): Promise<Octopus> {
    if (!isAccessKeyValid(accessKey)) {
      throw new Error('Invalid AccessKey');
    }
    const returnPromise = new Promise<Octopus>((resolve, reject) => {
      Octopus._octopusMutex.runExclusive(async () => {
        const wasmOutput = await Octopus.initWasm(accessKey.trim());
        return new Octopus(wasmOutput);
      }).then((result: Octopus) => {
        resolve(result);
      }).catch((error: any) => {
        reject(error);
      });
    });
    return returnPromise;
  }

  private static async initWasm(accessKey: string): Promise<OctopusWasmOutput> {
    const memory = new WebAssembly.Memory({ initial: 100, maximum: 2000 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const exports = await buildWasm(memory, OCTOPUS_WASM_BASE64);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;

    const pv_octopus_version = exports.pv_octopus_version as pv_octopus_version_type;
    const pv_octopus_index = exports.pv_octopus_index as pv_octopus_index_type;
    const pv_octopus_search = exports.pv_octopus_search as pv_octopus_search_type;
    const pv_octopus_delete = exports.pv_octopus_delete as pv_octopus_delete_type;
    const pv_octopus_init = exports.pv_octopus_init as pv_octopus_init_type;
    const pv_status_to_string = exports.pv_status_to_string as pv_status_to_string_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;

    const metadataAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (metadataAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const metadataLengthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (metadataLengthAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const octopusMatchAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (octopusMatchAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const octopusMatchLengthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (octopusMatchLengthAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (objectAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (accessKeyAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }
    for (let i = 0; i < accessKey.length; i++) {
      memoryBufferUint8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    memoryBufferUint8[accessKeyAddress + accessKey.length] = 0;

    const status = await pv_octopus_init(accessKeyAddress, objectAddressAddress);
    if (status !== PV_STATUS_SUCCESS) {
      throw new Error(
        `'pv_octopus_init' failed with status ${arrayBufferToStringAtIndex(
          memoryBufferUint8,
          await pv_status_to_string(status)
        )}`
      );
    }

    const memoryBuffer = new Uint8Array(memory.buffer);
    const memoryBufferView = new DataView(memory.buffer);
    const objectAddress = memoryBufferView.getInt32(
      objectAddressAddress,
      true
    );

    const sampleRate = await pv_sample_rate();
    const versionAddress = await pv_octopus_version();
    const version = arrayBufferToStringAtIndex(
      memoryBuffer,
      versionAddress,
    );

    return {
      memory: memory,
      alignedAlloc: aligned_alloc,
      pvOctopusDelete: pv_octopus_delete,
      pvOctopusIndex: pv_octopus_index,
      pvOctopusSearch: pv_octopus_search,
      pvStatusToString: pv_status_to_string,
      sampleRate: sampleRate,
      version: version,
      objectAddress: objectAddress,
      metadataAddressAddress: metadataAddressAddress,
      metadataLengthAddress: metadataLengthAddress,
      octopusMatchAddressAddress: octopusMatchAddressAddress,
      octopusMatchLengthAddress: octopusMatchLengthAddress,
    };
  }
}

export default Octopus;
