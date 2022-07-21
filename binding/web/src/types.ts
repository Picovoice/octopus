/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

// eslint-disable-next-line @typescript-eslint/ban-types
export type OctopusInitConfig = {}


export type OctopusInputConfig = {
  /** @defaultValue 'octopus_model' */
  modelPath?: string;
  /** @defaultValue false */
  forceWrite?: boolean;
  /** @defaultValue 1 */
  version?: number;
}

export type OctopusConfig = OctopusInitConfig & OctopusInputConfig;

export type OctopusMetadata = {
  /** Int32 memory address that points to the metadata location */
  metadataAddress: number;
  /** Length in bytes of the metadata */
  metadataLength: number;
};

export type OctopusMatch = {
  /** Start of the matched audio in seconds. (Float32) */
  startSec: number;
  /** End of the matched audio in seconds. (Float32) */
  endSec: number;
  /** Probability (confidence) that this matches the search phrase. (Float32 in [0,1]) */
  probability: number;
};

export type OctopusWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  modelPath: string;
  initConfig: OctopusInitConfig;
  wasm: string;
  wasmSimd: string;
};

export type OctopusWorkerIndexRequest = {
  command: 'index';
  inputFrame: Int16Array;
  transfer: boolean;
};

export type OctopusWorkerSearchRequest = {
  command: 'search';
  metadata: OctopusMetadata;
  searchPhrase: string;
  transfer: boolean;
};

export type OctopusWorkerReleaseRequest = {
  command: 'release';
};

export type OctopusWorkerRequest =
  OctopusWorkerInitRequest |
  OctopusWorkerIndexRequest |
  OctopusWorkerSearchRequest |
  OctopusWorkerReleaseRequest;

export type OctopusWorkerFailureResponse = {
  command: 'failed' | 'error';
  message: string;
  inputFrame?: Int16Array;
};

export type OctopusWorkerInitResponse = OctopusWorkerFailureResponse | {
  command: 'ok';
  sampleRate: number;
  version: string;
};

export type OctopusWorkerIndexResponse = OctopusWorkerFailureResponse | {
  command: 'ok';
  result: OctopusMetadata;
  inputFrame?: Int16Array;
};

export type OctopusWorkerSearchResponse = OctopusWorkerFailureResponse | {
  command: 'ok';
  result: OctopusMatch;
};

export type OctopusWorkerReleaseResponse = OctopusWorkerFailureResponse | {
  command: 'ok';
};

export type OctopusWorkerResponse =
  OctopusWorkerInitResponse |
  OctopusWorkerIndexResponse |
  OctopusWorkerSearchResponse |
  OctopusWorkerReleaseResponse;
