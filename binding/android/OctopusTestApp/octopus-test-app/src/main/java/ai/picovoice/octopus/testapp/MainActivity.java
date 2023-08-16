/*
    Copyright 2021-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.octopus.testapp;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ListView;
import android.widget.SimpleAdapter;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;

import ai.picovoice.octopus.Octopus;
import ai.picovoice.octopus.OctopusException;
import ai.picovoice.octopus.OctopusMatch;
import ai.picovoice.octopus.OctopusMetadata;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }

    @Override
    protected void onStop() {
        super.onStop();
    }

    public void startTest(View view) {
        Button testButton = findViewById(R.id.testButton);
        testButton.setBackground(ContextCompat.getDrawable(
                getApplicationContext(),
                R.drawable.button_disabled));
        runTest();

        testButton.setBackground(ContextCompat.getDrawable(
                getApplicationContext(),
                R.drawable.button_background));
    }

    public void runTest() {
        String accessKey = getApplicationContext().getString(R.string.pvTestingAccessKey);

        ArrayList<TestResult> results = new ArrayList<>();

        String modelFile = getModelFile();

        TestResult result = new TestResult();
        result.testName = "Test Init";
        Octopus octopus = null;
        try {
            octopus = new Octopus.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(modelFile)
                    .build(getApplicationContext());
            result.success = true;
        } catch (OctopusException e) {
            result.success = false;
            result.errorMessage = String.format("Failed to init octopus with '%s'", e);
        } finally {
            results.add(result);
        }

        result = new TestResult();
        result.testName = "Test Process";
        try {
            String audioPath = "audio/multiple_keywords.wav";

            HashMap<String, OctopusMatch[]> processResult = processTestAudio(octopus, audioPath);
            if (processResult.size() > 0) {
                result.success = true;
            } else {
                result.success = false;
                result.errorMessage = "Process returned invalid result.";
            }
        } catch (Exception e) {
            result.success = false;
            result.errorMessage = String.format("Failed to process with '%s'", e);
        } finally {
            results.add(result);
        }

        result = new TestResult();
        result.testName = "Test Exception";
        try {
            new Octopus.Builder()
                    .setAccessKey("")
                    .setModelPath(modelFile)
                    .build(getApplicationContext());
            result.success = false;
            result.errorMessage = "Init should have throw an exception";
        } catch (OctopusException e) {
            result.success = true;
        } finally {
            results.add(result);
        }

        displayTestResults(results);
    }

    private void displayTestResults(ArrayList<TestResult> results) {
        ListView resultList = findViewById(R.id.resultList);

        int passed = 0;
        int failed = 0;

        ArrayList<HashMap<String, String>> list = new ArrayList<>();
        for (TestResult result : results) {
            HashMap<String, String> map = new HashMap<>();
            map.put("testName", result.testName);

            String message;
            if (result.success) {
                message = "Test Passed";
                passed += 1;
            } else {
                message = String.format("Test Failed: %s", result.errorMessage);
                failed += 1;
            }

            map.put("testMessage", message);
            list.add(map);
        }

        SimpleAdapter adapter = new SimpleAdapter(
                getApplicationContext(),
                list,
                R.layout.list_view,
                new String[]{"testName", "testMessage"},
                new int[]{R.id.testName, R.id.testMessage});

        resultList.setAdapter(adapter);

        TextView passedView = findViewById(R.id.testNumPassed);
        TextView failedView = findViewById(R.id.testNumFailed);

        passedView.setText(String.valueOf(passed));
        failedView.setText(String.valueOf(failed));

        TextView resultView = findViewById(R.id.testResult);
        if (passed == 0 || failed > 0) {
            resultView.setText("Failed");
        } else {
            resultView.setText("Passed");
        }
    }

    private String getModelFile() {
        return "models/octopus_params.pv";
    }

    private String[] getKeywords() {
        try {
            return getApplicationContext().getAssets().list("keywords");
        } catch (IOException e) {
            e.printStackTrace();
            return new String[]{};
        }
    }

    private HashMap<String, OctopusMatch[]> processTestAudio(@NonNull Octopus o, String audioPath) throws Exception {
        File testAudio = new File(getApplicationContext().getFilesDir(), audioPath);

        if (!testAudio.exists()) {
            testAudio.getParentFile().mkdirs();
            extractFile(audioPath);
        }

        FileInputStream audioInputStream = new FileInputStream(testAudio);
        byte[] rawData = new byte[(int) testAudio.length()];
        short[] samples = new short[((int) testAudio.length()) / 2];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        audioInputStream.skip(44);
        audioInputStream.read(pcmBuff.array());

        pcmBuff.asShortBuffer().get(samples);
        OctopusMetadata metadata = o.indexAudioData(samples);

        HashSet<String> phrases = new HashSet<>();
        phrases.add("picovoice");

        HashMap<String, OctopusMatch[]> matches = o.search(metadata, phrases);

        return matches;
    }

    private void extractFile(String filepath) throws IOException {
        System.out.println(filepath);
        InputStream is = new BufferedInputStream(getAssets().open(filepath), 256);
        File absPath = new File(getApplicationContext().getFilesDir(), filepath);
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
