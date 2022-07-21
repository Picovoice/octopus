/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Octopus } from "./octopus";
import { OctopusWorkerRequest } from "./types";

/**
 * Octopus worker handler.
 */
let octopus: Octopus | null = null;
self.onmessage = async function (
  event: MessageEvent<OctopusWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      if (octopus !== null) {
        self.postMessage({
          command: "error",
          message: "Octopus already initialized"
        });
        return;
      }
      try {
        Octopus.setWasm(event.data.wasm);
        Octopus.setWasmSimd(event.data.wasmSimd);
        octopus = await Octopus.create(event.data.accessKey, event.data.modelPath, event.data.initConfig);
        self.postMessage({
          command: "ok",
          version: octopus.version,
          sampleRate: octopus.sampleRate
        });
      } catch (e: any) {
        self.postMessage({
          command: "error",
          message: e.message
        });
      }
      break;
    case 'index':
      // eslint-disable-next-line no-case-declarations
      const transferable = (event.data.transfer) ? [event.data.inputFrame.buffer] : [];
      if (octopus === null) {
        self.postMessage({
          command: "error",
          message: "Octopus not initialized",
          inputFrame: event.data.inputFrame
        }, transferable);
        return;
      }
      try {
        self.postMessage({
          command: "ok",
          result: await octopus.index(event.data.inputFrame),
          inputFrame: (event.data.transfer) ? event.data.inputFrame : undefined
        }, transferable);
      } catch (e: any) {
        self.postMessage({
          command: "error",
          message: e.message,
          inputFrame: event.data.inputFrame
        }, transferable);
      }
      break;
    case 'search':
      if (octopus === null) {
        self.postMessage({
          command: "error",
          message: "Octopus not initialized",
        });
        return;
      }
      try {
        self.postMessage({
          command: "ok",
          result: await octopus.search(event.data.metadata, event.data.searchPhrase)
        });
      } catch (e: any) {
        self.postMessage({
          command: "error",
          message: e.message
        });
      }
      break;
    case 'release':
      if (octopus !== null) {
        await octopus.release();
        octopus = null;
        close();
      }
      self.postMessage({
        command: "ok"
      });
      break;
    default:
      self.postMessage({
        command: "failed",
        // @ts-ignore
        message: `Unrecognized command: ${event.data.command}`
      });
  }
};
