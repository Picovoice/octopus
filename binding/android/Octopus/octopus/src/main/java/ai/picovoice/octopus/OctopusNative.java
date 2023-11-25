/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.octopus;

class OctopusNative {

    static native String getVersion();

    static native int getPcmDataSampleRate();

    static native void setSdk(String sdk);

    static native long init(
            String accessKey,
            String modelPath) throws OctopusException;

    static native void delete(long object);

    static native OctopusMetadataNative index(
            long object,
            short[] pcm,
            int numSamples) throws OctopusException;

    static native OctopusMetadataNative indexFile(
            long object,
            String path) throws OctopusException;

    static native OctopusMatch[] search(
            long object,
            long metadataPtr,
            int numMetadataBytes,
            String phrase) throws OctopusException;
}
