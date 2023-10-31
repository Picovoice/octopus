/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { Octopus } from './octopus';
import { OctopusWorker } from './octopus_worker';
import * as OctopusErrors from './octopus_errors';

import {
  OctopusMetadata,
  OctopusMatch,
  OctopusModel,
  OctopusOptions,
  OctopusWorkerInitRequest,
  OctopusWorkerIndexRequest,
  OctopusWorkerSearchRequest,
  OctopusWorkerReleaseRequest,
  OctopusWorkerRequest,
  OctopusWorkerInitResponse,
  OctopusWorkerIndexResponse,
  OctopusWorkerSearchResponse,
  OctopusWorkerReleaseResponse,
  OctopusWorkerFailureResponse,
  OctopusWorkerResponse,
} from './types';

import octopusWasm from '../lib/pv_octopus.wasm';
import octopusWasmSimd from '../lib/pv_octopus_simd.wasm';

Octopus.setWasm(octopusWasm);
Octopus.setWasmSimd(octopusWasmSimd);
OctopusWorker.setWasm(octopusWasm);
OctopusWorker.setWasmSimd(octopusWasmSimd);

export {
  Octopus,
  OctopusErrors,
  OctopusModel,
  OctopusOptions,
  OctopusMetadata,
  OctopusMatch,
  OctopusWorker,
  OctopusWorkerInitRequest,
  OctopusWorkerIndexRequest,
  OctopusWorkerSearchRequest,
  OctopusWorkerReleaseRequest,
  OctopusWorkerRequest,
  OctopusWorkerInitResponse,
  OctopusWorkerIndexResponse,
  OctopusWorkerSearchResponse,
  OctopusWorkerReleaseResponse,
  OctopusWorkerFailureResponse,
  OctopusWorkerResponse,
};
