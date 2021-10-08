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

class ViewModel: ObservableObject {
    
    private let ACCESS_KEY = "{YOUR_ACCESS_KEY_HERE}"
    
    private var octopus:Octopus!
    private var metadata:OctopusMetadata!
    
    private var audioRecorder: AVAudioRecorder!
    private var isListening = false
    
    @Published var recordToggleButtonText:String = "Start"
    @Published var searchPhraseText:String = ""
    @Published var results:[OctopusMatch] = []
    @Published var messageText = "Press Start to begin recording audio"
    @Published var errorMessage = ""
    
    init() {
        do {
            try octopus = Octopus(accessKey: ACCESS_KEY)
        } catch OctopusError.invalidArgument {
            errorMessage = "ACCESS_KEY provided is invalid."
        } catch OctopusError.activationError {
            errorMessage = "ACCESS_KEY activation error."
        } catch OctopusError.activationRefused {
            errorMessage = "ACCESS_KEY activation refused."
        } catch OctopusError.activationLimitReached {
            errorMessage = "ACCESS_KEY reached its limit."
        } catch OctopusError.activationThrottled {
            errorMessage = "ACCESS_KEY is throttled."
        } catch {
            errorMessage = "\(error)"
        }
    }
    
    deinit {
        try! stop();
        octopus.delete();
    }
    
    public func toggleRecording(){
        if (octopus == nil) {
            messageText = "Octopus was not initalized"
            return;
        }
        
        do {
            if isListening {
                messageText = "Indexing... Please wait"
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.01) {
                    try! self.stop();
                    self.recordToggleButtonText = "Start"
                    self.messageText = "Audio indexing complete!"
                }
            } else {
                try start();
                results = []
                messageText = "Recording..."
                recordToggleButtonText = "Stop"
            }
        } catch {
            print("\(error)")
        }
    }
    
    public func searchMetadata(){
        guard metadata != nil else {
            messageText = "Please record some audio first"
            return
        }
        
        searchPhraseText = searchPhraseText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !searchPhraseText.isEmpty else {
            messageText = "Please enter a search phrase"
            return
        }
        
        do {
            let searchResults = try octopus.search(metadata: metadata, phrases: Set([searchPhraseText]))
            if (searchResults[searchPhraseText] != nil) {
                results = searchResults[searchPhraseText]!;
                for result in results {
                    print(result)
                }
                messageText = String(format: "Found %d matches", results.count);
            }
        } catch {
            print("\(error)")
        }
    }
    
    public func start() throws {
        guard !isListening else {
            return
        }
        
        let audioSession = AVAudioSession.sharedInstance()
        if audioSession.recordPermission == .denied {
            messageText = "Recording permission is required for this demo";
            return;
        }
        
        try audioSession.setActive(true);
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
        let format = AVAudioFormat(streamDescription: &formatDescription)!;
        
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
        
        let path = directoryContents[0].path;
        metadata = try octopus.indexAudioFile(path: path);
    }
}
