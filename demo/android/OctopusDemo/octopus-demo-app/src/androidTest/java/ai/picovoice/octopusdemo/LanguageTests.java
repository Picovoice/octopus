package ai.picovoice.octopusdemo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;

import ai.picovoice.octopus.Octopus;
import ai.picovoice.octopus.OctopusException;
import ai.picovoice.octopus.OctopusMatch;
import ai.picovoice.octopus.OctopusMetadata;

@RunWith(Parameterized.class)
public class LanguageTests extends BaseTest {

    @Parameterized.Parameter(value = 0)
    public String language;

    @Parameterized.Parameter(value = 1)
    public Map<String, double[][]> searchPhrases;

    @Parameterized.Parameters(name = "{0}")
    public static Collection<Object[]> initParameters() {
        return Arrays.asList(new Object[][]{
                {
                        "de",
                        new HashMap<String, double[][]>() {{
                            put("ananas", new double [][]{{0.000, 0.704, 1}});
                        }},
                },
                {
                        "es",
                        new HashMap<String, double[][]>() {{
                            put("manzana", new double [][]{{5.184, 5.984, 1}});
                        }},
                },
                {
                        "fr",
                        new HashMap<String, double[][]>() {{
                            put("perroquet", new double [][]{{4.352, 5.184, 0.990}});
                        }},
                },
                {
                        "it",
                        new HashMap<String, double[][]>() {{
                            put("porcospino", new double [][]{{0.480, 1.728, 1}});
                        }},
                },
                {
                        "ja",
                        new HashMap<String, double[][]>() {{
                            put("りんご", new double [][]{{0.960, 1.664, 1}});
                        }},
                },
                {
                        "ko",
                        new HashMap<String, double[][]>() {{
                            put("아이스크림", new double [][]{{6.592, 7.520, 0.961}});
                        }},
                },
                {
                        "pt",
                        new HashMap<String, double[][]>() {{
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