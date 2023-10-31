/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import PvWorker from 'web-worker:./octopus_worker_handler.ts';

import {
  OctopusMatch,
  OctopusMetadata,
  OctopusModel,
  OctopusOptions,
  OctopusWorkerInitResponse,
  OctopusWorkerIndexResponse,
  OctopusWorkerSearchResponse,
  OctopusWorkerReleaseResponse,
  PvStatus,
} from './types';
import { loadModel } from '@picovoice/web-utils';
import { pvStatusToException } from './octopus_errors';

export class OctopusWorker {
  private readonly _worker: Worker;
  private readonly _version: string;
  private readonly _sampleRate: number;
  private static _sdk: string = 'web';

  private static _wasm: string;
  private static _wasmSimd: string;

  private constructor(worker: Worker, version: string, sampleRate: number) {
    this._worker = worker;
    this._version = version;
    this._sampleRate = sampleRate;
  }

  public static setSdk(sdk: string): void {
    OctopusWorker._sdk = sdk;
  }

  /**
   * Get Octopus engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * Get Octopus worker instance.
   */
  get worker(): Worker {
    return this._worker;
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
   * Creates a worker instance of the Picovoice Octopus Speech-to-Text engine.
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
   * @returns An instance of OctopusWorker.
   */
  public static async create(
    accessKey: string,
    model: OctopusModel,
    options: OctopusOptions = {}
  ): Promise<OctopusWorker> {
    const customWritePath = model.customWritePath
      ? model.customWritePath
      : 'octopus_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    const worker = new PvWorker();
    const returnPromise: Promise<OctopusWorker> = new Promise(
      (resolve, reject) => {
        // @ts-ignore - block from GC
        this.worker = worker;
        worker.onmessage = (
          event: MessageEvent<OctopusWorkerInitResponse>
        ): void => {
          switch (event.data.command) {
            case 'ok':
              resolve(
                new OctopusWorker(
                  worker,
                  event.data.version,
                  event.data.sampleRate
                )
              );
              break;
            case 'failed':
            case 'error':
              reject(
                pvStatusToException(
                  event.data.status,
                  event.data.shortMessage,
                  event.data.messageStack
                )
              );
              break;
            default:
              reject(
                pvStatusToException(
                  PvStatus.RUNTIME_ERROR,
                  // @ts-ignore
                  `Unrecognized command: ${event.data.command}`
                )
              );
          }
        };
      }
    );

    worker.postMessage({
      command: 'init',
      accessKey: accessKey,
      modelPath: modelPath,
      options: options,
      wasm: this._wasm,
      wasmSimd: this._wasmSimd,
    });

    return returnPromise;
  }

  /**
   * Processes multiple frames of audio samples. The required sample rate can be retrieved from '.sampleRate'.
   * The audio needs to bit 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm Frame of audio with properties described above.
   * @param options Optional process arguments.
   * @param options.transfer Flag to indicate if the buffer should be transferred or not. If set to true,
   * input buffer array will be transferred to the worker.
   * @param options.transferCallback Optional callback containing a new Int16Array with contents from 'pcm'. Use this callback
   * to get the input pcm when using transfer.
   * @return Octopus metadata object.
   */
  public index(
    pcm: Int16Array,
    options: {
      transfer?: boolean;
      transferCallback?: (data: Int16Array) => void;
    } = {}
  ): Promise<OctopusMetadata> {
    const { transfer = false, transferCallback } = options;

    const returnPromise: Promise<OctopusMetadata> = new Promise(
      (resolve, reject) => {
        this._worker.onmessage = (
          event: MessageEvent<OctopusWorkerIndexResponse>
        ): void => {
          if (transfer && transferCallback && event.data.inputFrame) {
            transferCallback(new Int16Array(event.data.inputFrame.buffer));
          }
          switch (event.data.command) {
            case 'ok':
              resolve(event.data.result);
              break;
            case 'failed':
            case 'error':
              reject(
                pvStatusToException(
                  event.data.status,
                  event.data.shortMessage,
                  event.data.messageStack
                )
              );
              break;
            default:
              reject(
                pvStatusToException(
                  PvStatus.RUNTIME_ERROR,
                  // @ts-ignore
                  `Unrecognized command: ${event.data.command}`
                )
              );
          }
        };
      }
    );

    const transferable = transfer ? [pcm.buffer] : [];

    this._worker.postMessage(
      {
        command: 'index',
        inputFrame: pcm,
        transfer: transfer,
      },
      transferable
    );

    return returnPromise;
  }

  /**
   * Searches metadata for a given search phrase.
   *
   * @param octopusMetadata - An octopus metadata object.
   * @param searchPhrase - The text phrase to search the metadata (indexed audio) for.
   * @return An array of OctopusMatch objects.
   */
  public search(
    octopusMetadata: OctopusMetadata,
    searchPhrase: string
  ): Promise<OctopusMatch[]> {
    const returnPromise: Promise<OctopusMatch[]> = new Promise(
      (resolve, reject) => {
        this._worker.onmessage = (
          event: MessageEvent<OctopusWorkerSearchResponse>
        ): void => {
          switch (event.data.command) {
            case 'ok':
              resolve(event.data.result);
              break;
            case 'failed':
            case 'error':
              reject(
                pvStatusToException(
                  event.data.status,
                  event.data.shortMessage,
                  event.data.messageStack
                )
              );
              break;
            default:
              reject(
                pvStatusToException(
                  PvStatus.RUNTIME_ERROR,
                  // @ts-ignore
                  `Unrecognized command: ${event.data.command}`
                )
              );
          }
        };
      }
    );

    this._worker.postMessage({
      command: 'search',
      metadata: octopusMetadata,
      searchPhrase: searchPhrase,
    });

    return returnPromise;
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public release(): Promise<void> {
    const returnPromise: Promise<void> = new Promise((resolve, reject) => {
      this._worker.onmessage = (
        event: MessageEvent<OctopusWorkerReleaseResponse>
      ): void => {
        switch (event.data.command) {
          case 'ok':
            resolve();
            break;
          case 'failed':
          case 'error':
            reject(
              pvStatusToException(
                event.data.status,
                event.data.shortMessage,
                event.data.messageStack
              )
            );
            break;
          default:
            reject(
              pvStatusToException(
                PvStatus.RUNTIME_ERROR,
                // @ts-ignore
                `Unrecognized command: ${event.data.command}`
              )
            );
        }
      };
    });

    this._worker.postMessage({
      command: 'release',
    });

    return returnPromise;
  }

  /**
   * Terminates the active worker. Stops all requests being handled by worker.
   */
  public terminate(): void {
    this._worker.terminate();
  }
}
