/*
    Copyright 2021-2023 Picovoice Inc.

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
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import ai.picovoice.android.voiceprocessor.VoiceProcessor;
import ai.picovoice.android.voiceprocessor.VoiceProcessorException;
import ai.picovoice.octopus.Octopus;
import ai.picovoice.octopus.OctopusActivationException;
import ai.picovoice.octopus.OctopusActivationLimitException;
import ai.picovoice.octopus.OctopusActivationRefusedException;
import ai.picovoice.octopus.OctopusActivationThrottledException;
import ai.picovoice.octopus.OctopusException;
import ai.picovoice.octopus.OctopusInvalidArgumentException;
import ai.picovoice.octopus.OctopusMatch;
import ai.picovoice.octopus.OctopusMetadata;

public class MainActivity extends AppCompatActivity {

    private static final String ACCESS_KEY = "{YOUR_ACCESS_KEY_HERE}";

    private static final int MAX_RECORDING_SEC = 120;

    private final VoiceProcessor voiceProcessor = VoiceProcessor.getInstance();
    private final ExecutorService taskExecutor = Executors.newSingleThreadExecutor();
    private final ArrayList<Short> pcmData = new ArrayList<>();
    public Octopus octopus;
    private Timer recordingTimer;
    private double recordingTimeSec = 0;
    private OctopusMetadata metadata = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.octopus_demo);
        setUIInteractivity(false);

        try {
            octopus = new Octopus.Builder().setAccessKey(ACCESS_KEY).build(getApplicationContext());
            setUIInteractivity(true);
        } catch (OctopusInvalidArgumentException e) {
            displayFatalError(String.format("AccessKey '%s' is invalid", ACCESS_KEY));
        } catch (OctopusActivationException e) {
            displayFatalError("AccessKey activation error");
        } catch (OctopusActivationLimitException e) {
            displayFatalError("AccessKey reached its device limit");
        } catch (OctopusActivationRefusedException e) {
            displayFatalError("AccessKey refused");
        } catch (OctopusActivationThrottledException e) {
            displayFatalError("AccessKey has been throttled");
        } catch (OctopusException e) {
            displayFatalError("Failed to initialize Octopus " + e.getMessage());
        }

        voiceProcessor.addFrameListener(frame -> {
            for (short sample : frame) {
                pcmData.add(sample);
            }
        });

        voiceProcessor.addErrorListener(error -> {
            runOnUiThread(()-> displayError(error.toString(), Toast.LENGTH_LONG));
        });
    }

    @Override
    protected void onDestroy() {
        octopus.delete();
        super.onDestroy();
    }

    private void setUIInteractivity(boolean isInteractive) {
        runOnUiThread(() -> {
            ToggleButton toggleButton = findViewById(R.id.recordButton);
            EditText searchPhraseEditText = findViewById(R.id.editTextSearchPhrase);
            Button searchButton = findViewById(R.id.searchButton);
            toggleButton.setEnabled(isInteractive);
            searchPhraseEditText.setEnabled(isInteractive);
            searchButton.setEnabled(isInteractive);
            if (isInteractive) {
                toggleButton.setBackgroundResource(R.drawable.button_background);
                searchButton.setBackgroundResource(R.color.colorPrimary);
            } else {
                toggleButton.setBackgroundResource(R.drawable.button_disabled);
                searchButton.setBackgroundResource(R.color.colorDisabled);
            }
        });
    }

    @SuppressLint({"SetTextI18n", "DefaultLocale"})
    private void setUIState(UIState state) {
        runOnUiThread(() -> {
            FrameLayout centralLayout = findViewById(R.id.centralLayout);
            LinearLayout recordingTimerLayout = findViewById(R.id.recordingTimerLayout);
            LinearLayout indexingLayout = findViewById(R.id.indexingLayout);
            LinearLayout searchResultsLayout = findViewById(R.id.searchResultsLayout);
            LinearLayout searchLayout = findViewById(R.id.searchLayout);
            TextView statusTextView = findViewById(R.id.statusTextView);

            switch (state) {
                case INTRO:
                    centralLayout.setVisibility(View.INVISIBLE);
                    searchLayout.setVisibility(View.INVISIBLE);
                    statusTextView.setText("Start by recording some audio");
                    break;
                case RECORDING:
                    centralLayout.setVisibility(View.VISIBLE);
                    recordingTimerLayout.setVisibility(View.VISIBLE);
                    indexingLayout.setVisibility(View.INVISIBLE);
                    searchLayout.setVisibility(View.INVISIBLE);
                    searchResultsLayout.setVisibility(View.INVISIBLE);
                    statusTextView.setText("Recording...");
                    break;
                case INDEXING:
                    centralLayout.setVisibility(View.VISIBLE);
                    recordingTimerLayout.setVisibility(View.INVISIBLE);
                    indexingLayout.setVisibility(View.VISIBLE);
                    searchLayout.setVisibility(View.INVISIBLE);
                    searchResultsLayout.setVisibility(View.INVISIBLE);
                    statusTextView.setText("");
                    break;
                case NEW_SEARCH:
                    centralLayout.setVisibility(View.VISIBLE);
                    recordingTimerLayout.setVisibility(View.INVISIBLE);
                    indexingLayout.setVisibility(View.INVISIBLE);
                    searchLayout.setVisibility(View.VISIBLE);
                    searchResultsLayout.setVisibility(View.INVISIBLE);
                    EditText searchText = findViewById(R.id.editTextSearchPhrase);
                    searchText.setText("");
                    statusTextView.setText("Try searching for a phrase in your recording");
                    break;
                case SEARCH_RESULTS:
                    centralLayout.setVisibility(View.VISIBLE);
                    recordingTimerLayout.setVisibility(View.INVISIBLE);
                    indexingLayout.setVisibility(View.INVISIBLE);
                    searchLayout.setVisibility(View.VISIBLE);
                    searchResultsLayout.setVisibility(View.VISIBLE);
                    statusTextView.setText("");
                    break;
                case FATAL_ERROR:
                    centralLayout.setVisibility(View.INVISIBLE);
                    searchLayout.setVisibility(View.INVISIBLE);
                    statusTextView.setText("");
                    break;
                default:
            }
        });
    }

    private void displayFatalError(String message) {
        setUIInteractivity(false);
        setUIState(UIState.FATAL_ERROR);
        runOnUiThread(() -> {
            TextView fatalErrorText = findViewById(R.id.fatalErrorText);
            fatalErrorText.setText(message);
            fatalErrorText.setVisibility(View.VISIBLE);
        });
    }

    private void displayError(String message, int toastLength) {
        runOnUiThread(() -> {
            Toast.makeText(this, message, toastLength).show();
        });
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    @SuppressLint("SetTextI18n")
    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton toggleButton = findViewById(R.id.recordButton);
            toggleButton.toggle();
            displayFatalError("Microphone permission is required for this demo");
        } else {
            toggleRecording(true);
        }
    }

    private void toggleRecording(boolean recording) {
        if (recording) {
            pcmData.clear();
            try {
                voiceProcessor.start(512, octopus.getPcmDataSampleRate());
            } catch (VoiceProcessorException e) {
                displayError(e.toString(), Toast.LENGTH_LONG);
                return;
            }
            setUIInteractivity(true);
            setUIState(UIState.RECORDING);
            recordingTimeSec = 0;

            TextView timerValue = findViewById(R.id.recordingTimerText);
            recordingTimer = new Timer();
            recordingTimer.scheduleAtFixedRate(new TimerTask() {
                @SuppressLint("DefaultLocale")
                @Override
                public void run() {
                    recordingTimeSec += 0.1;
                    runOnUiThread(() -> {
                        timerValue.setText(String.format("%.1f", recordingTimeSec));
                        if (recordingTimeSec >= MAX_RECORDING_SEC) {
                            displayError(
                                    "Max recording length exceeded. Stopping...",
                                    Toast.LENGTH_SHORT);
                            ToggleButton toggleButton = findViewById(R.id.recordButton);
                            toggleButton.setChecked(false);
                            toggleRecording(false);
                        }
                    });
                }
            }, 100, 100);
        } else {
            if (recordingTimer != null) {
                recordingTimer.cancel();
                recordingTimer = null;
            }

            setUIInteractivity(false);
            setUIState(UIState.INDEXING);
            try {
                voiceProcessor.stop();
            } catch (VoiceProcessorException e) {
                displayError(e.toString(), Toast.LENGTH_LONG);
                return;
            }

            short[] pcmDataArray = new short[pcmData.size()];
            for (int i = 0; i < pcmData.size(); ++i) {
                pcmDataArray[i] = pcmData.get(i);
            }

            taskExecutor.execute(() -> {
                try {
                    metadata = octopus.indexAudioData(pcmDataArray);
                } catch (OctopusException e) {
                    displayError(e.getMessage(), Toast.LENGTH_LONG);
                }

                setUIState(UIState.NEW_SEARCH);
                setUIInteractivity(true);
            });
        }
    }

    @SuppressLint({"SetTextI18n", "DefaultLocale"})
    public void displayMatches(OctopusMatch[] matches) {
        runOnUiThread(() -> {
            TextView searchResultsCountText = findViewById(R.id.searchResultsCountText);
            LinearLayout resultsTableHeader = findViewById(R.id.resultsTableHeader);
            RecyclerView searchResultsView = findViewById(R.id.searchResultsView);
            if (matches.length == 0) {
                searchResultsCountText.setText("No matches found");
                resultsTableHeader.setVisibility(View.INVISIBLE);
                searchResultsView.setVisibility(View.INVISIBLE);
                return;
            }

            String plural = matches.length > 1 ? "matches" : "match";
            searchResultsCountText.setText(String.format("%d %s found", matches.length, plural));
            resultsTableHeader.setVisibility(View.VISIBLE);
            searchResultsView.setVisibility(View.VISIBLE);

            for (OctopusMatch match : matches) {
                Log.i(
                        "OctopusDemo",
                        String.format(
                                "%f -> %f (%f)%n",
                                match.getStartSec(),
                                match.getEndSec(),
                                match.getProbability()));
            }

            LinearLayoutManager linearLayoutManager = new LinearLayoutManager(getApplicationContext());
            searchResultsView.setLayoutManager(linearLayoutManager);

            SearchResultsViewAdaptor searchResultsViewAdaptor = 
                    new SearchResultsViewAdaptor(getApplicationContext(), Arrays.asList(matches));
            searchResultsView.setAdapter(searchResultsViewAdaptor);
        });
    }

    public void onSearchClick(View view) {
        EditText searchText = findViewById(R.id.editTextSearchPhrase);
        String searchPhrase = searchText.getText().toString().trim();
        if (searchPhrase.length() == 0) {
            displayError("Please enter a search phrase", Toast.LENGTH_SHORT);
            return;
        }

        setUIInteractivity(false);

        taskExecutor.execute(() -> {
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
                displayError(e.getMessage(), Toast.LENGTH_LONG);
            } finally {
                setUIState(UIState.SEARCH_RESULTS);
                setUIInteractivity(true);
            }
        });
    }

    public void onRecordClick(View view) {
        ToggleButton recordButton = findViewById(R.id.recordButton);
        if (recordButton.isChecked()) {
            if (voiceProcessor.hasRecordAudioPermission(this)) {
                toggleRecording(true);
            } else {
                setUIInteractivity(false);
                requestRecordPermission();
            }
        } else {
            toggleRecording(false);
        }
    }

    private enum UIState {
        INTRO,
        RECORDING,
        INDEXING,
        NEW_SEARCH,
        SEARCH_RESULTS,
        FATAL_ERROR
    }

    public static class SearchResultsViewAdaptor extends RecyclerView.Adapter<SearchResultsViewAdaptor.ViewHolder> {
        private final List<OctopusMatch> data;
        private final LayoutInflater inflater;

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
}
