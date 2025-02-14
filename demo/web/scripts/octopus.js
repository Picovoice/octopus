let audioContext = new (window.AudioContext || window.webKitAudioContext)({
  sampleRate: 16000,
});

function writeStatus(status) {
  console.log(status);
  document.getElementById("status").innerHTML = status;
}

function readAudioFile(selectedFile, callback) {
  let reader = new FileReader();
  reader.onload = function (ev) {
    let wavBytes = reader.result;
    audioContext.decodeAudioData(wavBytes, callback);
  };
  reader.readAsArrayBuffer(selectedFile);
}

let octopusMetadata = undefined;

function octopusSearchHandler(matches) {
  document.getElementById("result").style.display = "block";
  document.getElementById("result-table").style.display = "block";

  document.getElementById("result").innerHTML =
    `Search results (${matches.length}):<br>`;
  const table = document.getElementById("result-table");
  const rowCount = table.rows.length;
  for (let i = 1; i < rowCount; i++) {
    table.deleteRow(1);
  }
  matches.forEach((match) => {
    const row = table.insertRow(-1);
    const start = row.insertCell(0);
    const end = row.insertCell(1);
    const probability = row.insertCell(2);

    start.innerHTML = `${match.startSec.toFixed(3)}`;
    end.innerHTML = `${match.endSec.toFixed(3)}`;
    probability.innerHTML = `${match.probability.toFixed(3)}`;
  });
}

async function startOctopus(accessKey) {
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("search").style.display = "none";
  document.getElementById("result").style.display = "none";
  document.getElementById("result-table").style.display = "none";
  writeStatus("Octopus is loading. Please wait...");
  let engineHandle = undefined;
  try {
    engineHandle = await OctopusWeb.OctopusWorker.create(accessKey, {
      base64: modelParams,
    });
  } catch (err) {
    document.getElementById("accessKey").style.border = "1px solid red";
    console.error(err);
    return;
  }
  document.getElementById("accessKey").style.border = "";
  writeStatus("Octopus worker ready! Select a .wav file to index.");
  document.getElementById("dashboard").style.display = "block";

  const fileSelector = document.getElementById("file-selector");
  fileSelector.addEventListener("change", (event) => {
    document.getElementById("search").style.display = "none";
    document.getElementById("result").style.display = "none";
    document.getElementById("result-table").style.display = "none";
    writeStatus("Indexing audio; please wait...");
    const fileList = event.target.files;
    readAudioFile(fileList[0], async (audioBuffer) => {
      const f32PCM = audioBuffer.getChannelData(0);
      const i16PCM = new Int16Array(f32PCM.length);

      const INT16_MAX = 32767;
      const INT16_MIN = -32768;
      i16PCM.set(
        f32PCM.map((f) => {
          let i = Math.trunc(f * INT16_MAX);
          if (f > INT16_MAX) i = INT16_MAX;
          if (f < INT16_MIN) i = INT16_MIN;
          return i;
        }),
      );

      octopusMetadata = await engineHandle.index(i16PCM, { transfer: true });
      document.getElementById("search").style.display = "block";
      writeStatus("Audio indexed! Enter a phrase to search the index.");
    });
  });

  const searchForm = document.getElementById("search-form");
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const searchText = document.getElementById("search-phrase").value;
    if (searchText.trim() === "") {
      document.getElementById("search-phrase").style.border = "1px solid red";
      writeStatus("Search phrase is empty");
    } else if (octopusMetadata) {
      document.getElementById("search-phrase").style.border = "";
      writeStatus(`Searching for ${searchText}...`);
      let matches = await engineHandle.search(octopusMetadata, searchText);
      octopusSearchHandler(matches);
    } else {
      writeStatus("Please index an audio file first");
    }
  });
}
