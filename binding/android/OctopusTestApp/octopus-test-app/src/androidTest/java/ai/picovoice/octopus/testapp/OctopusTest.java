/*
    Copyright 2021 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.octopus.testapp;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileInputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Objects;

import ai.picovoice.octopus.Octopus;
import ai.picovoice.octopus.OctopusException;
import ai.picovoice.octopus.OctopusInvalidArgumentException;
import ai.picovoice.octopus.OctopusMatch;
import ai.picovoice.octopus.OctopusMetadata;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public class OctopusTest extends BaseTest {
    private final HashSet<String> testPhrases = new HashSet<>(Arrays.asList("gorilla", "terminator"));
    private final OctopusMatch expectedMatch = new OctopusMatch(39.168f, 40.128f, 1.0f);

    @Test
    public void testIndexAndSearchAudioFile() throws OctopusException {

        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, testPhrases);

        assertTrue(matches.containsKey("gorilla"));
        assertEquals(0, Objects.requireNonNull(matches.get("gorilla")).length);
        assertTrue(matches.containsKey("terminator"));

        OctopusMatch[] terminatorMatches = Objects.requireNonNull(matches.get("terminator"));
        assertEquals(1, terminatorMatches.length);
        assertEquals(expectedMatch.getStartSec(), terminatorMatches[0].getStartSec(), 0.0);
        assertEquals(expectedMatch.getEndSec(), terminatorMatches[0].getEndSec(), 0.0);
        assertEquals(expectedMatch.getProbability(), terminatorMatches[0].getProbability(), 0.0);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testIndexAndSearchAudioData() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);

        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");

        FileInputStream audioInputStream = new FileInputStream(audioFile);
        byte[] rawData = new byte[(int) audioFile.length()];
        short[] samples = new short[((int) audioFile.length()) / 2];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);
        audioInputStream.skip(44);
        int numRead = audioInputStream.read(pcmBuff.array());
        assertTrue(((numRead + 44) / 2) == samples.length);
        pcmBuff.asShortBuffer().get(samples);

        OctopusMetadata metadata = octopus.indexAudioData(samples);

        HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, testPhrases);
        assertTrue(matches.containsKey("gorilla"));
        assertEquals(0, Objects.requireNonNull(matches.get("gorilla")).length);
        assertTrue(matches.containsKey("terminator"));

        OctopusMatch[] terminatorMatches = Objects.requireNonNull(matches.get("terminator"));
        assertEquals(1, terminatorMatches.length);
        assertEquals(expectedMatch.getStartSec(), terminatorMatches[0].getStartSec(), 0.0);
        assertEquals(expectedMatch.getEndSec(), terminatorMatches[0].getEndSec(), 0.0);
        assertEquals(expectedMatch.getProbability(), terminatorMatches[0].getProbability(), 0.0);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testMetadataMarshalling() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        byte[] metadataBytes = metadata.getBytes();
        assertEquals(227360, metadataBytes.length);
        metadata.delete();
        metadata = null;
        assertEquals(227360, metadataBytes.length);

        metadata = new OctopusMetadata(metadataBytes);

        HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, testPhrases);
        assertTrue(matches.containsKey("gorilla"));
        assertEquals(0, Objects.requireNonNull(matches.get("gorilla")).length);
        assertTrue(matches.containsKey("terminator"));

        OctopusMatch[] terminatorMatches = Objects.requireNonNull(matches.get("terminator"));
        assertEquals(1, terminatorMatches.length);
        assertEquals(expectedMatch.getStartSec(), terminatorMatches[0].getStartSec(), 0.0);
        assertEquals(expectedMatch.getEndSec(), terminatorMatches[0].getEndSec(), 0.0);
        assertEquals(expectedMatch.getProbability(), terminatorMatches[0].getProbability(), 0.0);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testEmptySearchPhrase() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashSet<String> searchPhrases = new HashSet<>();
        searchPhrases.add("");
        boolean invalidArg = false;
        try {
            octopus.search(metadata, searchPhrases);
        } catch (OctopusInvalidArgumentException e) {
            invalidArg = true;
        }
        assertTrue(invalidArg);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testWhitespaceSearchPhrase() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashSet<String> searchPhrases = new HashSet<>();
        searchPhrases.add("     ");
        boolean invalidArg = false;
        try {
            octopus.search(metadata, searchPhrases);
        } catch (OctopusInvalidArgumentException e) {
            invalidArg = true;
        }
        assertTrue(invalidArg);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testNumericSearchPhrase() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashSet<String> searchPhrases = new HashSet<>();
        searchPhrases.add("12");
        boolean invalidArg = false;
        try {
            octopus.search(metadata, searchPhrases);
        } catch (OctopusInvalidArgumentException e) {
            invalidArg = true;
        }
        assertTrue(invalidArg);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testHyphenInSearchPhrase() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashSet<String> searchPhrases = new HashSet<>();
        searchPhrases.add("real-time");
        boolean invalidArg = false;
        try {
            octopus.search(metadata, searchPhrases);
        } catch (OctopusInvalidArgumentException e) {
            invalidArg = true;
        }
        assertTrue(invalidArg);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testInvalidSearchPhrase() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashSet<String> searchPhrases = new HashSet<>();
        searchPhrases.add("@@!%$");
        boolean invalidArg = false;
        try {
            octopus.search(metadata, searchPhrases);
        } catch (OctopusInvalidArgumentException e) {
            invalidArg = true;
        }
        assertTrue(invalidArg);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testSpacesInSearchPhrase() throws Exception {
        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        String searchTerm = " americano   avocado    ";
        String normalizedSearchTerm = "americano avocado";

        HashSet<String> searchPhrases = new HashSet<>();
        searchPhrases.add(searchTerm);

        HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, searchPhrases);
        assertTrue(matches.containsKey(normalizedSearchTerm));
        assertEquals(matches.size(), 1);

        OctopusMatch[] match = Objects.requireNonNull(matches.get(normalizedSearchTerm));
        assertEquals(1, match.length);

        OctopusMatch expected = new OctopusMatch(9.47f, 12.25f, 0.43f);
        assertEquals(expected.getStartSec(), match[0].getStartSec(), 0.01);
        assertEquals(expected.getEndSec(), match[0].getEndSec(), 0.01);
        assertEquals(expected.getProbability(), match[0].getProbability(), 0.01);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testErrorStack() {
        String[] error = {};
        try {
            new Octopus.Builder()
                    .setAccessKey("invalid")
                    .build(appContext);
        } catch (OctopusException e) {
            error = e.getMessageStack();
        }

        assertTrue(0 < error.length);
        assertTrue(error.length <= 8);

        try {
            new Octopus.Builder()
                    .setAccessKey("invalid")
                    .build(appContext);
        } catch (OctopusException e) {
            for (int i = 0; i < error.length; i++) {
                assertEquals(e.getMessageStack()[i], error[i]);
            }
        }
    }
}
