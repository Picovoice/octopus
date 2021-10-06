/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

// @ts-ignore
import * as Asyncify from 'asyncify-wasm';

import type { OctopusEngine, OctopusMetadata, OctopusMatch } from './octopus_types';
import { OCTOPUS_WASM_BASE64 } from './octopus_b64';
import { wasiSnapshotPreview1Emulator } from './wasi_snapshot';

import {
  arrayBufferToStringAtIndex,
  base64ToUint8Array,
  fetchWithTimeout,
  stringHeaderToObject,
} from './utils';

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
  alignedAlloc: CallableFunction;
  objectAddress: number;
  pvOctopusDelete: CallableFunction;
  pvOctopusIndex: CallableFunction;
  pvOctopusSearch: CallableFunction;
  pvStatusToString: CallableFunction;
  sampleRate: number;
  version: string;
  metadataAddressAddress: number;
  metadataLengthAddress: number;
  octopusMatchAddressAddress: number;
  octopusMatchLengthAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Octopus implements OctopusEngine {
  private _allignedAlloc: CallableFunction;

  private _pvOctopusDelete: CallableFunction;
  private _pvOctopusIndex: CallableFunction;
  private _pvOctopusSearch: CallableFunction;
  private _pvStatusToString: CallableFunction;

  private _wasmMemory: WebAssembly.Memory;
  private _memoryBufferView: DataView;

  private _objectAddress: number;
  private _metadataAddressAddress: number;
  private _metadataLengthAddress: number;
  private _octopusMatchAddressAddress: number;
  private _octopusMatchLengthAddress: number;

  private static _sampleRate: number;
  private static _version: string;

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

    const pcmAddress = await this._allignedAlloc(
      Int16Array.BYTES_PER_ELEMENT,
      (pcm.length) * Int16Array.BYTES_PER_ELEMENT
    );

    const memoryBuffer = new Int16Array(this._wasmMemory.buffer);
    memoryBuffer.set(pcm, pcmAddress / Int16Array.BYTES_PER_ELEMENT);

    const status = await this._pvOctopusIndex(
      this._objectAddress,
      pcmAddress,
      pcm.length,
      this._metadataAddressAddress,
      this._metadataLengthAddress
    );
    if (status !== PV_STATUS_SUCCESS) {
      const memoryBuffer = new Uint8Array(this._wasmMemory.buffer);
      throw new Error(
        `index failed with status ${arrayBufferToStringAtIndex(
          memoryBuffer,
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

    return {metadataAddress, metadataLength};
  }

  /**
   * Searches metadata for a given search phrase.
   *
   * @param octopusMetadata - An octopus metadata object.
   * @param searchPhrase - The text phrase to search the metadata (indexed audio) for.
   * @return An array of OctopusMatch objects.
   */
  public async search(octopusMetadata: OctopusMetadata, searchPhrase: string): Promise<OctopusMatch[]> {
    const phraseAddress = await this._allignedAlloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (searchPhrase.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );

    if (phraseAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const memoryBuffer = new Uint8Array(this._wasmMemory.buffer);
    for (let i = 0; i < searchPhrase.length; i++) {
      memoryBuffer[phraseAddress + i] = searchPhrase.charCodeAt(i);
    }
    memoryBuffer[phraseAddress + searchPhrase.length] = 0;

    const status = await this._pvOctopusSearch(
      this._objectAddress,
      octopusMetadata.metadataAddress,
      octopusMetadata.metadataLength,
      phraseAddress,
      this._octopusMatchAddressAddress,
      this._octopusMatchLengthAddress
    );
    if (status !== PV_STATUS_SUCCESS) {
      const memoryBuffer = new Uint8Array(this._wasmMemory.buffer);
      throw new Error(
        `search failed with status ${arrayBufferToStringAtIndex(
          memoryBuffer,
          await this._pvStatusToString(status)
        )}`
      );
    }

    const matches = [];
    const octopusMatchAddress = this._memoryBufferView.getInt32(this._octopusMatchAddressAddress, true);
    const octopusMatchLength = this._memoryBufferView.getInt32(this._octopusMatchLengthAddress, true);

    for (let i = 0; i < octopusMatchLength; i++) {
      const octopusMatch = octopusMatchAddress + i * (3 * Float32Array.BYTES_PER_ELEMENT);

      const startSec = this._memoryBufferView.getFloat32(octopusMatch, true);
      const endSec = this._memoryBufferView.getFloat32(octopusMatch + 1 * Float32Array.BYTES_PER_ELEMENT, true);
      const probability = this._memoryBufferView.getFloat32(octopusMatch + 2 * Float32Array.BYTES_PER_ELEMENT, true);

      matches.push({
        startSec,
        endSec,
        probability
      });
    }

    return matches;
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
    const wasmOutput = await Octopus.initWasm(accessKey);
    return new Octopus(wasmOutput);
  }

  private static async initWasm(accessKey: string): Promise<OctopusWasmOutput> {
    const memory = new WebAssembly.Memory({ initial: 100, maximum: 2000 });

    const pvConsoleLogWasm = function (index: number): void {
      const memoryBufferUint8 = new Uint8Array(memory.buffer);
      // eslint-disable-next-line no-console
      console.log(arrayBufferToStringAtIndex(memoryBufferUint8, index));
    };

    const pvAssertWasm = function (
      expr: number,
      line: number,
      fileNameAddress: number
    ): void {
      if (expr === 0) {
        const memoryBufferUint8 = new Uint8Array(memory.buffer);
        const fileName = arrayBufferToStringAtIndex(
          memoryBufferUint8,
          fileNameAddress
        );
        throw new Error(`assertion failed at line ${line} in "${fileName}"`);
      }
    };

    const pvTimeWasm = function (): number {
      return Date.now() / 1000;
    };

    const pvHttpsRequestWasm = async function (
      httpMethodAddress: number,
      serverNameAddress: number,
      endpointAddress: number,
      headerAddress: number,
      bodyAddress: number,
      timeoutMs: number,
      responseAddressAddress: number,
      responseSizeAddress: number,
      responseCodeAddress: number
    ): Promise<void> {
      const httpMethod = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        httpMethodAddress
      );
      const serverName = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        serverNameAddress
      );
      const endpoint = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        endpointAddress
      );
      const header = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        headerAddress
      );
      const body = arrayBufferToStringAtIndex(memoryBufferUint8, bodyAddress);

      const headerObject = stringHeaderToObject(header);

      let response: Response | undefined = undefined;
      let responseText = '';
      let statusCode: number;

      try {
        response = await fetchWithTimeout(
          `https://${serverName}${endpoint}`,
          {
            method: httpMethod,
            headers: headerObject,
            body: body,
          },
          timeoutMs
        );
        statusCode = response.status;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        statusCode = 0;
      }

      if (response !== undefined) {
        try {
          responseText = await response.text();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
          statusCode = 1;
        }

        const responseAddress = await aligned_alloc(
          Int8Array.BYTES_PER_ELEMENT,
          (responseText.length + 1) * Int8Array.BYTES_PER_ELEMENT
        );
        if (responseAddress === 0) {
          throw new Error('malloc failed: Cannot allocate memory');
        }

        memoryBufferInt32[
          responseSizeAddress / Int32Array.BYTES_PER_ELEMENT
        ] = responseText.length + 1;
        memoryBufferInt32[
          responseAddressAddress / Int32Array.BYTES_PER_ELEMENT
        ] = responseAddress;

        for (let i = 0; i < responseText.length; i++) {
          memoryBufferUint8[responseAddress + i] = responseText.charCodeAt(i);
        }
        memoryBufferUint8[responseAddress + responseText.length] = 0;
      }

      memoryBufferInt32[
        responseCodeAddress / Int32Array.BYTES_PER_ELEMENT
      ] = statusCode;
    };

    const importObject = {
      // eslint-disable-next-line camelcase
      wasi_snapshot_preview1: wasiSnapshotPreview1Emulator,
      env: {
        memory: memory,
        // eslint-disable-next-line camelcase
        pv_console_log_wasm: pvConsoleLogWasm,
        // eslint-disable-next-line camelcase
        pv_assert_wasm: pvAssertWasm,
        // eslint-disable-next-line camelcase
        pv_time_wasm: pvTimeWasm,
        // eslint-disable-next-line camelcase
        pv_https_request_wasm: pvHttpsRequestWasm,
      },
    };

    const wasmCodeArray = base64ToUint8Array(OCTOPUS_WASM_BASE64);
    const { instance } = await Asyncify.instantiate(
      wasmCodeArray,
      importObject
    );

    const aligned_alloc = instance.exports.aligned_alloc as CallableFunction;

    const pv_octopus_version = instance.exports
      .pv_octopus_version as CallableFunction;
    const pv_octopus_index = instance.exports
      .pv_octopus_index as CallableFunction;
    const pv_octopus_search = instance.exports
      .pv_octopus_search as CallableFunction;
    const pv_octopus_delete = instance.exports
      .pv_octopus_delete as CallableFunction;
    const pv_octopus_init = instance.exports.pv_octopus_init as CallableFunction;
    const pv_status_to_string = instance.exports
      .pv_status_to_string as CallableFunction;
    const pv_sample_rate = instance.exports.pv_sample_rate as CallableFunction;

    const memoryBufferUint8 = new Uint8Array(memory.buffer);
    const memoryBufferInt32 = new Int32Array(memory.buffer);

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
