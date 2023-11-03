/*
    Copyright 2021-2023 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.octopus;


import android.content.Context;
import android.content.res.Resources;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.HashSet;

/**
 * Android binding for Octopus Speech-to-Index engine. It transforms audio into searchable metadata.
 */
public class Octopus {

    private static String defaultModelPath;
    private static String _sdk = "android";

    private long handle;

    static {
        System.loadLibrary("pv_octopus");
    }

    public static void setSdk(String sdk) {
        Octopus._sdk = sdk;
    }

    /**
     * Constructor.
     *
     * @param accessKey AccessKey obtained from Picovoice Console
     * @param modelPath Absolute path to the file containing Octopus model parameters.
     * @throws OctopusException if there is an error while initializing Octopus.
     */
    private Octopus(String accessKey, String modelPath) throws OctopusException {
        OctopusNative.setSdk(Octopus._sdk);
        handle = OctopusNative.init(accessKey, modelPath);
    }

    private static void extractPackageResources(Context context) throws OctopusException {
        final Resources resources = context.getResources();

        try {
            defaultModelPath = extractResource(context,
                    resources.openRawResource(R.raw.octopus_params),
                    resources.getResourceEntryName(R.raw.octopus_params) + ".pv");
        } catch (IOException ex) {
            throw new OctopusIOException(ex);
        }
    }

    private static String extractResource(
            Context context,
            InputStream srcFileStream,
            String dstFilename
    ) throws IOException {
        InputStream is = new BufferedInputStream(srcFileStream, 256);
        OutputStream os = new BufferedOutputStream(context.openFileOutput(dstFilename, Context.MODE_PRIVATE), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
        return new File(context.getFilesDir(), dstFilename).getAbsolutePath();
    }

    /**
     * Releases resources acquired by Octopus.
     */
    public void delete() {
        if (handle != 0) {
            OctopusNative.delete(handle);
            handle = 0;
        }
    }

    /**
     * Indexes raw PCM data.
     *
     * @param pcm An array of audio samples. The audio needs to have a sample rate
     *            equal to {@link #getPcmDataSampleRate()} and be single-channel, 16-bit linearly-encoded.
     * @return OctopusMetadata object that is used to perform searches.
     * @throws OctopusException if there is an error while processing the audio data.
     */
    public OctopusMetadata indexAudioData(short[] pcm) throws OctopusException {
        if (handle == 0) {
            throw new OctopusInvalidStateException("Attempted to call Octopus index after delete.");
        }
        if (pcm == null) {
            throw new OctopusInvalidArgumentException("Passed null frame to Octopus index.");
        }
        return new OctopusMetadata(OctopusNative.index(handle, pcm, pcm.length));
    }

    /**
     * Reads and indexes a given audio file.
     *
     * @param path Absolute path to an audio file.
     * @return OctopusMetadata object that is used to perform searches.
     * @throws OctopusException if there is an error while processing the audio data.
     */
    public OctopusMetadata indexAudioFile(String path) throws OctopusException {
        if (handle == 0) {
            throw new OctopusInvalidStateException("Attempted to call Octopus index after delete.");
        }

        if (path == null || path.equals("")) {
            throw new OctopusInvalidArgumentException("Passed empty path to Octopus index.");
        }

        File audioFile = new File(path);
        if (!audioFile.exists()) {
            throw new OctopusInvalidArgumentException(
                    String.format("No valid audio file found at '%s'", path));
        }

        return new OctopusMetadata(OctopusNative.indexFile(handle, path));
    }

    /**
     * Searches metadata for a given set of phrases.
     *
     * @param metadata An OctopusMetadata object obtained via {@link #indexAudioData(short[])} or
     *                 {@link #indexAudioFile(String)}.
     * @param phrases  A set of phrases to search for in the metadata.
     * @return a map of phrases and match arrays. Matches are represented by immutable OctopusMatch objects.
     * @throws OctopusException if there is an error while performing the search query.
     */
    public HashMap<String, OctopusMatch[]> search(
            OctopusMetadata metadata,
            HashSet<String> phrases) throws OctopusException {

        if (handle == 0) {
            throw new OctopusInvalidStateException("Attempted to call Octopus search after delete.");
        }

        HashMap<String, OctopusMatch[]> searchResults = new HashMap<>();
        for (String phrase : phrases) {

            final StringBuilder formattedPhraseBuilder = new StringBuilder();
            for (String word : phrase.trim().split("\\s+")) {
                formattedPhraseBuilder.append(word).append(" ");
            }

            final String formattedPhrase = formattedPhraseBuilder.toString().trim();
            if (formattedPhrase.isEmpty()) {
                throw new OctopusInvalidArgumentException("Search phrase cannot be empty");
            }

            OctopusMatch[] searchResult = OctopusNative.search(
                    handle,
                    metadata.metadataNative.handle,
                    metadata.metadataNative.numBytes,
                    formattedPhrase);
            searchResults.put(formattedPhrase, searchResult);
        }
        return searchResults;
    }

    /**
     * Getter for required audio sample rate for PCM data.
     *
     * @return Required audio sample rate for PCM data.
     */
    public int getPcmDataSampleRate() {
        return OctopusNative.getPcmDataSampleRate();
    }

    /**
     * Getter for Octopus version.
     *
     * @return Octopus version.
     */
    public String getVersion() {
        return OctopusNative.getVersion();
    }

    /**
     * Builder for creating an instance of Octopus with a mixture of default arguments.
     */
    public static class Builder {

        private String accessKey = null;
        private String modelPath = null;

        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        public Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        /**
         * Creates an instance of Octopus Speech-to-Index engine.
         */
        public Octopus build(Context context) throws OctopusException {
            if (accessKey == null || this.accessKey.equals("")) {
                throw new OctopusInvalidArgumentException("No AccessKey was provided to Octopus");
            }

            if (modelPath == null) {
                if (defaultModelPath == null) {
                    extractPackageResources(context);
                }
                modelPath = defaultModelPath;
            } else {
                File modelFile = new File(modelPath);
                String modelFilename = modelFile.getName();
                if (!modelFile.exists() && !modelFilename.equals("")) {
                    try {
                        modelPath = extractResource(context,
                                context.getAssets().open(modelPath),
                                modelFilename);
                    } catch (IOException ex) {
                        throw new OctopusIOException(ex);
                    }
                }
            }

            return new Octopus(accessKey, modelPath);
        }
    }
}
