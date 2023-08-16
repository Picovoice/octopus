/*
    Copyright 2021 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.octopus;

/**
 * Class that contains metadata returned from Octopus index.
 */
public class OctopusMetadata {

    static {
        System.loadLibrary("pv_octopus");
    }

    final OctopusMetadataNative metadataNative;

    OctopusMetadata(OctopusMetadataNative metadataNative) {
        this.metadataNative = metadataNative;
    }

    /**
     * Constructor.
     *
     * @param metadataBytes a byte array previously obtained via {@link #getBytes()}.
     */
    public OctopusMetadata(byte[] metadataBytes) {
        metadataNative = new OctopusMetadataNative(metadataBytes);
    }

    /**
     * Gets the metadata in the form of a byte array.
     *
     * @return the metadata in the form of a byte array.
     */
    public byte[] getBytes() {
        return metadataNative.getBytes();
    }

    /**
     * Releases resources acquired by OctopusMetadata.
     */
    public void delete() {
        metadataNative.delete();
    }
}
