/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

export type OctopusMetadata = {
  /** Int32 memory address that points to the metadata loction */
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

export type OctopusWorkerRequestInit = {
  command: 'init';
  accessKey: string;
};

export type OctopusWorkerRequestIndex = {
  command: 'index';
  input: Int16Array;
};

export type OctopusWorkerRequestSearch = {
  command: 'search';
  metadata: OctopusMetadata;
  searchPhrase: string;
};

export type OctopusWorkerRequestVoid = {
  command: 'release';
};

export type OctopusWorkerRequest =
  | OctopusWorkerRequestInit
  | OctopusWorkerRequestIndex
  | OctopusWorkerRequestSearch
  | OctopusWorkerRequestVoid;

export type OctopusWorkerResponseReady = {
  command: 'octopus-ready';
};

export type OctopusWorkerResponseFailed = {
  command: 'octopus-failed';
  message: string;
};

export type OctopusWorkerResponseIndex = {
  command: 'octopus-index';
  metadata: OctopusMetadata;
};

export type OctopusWorkerResponseSearch = {
  command: 'octopus-search';
  matches: OctopusMatch[];
};

export type OctopusWorkerResponseError = {
  command: 'octopus-error';
  message: string;
};

export type OctopusWorkerResponse =
  | OctopusWorkerResponseReady
  | OctopusWorkerResponseFailed
  | OctopusWorkerResponseIndex
  | OctopusWorkerResponseSearch
  | OctopusWorkerResponseError

export interface OctopusEngine {
  /** Release all resources acquired by Octopus */
  release(): Promise<void>;
  /** Process frames of 16-bit 16kHz PCM audio */
  index(pcm: Int16Array): Promise<OctopusMetadata>;
  /** Seaches index for instances of a search phrase */
  search(octopusMetadata: OctopusMetadata, searchPhrase: string): Promise<OctopusMatch[]>;
  /** The version of the Octopus engine */
  readonly version: string;
  /** The sampling rate of audio expected by the Octopus engine */
  readonly sampleRate: number;
}

export interface OctopusWorker extends Omit<Worker, 'postMessage'> {
  postMessage(command: OctopusWorkerRequest): void;
}
