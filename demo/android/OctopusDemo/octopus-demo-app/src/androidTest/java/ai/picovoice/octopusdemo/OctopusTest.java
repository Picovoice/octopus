/*
    Copyright 2021 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.octopusdemo;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.microsoft.appcenter.espresso.Factory;
import com.microsoft.appcenter.espresso.ReportHelper;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;

import ai.picovoice.octopus.Octopus;
import ai.picovoice.octopus.OctopusException;
import ai.picovoice.octopus.OctopusMatch;
import ai.picovoice.octopus.OctopusMetadata;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;


@RunWith(AndroidJUnit4.class)
public class OctopusTest {

    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();
    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;

    String accessKey = "";

    private final HashSet<String> testPhrases = new HashSet<>(Arrays.asList("gorilla", "terminator"));
    private final OctopusMatch expectedMatch = new OctopusMatch(39.168f, 40.128f, 1.0f);

    @After
    public void TearDown() {
        reportHelper.label("Stopping App");
    }

    @Before
    public void Setup() throws IOException {
        testContext = InstrumentationRegistry.getInstrumentation().getContext();
        appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assetManager = testContext.getAssets();
        extractAssetsRecursively("test_resources");
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();

        accessKey = appContext.getString(R.string.pvTestingAccessKey);
    }

    @Test
    public void testIndexAndSearchAudioFile() throws OctopusException {

        Octopus octopus = new Octopus.Builder(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, testPhrases);

        assertTrue(matches.containsKey("gorilla"));
        assertEquals(0, matches.get("gorilla").length);
        assertTrue(matches.containsKey("terminator"));

        OctopusMatch[] terminatorMatches = matches.get("terminator");
        assertEquals(1, terminatorMatches.length);
        assertEquals(expectedMatch.getStartSec(), terminatorMatches[0].getStartSec(), 0.0);
        assertEquals(expectedMatch.getEndSec(), terminatorMatches[0].getEndSec(), 0.0);
        assertEquals(expectedMatch.getProbability(), terminatorMatches[0].getProbability(), 0.0);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testIndexAndSearchAudioData() throws Exception {
        Octopus octopus = new Octopus.Builder(accessKey).build(appContext);

        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        byte[] rawData = Files.readAllBytes(audioFile.toPath());
        short[] samples = new short[rawData.length / 2];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);
        pcmBuff.asShortBuffer().get(samples);
        samples = Arrays.copyOfRange(samples, 44, samples.length);

        OctopusMetadata metadata = octopus.indexAudioData(samples);

        HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, testPhrases);
        assertTrue(matches.containsKey("gorilla"));
        assertEquals(0, matches.get("gorilla").length);
        assertTrue(matches.containsKey("terminator"));

        OctopusMatch[] terminatorMatches = matches.get("terminator");
        assertEquals(1, terminatorMatches.length);
        assertEquals(expectedMatch.getStartSec(), terminatorMatches[0].getStartSec(), 0.0);
        assertEquals(expectedMatch.getEndSec(), terminatorMatches[0].getEndSec(), 0.0);
        assertEquals(expectedMatch.getProbability(), terminatorMatches[0].getProbability(), 0.0);

        metadata.delete();
        octopus.delete();
    }

    @Test
    public void testMetadataMarshalling() throws Exception {
        Octopus octopus = new Octopus.Builder(accessKey).build(appContext);
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
        assertEquals(0, matches.get("gorilla").length);
        assertTrue(matches.containsKey("terminator"));

        OctopusMatch[] terminatorMatches = matches.get("terminator");
        assertEquals(1, terminatorMatches.length);
        assertEquals(expectedMatch.getStartSec(), terminatorMatches[0].getStartSec(), 0.0);
        assertEquals(expectedMatch.getEndSec(), terminatorMatches[0].getEndSec(), 0.0);
        assertEquals(expectedMatch.getProbability(), terminatorMatches[0].getProbability(), 0.0);

        metadata.delete();
        octopus.delete();
    }

    private void extractAssetsRecursively(String path) throws IOException {

        String[] list = assetManager.list(path);
        if (list.length > 0) {
            File outputFile = new File(appContext.getFilesDir(), path);
            if (!outputFile.exists()) {
                outputFile.mkdirs();
            }

            for (String file : list) {
                String filepath = path + "/" + file;
                extractAssetsRecursively(filepath);
            }
        } else {
            extractTestFile(path);
        }
    }

    private void extractTestFile(String filepath) throws IOException {

        InputStream is = new BufferedInputStream(assetManager.open(filepath), 256);
        File absPath = new File(appContext.getFilesDir(), filepath);
        OutputStream os = new BufferedOutputStream(new FileOutputStream(absPath), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
    }
}
