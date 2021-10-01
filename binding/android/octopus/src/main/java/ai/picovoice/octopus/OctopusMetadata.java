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

public class OctopusMetadata {

    static {
        System.loadLibrary("pv_octopus");
    }

    final long handle;
    final int numBytes;

    OctopusMetadata(long handle, int numBytes) {
        this.handle = handle;
        this.numBytes = numBytes;
    }

    /**
     * Constructor.
     *
     * @param metadataBytes a byte array previously obtained via {@link #getBytes()}.
     */
    public OctopusMetadata(byte[] metadataBytes) {
        this.handle = setBytes(metadataBytes, metadataBytes.length);
        this.numBytes = metadataBytes.length;
    }

    /**
     * Gets the metadata in the form of a byte array
     *
     * @return the metadata in the form of a byte array.
     */
    public byte[] getBytes(){
        return getBytes(this.handle, this.numBytes);
    }

    /**
     * Releases resources acquired by OctopusMetadata.
     */
    public void delete() {
        delete(this.handle);
    }

    private native void delete(long handle);

    private native byte[] getBytes(long handle, int numBytes);

    private native long setBytes(byte[] metadataBytes, int numBytes);
}
