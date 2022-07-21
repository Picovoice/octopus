import { Octopus } from "./octopus";
import { OctopusWorker } from "./octopus_worker";

import {
  OctopusConfig,
  OctopusMetadata,
  OctopusMatch,
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
  OctopusWorkerResponse
} from "./types";

import octopusWasm from "../lib/pv_octopus.wasm";
import octopusWasmSimd from "../lib/pv_octopus_simd.wasm";

Octopus.setWasm(octopusWasm);
Octopus.setWasmSimd(octopusWasmSimd);
OctopusWorker.setWasm(octopusWasm);
OctopusWorker.setWasmSimd(octopusWasmSimd);

export {
  Octopus,
  OctopusConfig,
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
  OctopusWorkerResponse
};
