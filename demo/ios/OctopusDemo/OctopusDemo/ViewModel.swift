//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import Foundation
import Octopus

enum UIState {
    case INTRO
    case RECORDING
    case INDEXING
    case NEW_SEARCH
    case ZERO_SEARCH_RESULTS
    case SEARCH_RESULTS
    case FATAL_ERROR
}

class ViewModel: ObservableObject {
    
    private let ACCESS_KEY = "Nj93iN5VjmLvoeefKxrfqMXtzxYTAYiWo/tFb8JftF7IrNkpyGoyWw=="
    
    private var octopus:Octopus!
    private var metadata:OctopusMetadata!
    
    private var recordingTimer = Timer()
    private var audioRecorder: AVAudioRecorder!
    private var isListening = false
    private let MAX_RECORDING_LENGTH_SEC = 120.0
    
    @Published var recordToggleButtonText:String = "Start"
    @Published var searchPhraseText:String = ""
    @Published var results:[OctopusMatch] = []
    @Published var statusText = ""
    @Published var showErrorAlert = false
    @Published var errorAlertMessage = ""
    @Published var errorMessage = ""
    @Published var state:UIState = UIState.INTRO
    @Published var isBusy:Bool = false
    @Published var searchResultCountText:String = "# matches found"
    @Published var recordingTimeSec = 0.0
    
    init() {
        isBusy = true
        do {
            try octopus = Octopus(accessKey: ACCESS_KEY)
            statusText = "Start by recording some audio"
            isBusy = false
        } catch OctopusError.OctopusInvalidArgumentError {
            onOctopusInitFail("ACCESS_KEY '\(ACCESS_KEY)' is invalid")
        } catch OctopusError.OctopusActivationError {
            errorMessage = "ACCESS_KEY activation error"
        } catch OctopusError.OctopusActivationRefusedError {
            errorMessage = "ACCESS_KEY activation refused"
        } catch OctopusError.OctopusActivationLimitError {
            errorMessage = "ACCESS_KEY reached its limit"
        } catch OctopusError.OctopusActivationThrottledError  {
            errorMessage = "ACCESS_KEY is throttled"
        } catch {
            errorMessage = "\(error)"
        }
    }
    
    deinit {
        do {
            try stop()
        } catch {
            showErrorAlert("\(error)")
        }
        octopus.delete()
    }
    
    func onOctopusInitFail(_ initError:String) {
        errorMessage = initError
        state = UIState.FATAL_ERROR
    }
    
    public func toggleRecording() {
        if isListening {
            toggleRecordingOff()
        } else {
            toggleRecordingOn()
        }
    }
    
    public func toggleRecordingOff() {
        recordingTimer.invalidate()
        statusText = ""
        state = UIState.INDEXING
        isBusy = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.01) {
            do {
                try self.stop()
                self.results = []
                self.searchPhraseText = ""
                self.state = UIState.NEW_SEARCH
                self.statusText = "Try searching for a phrase in your recording"
            } catch {
                self.showErrorAlert("\(error)")
            }
            self.isBusy = false
        }
    }
    
    public func toggleRecordingOn(){
        isBusy = true
        recordingTimeSec = 0
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
            self.recordingTimeSec += 0.1
            if(self.recordingTimeSec > self.MAX_RECORDING_LENGTH_SEC) {
                self.toggleRecordingOff()
                self.showErrorAlert("Recording exceeded max recording length")
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.01) {
            do {
                try self.start()
                self.statusText = "Recording..."
                self.state = UIState.RECORDING
            } catch {
                self.showErrorAlert("\(error)")
            }
            self.isBusy = false
        }
    }
    
    public func searchMetadata(){
        
        let resign = #selector(UIResponder.resignFirstResponder)
        UIApplication.shared.sendAction(resign, to: nil, from: nil, for: nil)
        
        searchPhraseText = searchPhraseText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !searchPhraseText.isEmpty else {
            showErrorAlert("Search phrase cannot be empty")
            return
        }
        
        do {
            let searchResults = try octopus.search(metadata: metadata, phrases: Set([searchPhraseText]))
            for (_, matches) in searchResults {
                results = matches
                for result in results {
                    print(result)
                }
                
                statusText = ""
                if results.count == 0 {
                    searchResultCountText = "No matches found"
                    state = UIState.ZERO_SEARCH_RESULTS
                } else {
                    let pluralMatch = results.count == 1 ? "match" : "matches"
                    searchResultCountText = "\(results.count) \(pluralMatch) found"
                    state = UIState.SEARCH_RESULTS
                }
            }
        
        } catch OctopusError.OctopusInvalidArgumentError(let errorMessage) {
            showErrorAlert(errorMessage)
        } catch {
            showErrorAlert("\(error)")
        }
    }
    
    public func showErrorAlert(_ message: String) {
        errorAlertMessage = message
        showErrorAlert = true
    }
    
    public func start() throws {
        guard !isListening else {
            return
        }
        
        let audioSession = AVAudioSession.sharedInstance()
        if audioSession.recordPermission == .denied {
            errorMessage = "Recording permission is required for this demo"
            state = UIState.FATAL_ERROR
            statusText = ""
            return
        }
        
        try audioSession.setActive(true)
        try audioSession.setCategory(AVAudioSession.Category.playAndRecord,
                                     options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth])
        
        let documentPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let audioFilename = documentPath.appendingPathComponent("OctupusDemo.wav")
        
        var formatDescription = AudioStreamBasicDescription(
            mSampleRate: Float64(Octopus.pcmDataSampleRate),
            mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked,
            mBytesPerPacket: 2,
            mFramesPerPacket: 1,
            mBytesPerFrame: 2,
            mChannelsPerFrame: 1,
            mBitsPerChannel: 16,
            mReserved: 0)
        let format = AVAudioFormat(streamDescription: &formatDescription)!
        
        audioRecorder = try AVAudioRecorder(url: audioFilename, format: format)
        audioRecorder.record()
        isListening = true
    }
    
    public func stop() throws {
        guard isListening else {
            return
        }
        
        audioRecorder.stop()
        isListening = false
        
        let fileManager = FileManager.default
        let documentDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let directoryContents = try fileManager.contentsOfDirectory(at: documentDirectory, includingPropertiesForKeys: nil)
        
        let path = directoryContents[0].path
        metadata = try octopus.indexAudioFile(path: path)
    }
}
