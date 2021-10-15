/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

import {
  OctopusEngine,
  OctopusWorkerRequest,
  OctopusWorkerResponseReady,
  OctopusWorkerResponseFailed,
  OctopusWorkerResponseIndex,
  OctopusWorkerResponseSearch,
  OctopusWorkerResponseError,
  OctopusMetadata
} from './octopus_types';

import { Octopus } from './octopus';

let octopusEngine: OctopusEngine | null = null;

async function init(accessKey: string): Promise<void> {
  try {
    octopusEngine = await Octopus.create(accessKey);
    const octopusReadyMessage: OctopusWorkerResponseReady = {
      command: 'octopus-ready',
    };
    // @ts-ignore
    postMessage(octopusReadyMessage, undefined);
  } catch (error) {
    const octopusFailedMessage: OctopusWorkerResponseFailed = {
      command: 'octopus-failed',
      message: error,
    };
    // @ts-ignore
    postMessage(octopusFailedMessage, undefined);
  }
}

async function index(input: Int16Array): Promise<void> {
  try {
    if (octopusEngine !== null) {
      const metadata = await octopusEngine.index(input);
      const octopusIndexMessage: OctopusWorkerResponseIndex = {
        command: 'octopus-index',
        metadata: metadata,
      };
      // @ts-ignore
      postMessage(octopusIndexMessage, undefined);
    }
  } catch (error) {
    const octopusErrorMessage: OctopusWorkerResponseError = {
      command: 'octopus-error',
      message: error,
    };
    // @ts-ignore
    postMessage(octopusErrorMessage, undefined);
  }
}

async function search(metadata: OctopusMetadata, searchPhrase: string): Promise<void> {
  try {
    if (octopusEngine !== null) {
      const matches = await octopusEngine.search(metadata, searchPhrase);
      const octopusSearchMessage: OctopusWorkerResponseSearch = {
        command: 'octopus-search',
        matches: matches,
      };
      // @ts-ignore
      postMessage(octopusSearchMessage, undefined);
    }
  } catch (error) {
    const octopusErrorMessage: OctopusWorkerResponseError = {
      command: 'octopus-error',
      message: error,
    };
    // @ts-ignore
    postMessage(octopusErrorMessage, undefined);
  }
}

async function release(): Promise<void> {
  if (octopusEngine !== null) {
    await octopusEngine.release();
  }

  octopusEngine = null;
  close();
}

onmessage = function (
  event: MessageEvent<OctopusWorkerRequest>
): void {
  switch (event.data.command) {
    case 'init':
      init(event.data.accessKey);
      break;
    case 'index':
      index(event.data.input);
      break;
    case 'search':
      search(event.data.metadata, event.data.searchPhrase);
      break;
    case 'release':
      release();
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn('Unhandled command in octopus_worker: ' + event.data);
  }
};
