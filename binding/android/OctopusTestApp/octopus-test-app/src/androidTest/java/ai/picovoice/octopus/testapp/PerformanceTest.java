package ai.picovoice.octopus.testapp;

import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.microsoft.appcenter.espresso.Factory;
import com.microsoft.appcenter.espresso.ReportHelper;

import org.junit.After;
import org.junit.Assume;
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
import java.util.Arrays;
import java.util.HashSet;

import ai.picovoice.octopus.Octopus;
import ai.picovoice.octopus.OctopusMetadata;

@RunWith(AndroidJUnit4.class)
public class PerformanceTest {
    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();
    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;
    String accessKey;

    int numTestIterations = 30;

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

        String iterationString = appContext.getString(R.string.numTestIterations);
        try {
            numTestIterations = Integer.parseInt(iterationString);
        } catch (NumberFormatException ignored) { }
    }

    @Test
    public void testIndexPerformance() throws Exception {
        String indexThresholdString = appContext.getString(R.string.indexPerformanceThresholdSec);
        Assume.assumeNotNull(indexThresholdString);
        Assume.assumeFalse(indexThresholdString.equals(""));

        double indexPerformanceThresholdSec = Double.parseDouble(indexThresholdString);

        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");

        long totalNSec = 0;
        for (int i = 0; i < numTestIterations; i++) {
            long before = System.nanoTime();
            OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());
            long after = System.nanoTime();
            metadata.delete();

            totalNSec += (after - before);
        }
        octopus.delete();

        double avgNSec = totalNSec / (double) numTestIterations;
        double avgSec = ((double) Math.round(avgNSec * 1e-6)) / 1000.0;
        assertTrue(
                String.format("Expected threshold (%.3fs), index took (%.3fs)", indexPerformanceThresholdSec, avgSec),
                avgSec <= indexPerformanceThresholdSec
        );
    }

    @Test
    public void testSearchPerformance() throws Exception {
        String searchThresholdString = appContext.getString(R.string.searchPerformanceThresholdSec);
        Assume.assumeNotNull(searchThresholdString);
        Assume.assumeFalse(searchThresholdString.equals(""));

        double indexPerformanceThresholdSec = Double.parseDouble(searchThresholdString);

        Octopus octopus = new Octopus.Builder().setAccessKey(accessKey).build(appContext);
        File audioFile = new File(testResourcesPath, "audio/multiple_keywords.wav");
        OctopusMetadata metadata = octopus.indexAudioFile(audioFile.getAbsolutePath());

        HashSet<String> testPhrases = new HashSet<>(Arrays.asList("gorilla", "terminator"));

        long totalNSec = 0;
        for (int i = 0; i < numTestIterations; i++) {
            long before = System.nanoTime();
            octopus.search(metadata, testPhrases);
            long after = System.nanoTime();

            totalNSec += (after - before);
        }
        metadata.delete();
        octopus.delete();

        double avgNSec = totalNSec / (double) numTestIterations;
        double avgSec = ((double) Math.round(avgNSec * 1e-6)) / 1000.0;
        assertTrue(
                String.format("Expected threshold (%.3fs), search took (%.3fs)", indexPerformanceThresholdSec, avgSec),
                avgSec <= indexPerformanceThresholdSec
        );
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
