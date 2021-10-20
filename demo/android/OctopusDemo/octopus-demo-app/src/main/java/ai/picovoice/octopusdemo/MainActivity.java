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

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.os.Process;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import ai.picovoice.octopus.*;

public class MainActivity extends AppCompatActivity {
    private static final String accessKey = "${YOUR_ACCESS_KEY_HERE}";

    private final MicrophoneReader microphoneReader = new MicrophoneReader();
    final private ArrayList<Short> pcmData = new ArrayList<>();
    public Octopus octopus;
    private OctopusMetadata metadata = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.octopus_demo);

        try {
            octopus = new Octopus.Builder(accessKey).build(getApplicationContext());
        } catch (OctopusInvalidArgumentException e) {
            displayError("AccessKey provided is invalid");
        } catch (OctopusActivationException e) {
            displayError("AccessKey activation error");
        } catch (OctopusActivationLimitException e) {
            displayError("AccessKey reached its device limit");
        } catch (OctopusActivationRefusedException e) {
            displayError("AccessKey refused");
        } catch (OctopusActivationThrottledException e) {
            displayError("AccessKey has been throttled");
        } catch (OctopusException e) {
            displayError("Failed to initialize Octopus " + e.getMessage());
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        octopus.delete();
    }

    private void displayError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    @SuppressLint("SetTextI18n")
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton toggleButton = findViewById(R.id.recordButton);
            toggleButton.toggle();
        } else {
            TextView recordingTextView = findViewById(R.id.recordingTextView);
            recordingTextView.setText("Recording...");
            microphoneReader.start();
        }
    }

    public void displayMatches(OctopusMatch[] matches) {
        RecyclerView searchResultsView = findViewById(R.id.searchResultsView);

        for (OctopusMatch match : matches) {
            System.out.printf("%f -> %f (%f)%n", match.getStartSec(), match.getEndSec(), match.getProbability());
        }

        LinearLayoutManager linearLayoutManager = new LinearLayoutManager(getApplicationContext());
        searchResultsView.setLayoutManager(linearLayoutManager);

        SearchResultsViewAdaptor searchResultsViewAdaptor = new SearchResultsViewAdaptor(getApplicationContext(), Arrays.asList(matches));
        searchResultsView.setAdapter(searchResultsViewAdaptor);
    }

    public void onSearchClick(View view) {
        EditText searchText = findViewById(R.id.editTextSearchPhrase);

        if (metadata == null) {
            displayError("Please record some audio and wait for indexing to finish");
            return;
        }

        String searchPhrase = searchText.getText().toString();
        if (searchPhrase.length() == 0) {
            displayError("Please enter a search phrase in");
            return;
        }

        HashSet<String> searchSet = new HashSet<>();
        searchSet.add(searchPhrase);
        try {
            HashMap<String, OctopusMatch[]> matches = octopus.search(metadata, searchSet);

            if (matches.containsKey(searchPhrase)) {
                OctopusMatch[] phraseMatches = matches.get(searchPhrase);
                if (phraseMatches != null) {
                    displayMatches(phraseMatches);
                }
            }
        } catch (OctopusException e) {
            displayError("Octopus search failed\n" + e.toString());
        }
    }

    @SuppressLint({"SetTextI18n", "DefaultLocale"})
    public void onRecordClick(View view) {
        ToggleButton recordButton = findViewById(R.id.recordButton);
        TextView recordingTextView = findViewById(R.id.recordingTextView);

        if (octopus == null) {
            displayError("Octopus is not initialized");
            recordButton.setChecked(false);
            return;
        }

        try {
            if (recordButton.isChecked()) {
                if (hasRecordPermission()) {
                    recordingTextView.setText("Recording...");
                    microphoneReader.start();
                } else {
                    requestRecordPermission();
                }
            } else {
                microphoneReader.stop();
                recordingTextView.setText("Indexing, please wait...");

                short[] pcmDataArray = new short[pcmData.size()];
                for (int i = 0; i < pcmData.size(); ++i) {
                    pcmDataArray[i] = pcmData.get(i);
                }

                metadata = octopus.indexAudioData(pcmDataArray);
                recordingTextView.setText(String.format("Indexing %d seconds of audio complete!", pcmData.size() / octopus.getPcmDataSampleRate()));
            }
        } catch (InterruptedException e) {
            displayError("Audio stop command interrupted\n" + e.toString());
        } catch (OctopusException e) {
            displayError("Audio failed\n" + e.toString());
        }
    }

    public static class SearchResultsViewAdaptor extends RecyclerView.Adapter<SearchResultsViewAdaptor.ViewHolder> {
        final private List<OctopusMatch> data;
        final private LayoutInflater inflater;

        SearchResultsViewAdaptor(Context context, List<OctopusMatch> data) {
            this.inflater = LayoutInflater.from(context);
            this.data = data;
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = inflater.inflate(R.layout.recyclerview_row, parent, false);
            return new ViewHolder(view);
        }

        @SuppressLint("DefaultLocale")
        @Override
        public void onBindViewHolder(ViewHolder holder, int position) {
            OctopusMatch match = data.get(position);
            holder.startSec.setText(String.format("%.2fs", match.getStartSec()));
            holder.endSec.setText(String.format("%.2fs", match.getEndSec()));
            holder.probability.setText(String.format("%.0f%%", match.getProbability() * 100));
        }

        @Override
        public int getItemCount() {
            return data.size();
        }

        public static class ViewHolder extends RecyclerView.ViewHolder {
            TextView startSec;
            TextView endSec;
            TextView probability;

            ViewHolder(View itemView) {
                super(itemView);
                startSec = itemView.findViewById(R.id.startSec);
                endSec = itemView.findViewById(R.id.endSec);
                probability = itemView.findViewById(R.id.probability);
            }
        }
    }

    private class MicrophoneReader {
        private final AtomicBoolean started = new AtomicBoolean(false);
        private final AtomicBoolean stop = new AtomicBoolean(false);
        private final AtomicBoolean stopped = new AtomicBoolean(false);

        void start() {
            if (started.get()) {
                return;
            }

            started.set(true);

            Executors.newSingleThreadExecutor().submit((Callable<Void>) () -> {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
                read();
                return null;
            });
        }

        void stop() throws InterruptedException {
            if (!started.get()) {
                return;
            }

            stop.set(true);

            synchronized (stopped) {
                while (!stopped.get()) {
                    stopped.wait(500);
                }
            }

            started.set(false);
            stop.set(false);
            stopped.set(false);
        }

        private void read() throws OctopusException {
            final int bufferSize = AudioRecord.getMinBufferSize(
                    octopus.getPcmDataSampleRate(),
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT);

            AudioRecord audioRecord = null;

            short[] buffer = new short[bufferSize];
            pcmData.clear();

            try {
                audioRecord = new AudioRecord(
                        MediaRecorder.AudioSource.MIC,
                        octopus.getPcmDataSampleRate(),
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize);
                audioRecord.startRecording();

                while (!stop.get()) {
                    if (audioRecord.read(buffer, 0, buffer.length) == buffer.length) {
                        for (short value : buffer) {
                            pcmData.add(value);
                        }
                    }
                }

                audioRecord.stop();
            } catch (IllegalArgumentException | IllegalStateException | SecurityException e) {
                throw new OctopusException(e);
            } finally {
                if (audioRecord != null) {
                    audioRecord.release();
                }

                stopped.set(true);
                stopped.notifyAll();
            }
        }
    }
}
