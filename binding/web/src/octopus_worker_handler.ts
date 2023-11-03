/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Octopus } from './octopus';
import {
  OctopusWorkerIndexRequest,
  OctopusWorkerInitRequest,
  OctopusWorkerRequest,
  OctopusWorkerSearchRequest,
  PvStatus,
} from './types';
import { OctopusError } from './octopus_errors';

let octopus: Octopus | null = null;

const initRequest = async (request: OctopusWorkerInitRequest): Promise<any> => {
  if (octopus !== null) {
    return {
      command: 'error',
      status: PvStatus.INVALID_STATE,
      shortMessage: 'Octopus already initialized',
    };
  }
  try {
    Octopus.setWasm(request.wasm);
    Octopus.setWasmSimd(request.wasmSimd);
    Octopus.setSdk(request.sdk);
    octopus = await Octopus._init(
      request.accessKey,
      request.modelPath,
      request.options
    );
    return {
      command: 'ok',
      version: octopus.version,
      sampleRate: octopus.sampleRate,
    };
  } catch (e: any) {
    if (e instanceof OctopusError) {
      return {
        command: 'error',
        status: e.status,
        shortMessage: e.shortMessage,
        messageStack: e.messageStack,
      };
    }
    return {
      command: 'error',
      status: PvStatus.RUNTIME_ERROR,
      shortMessage: e.message,
    };
  }
};

const indexRequest = async (
  request: OctopusWorkerIndexRequest
): Promise<any> => {
  if (octopus === null) {
    return {
      command: 'error',
      status: PvStatus.INVALID_STATE,
      shortMessage: 'Octopus already initialized',
      inputFrame: request.inputFrame,
    };
  }
  try {
    return {
      command: 'ok',
      result: await octopus.index(request.inputFrame),
      inputFrame: request.transfer ? request.inputFrame : undefined,
    };
  } catch (e: any) {
    if (e instanceof OctopusError) {
      return {
        command: 'error',
        status: e.status,
        shortMessage: e.shortMessage,
        messageStack: e.messageStack,
      };
    }
    return {
      command: 'error',
      status: PvStatus.RUNTIME_ERROR,
      shortMessage: e.message,
    };
  }
};

const searchRequest = async (
  request: OctopusWorkerSearchRequest
): Promise<any> => {
  if (octopus === null) {
    return {
      command: 'error',
      status: PvStatus.INVALID_STATE,
      shortMessage: 'Octopus already initialized',
    };
  }
  try {
    return {
      command: 'ok',
      result: await octopus.search(request.metadata, request.searchPhrase),
    };
  } catch (e: any) {
    if (e instanceof OctopusError) {
      return {
        command: 'error',
        status: e.status,
        shortMessage: e.shortMessage,
        messageStack: e.messageStack,
      };
    }
    return {
      command: 'error',
      status: PvStatus.RUNTIME_ERROR,
      shortMessage: e.message,
    };
  }
};

const releaseRequest = async (): Promise<any> => {
  if (octopus !== null) {
    await octopus.release();
    octopus = null;
    close();
  }
  return {
    command: 'ok',
  };
};

/**
 * Octopus worker handler.
 */
self.onmessage = async function (
  event: MessageEvent<OctopusWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      self.postMessage(await initRequest(event.data));
      break;
    case 'index':
      self.postMessage(
        await indexRequest(event.data),
        event.data.transfer ? [event.data.inputFrame.buffer] : []
      );
      break;
    case 'search':
      self.postMessage(await searchRequest(event.data));
      break;
    case 'release':
      self.postMessage(await releaseRequest());
      break;
    default:
      self.postMessage({
        command: 'failed',
        status: PvStatus.RUNTIME_ERROR,
        // @ts-ignore
        shortMessage: `Unrecognized command: ${event.data.command}`,
      });
  }
};
