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

import androidx.test.platform.app.InstrumentationRegistry;

import com.microsoft.appcenter.espresso.Factory;
import com.microsoft.appcenter.espresso.ReportHelper;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.experimental.runners.Enclosed;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;

import ai.picovoice.octopus.Octopus;
import ai.picovoice.octopus.OctopusException;
import ai.picovoice.octopus.OctopusInvalidArgumentException;
import ai.picovoice.octopus.OctopusMatch;
import ai.picovoice.octopus.OctopusMetadata;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;


class BaseTest {
    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();
    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;

    String accessKey = "";

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

@RunWith(Enclosed.class)
public class OctopusTest extends BaseTest {
    public static class StandardTests extends BaseTest {
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
    }

    @RunWith(Parameterized.class)
    public static class LanguageTests extends BaseTest {

        @Parameterized.Parameter(value = 0)
        public String language;

        @Parameterized.Parameter(value = 1)
        public Map<String, double[][]> searchPhrases;

        @Parameterized.Parameters(name = "{0}")
        public static Collection<Object[]> initParameters() {
            return Arrays.asList(new Object[][]{
                    {
                        "de",
                        new HashMap<String, double[][]> () {{
                            put("ananas", new double [][]{{0.000, 0.704, 1}});
                        }},
                    },
                    {
                        "es",
                        new HashMap<String, double[][]> () {{
                            put("manzana", new double [][]{{5.184, 5.984, 1}});
                        }},
                    },
                    {
                        "fr",
                        new HashMap<String, double[][]> () {{
                            put("perroquet", new double [][]{{4.352, 5.184, 0.990}});
                        }},
                    },
                    {
                        "it",
                        new HashMap<String, double[][]> () {{
                            put("porcospino", new double [][]{{0.480, 1.728, 1}});
                        }},
                    },
                    {
                        "ja",
                        new HashMap<String, double[][]> () {{
                            put("りんご", new double [][]{{0.960, 1.664, 1}});
                        }},
                    },
                    {
                        "ko",
                        new HashMap<String, double[][]> () {{
                            put("아이스크림", new double [][]{{6.592, 7.520, 0.961}});
                        }},
                    },
                    {
                        "pt",
                        new HashMap<String, double[][]> () {{
                           put("porco espinho", new double [][]{{0.480, 1.792, 1}});
                        }},
                    }
            });
        }

        @Test
        public void testIndexAndSearch() throws OctopusException {
            File modelFile = new File(testResourcesPath, String.format("param/octopus_params_%s.pv", language));
            File audioFile = new File(testResourcesPath, String.format("audio/multiple_keywords_%s.wav", language));

            Octopus octopus = new Octopus.Builder()
                    .setModelPath(modelFile.getAbsolutePath())
                    .setAccessKey(accessKey)
                    .build(appContext);
            OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

            HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, new HashSet<>(searchPhrases.keySet()));

            for (Map.Entry<String, double[][]> entry : searchPhrases.entrySet()) {
                assertTrue(matches.containsKey(entry.getKey()));
                OctopusMatch[] match = Objects.requireNonNull(matches.get(entry.getKey()));
                assertEquals(entry.getValue().length, match.length);
                for (int i = 0; i < match.length; i++) {
                    assertEquals(match[i].getStartSec(), entry.getValue()[i][0], 0.01);
                    assertEquals(match[i].getEndSec(), entry.getValue()[i][1], 0.01);
                    assertEquals(match[i].getProbability(), entry.getValue()[i][2], 0.01);
                }
            }

            metadata.delete();
            octopus.delete();
        }
    }
}
