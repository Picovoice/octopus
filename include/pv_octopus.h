/*
    Copyright 2020-2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#ifndef PV_OCTOPUS_H
#define PV_OCTOPUS_H

#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus

extern "C" {

#endif

/**
 * Forward declaration for Octopus Speech-to-Index engine.
 */
typedef struct pv_octopus pv_octopus_t;

/**
 * Constructor.
 *
 * @param access_key AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)
 * @param model_path Absolute path to the file containing model parameters.
 * @param[out] object Constructed instance of Octopus.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_IO_ERROR', 'PV_STATUS_OUT_OF_MEMORY',
 * 'PV_STATUS_RUNTIME_ERROR', 'PV_STATUS_ACTIVATION_ERROR', 'PV_STATUS_ACTIVATION_LIMIT_REACHED',
 * 'PV_STATUS_ACTIVATION_THROTTLED', or 'PV_STATUS_ACTIVATION_REFUSED' on failure
 */
PV_API pv_status_t pv_octopus_init(
        const char* access_key,
        const char *model_path,
        pv_octopus_t **object);

/**
 * Destructor.
 *
 * @param object Octopus object.
 */
PV_API void pv_octopus_delete(pv_octopus_t *object);

/**
 * Indexes audio data.
 *
 * @param object Octopus object.
 * @param pcm Audio data. The audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Octopus operates on single-channel audio.
 * @param num_samples Number of audio samples to index.
 * @param indices Index metadata.
 * @param num_indices_bytes Size of index metadata in bytes.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_OUT_OF_MEMORY', 'PV_STATUS_RUNTIME_ERROR',
 * 'PV_STATUS_ACTIVATION_ERROR', 'PV_STATUS_ACTIVATION_LIMIT_REACHED', 'PV_STATUS_ACTIVATION_THROTTLED', or
 * 'PV_STATUS_ACTIVATION_REFUSED' on failure
 */
PV_API pv_status_t pv_octopus_index(
        pv_octopus_t *object,
        const int16_t *pcm,
        int32_t num_samples,
        void **indices,
        int32_t *num_indices_bytes);

/**
 * Indexes an audio file.
 *
 * @param object Octopus object.
 * @param path  Absolute path to the audio file.
 * @param indices Index metadata.
 * @param num_indices_bytes Size of index metadata in bytes.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY',
 * 'PV_STATUS_RUNTIME_ERROR', 'PV_STATUS_ACTIVATION_ERROR', 'PV_STATUS_ACTIVATION_LIMIT_REACHED',
 * 'PV_STATUS_ACTIVATION_THROTTLED', or 'PV_STATUS_ACTIVATION_REFUSED' on failure
 */
PV_API pv_status_t pv_octopus_index_file(
        pv_octopus_t *object,
        const char *path,
        void **indices,
        int32_t *num_indices_bytes);

/**
 * Container representing a matched utterance.
 */
typedef struct {
    float start_sec;
    float end_sec;
    float probability;
} pv_octopus_match_t;

/**
 * Searches index metadata for occurrences of a given phrase.
 *
 * @param object Octopus object.
 * @param indices Index metadata.
 * @param num_indices_bytes Size of index metadata in bytes.
 * @param phrase Search phrase.
 * @param matches Utterances matching the search phrase.
 * @param num_matches Numbers of matched utterances.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_octopus_search(
        pv_octopus_t *object,
        const void *indices,
        int32_t num_indices_bytes,
        const char *phrase,
        pv_octopus_match_t **matches,
        int32_t *num_matches);

/**
 * Getter for version.
 *
 * @return Version.
 */
PV_API const char *pv_octopus_version(void);

#ifdef __cplusplus
}

#endif

#endif // PV_OCTOPUS_H
