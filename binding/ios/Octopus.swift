//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation
import PvOctopus

public struct OctopusMatch {
    public let startSec: Float
    public let endSec: Float
    public let probability: Float
    
    public init(startSec: Float, endSec: Float, probability: Float) {
        self.startSec = startSec
        self.endSec = endSec
        self.probability = probability
    }
}

public enum OctopusError: Error {
    case invalidArgument(message:String)
    case io
    case outOfMemory
    case invalidState
    case activationError
    case activationRefused
    case activationLimitReached
    case activationThrottled
}

/// iOS binding for Octopus Speech-to-Index engine. It transforms audio into searchable metadata.
public class Octopus {

    /// Required audio sample rate for PCM data
    public static let pcmDataSampleRate = Int(pv_sample_rate())

    /// Octopus version
    public static let version = String(cString: pv_octopus_version())

    private var handle: OpaquePointer?

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from the Picvoice Console (https://picovoice.ai/console/)
    ///   - modelPath: Absolute path to file containing model parameters.
    /// - Throws: OctopusError
    public init(accessKey:String, modelPath:String? = nil) throws {
        
        var modelPathArg = modelPath
        
        if (modelPath == nil) {
            let bundle = Bundle(for: type(of: self))
            
            modelPathArg  = bundle.path(forResource: "octopus_params", ofType: "pv")
            if modelPathArg == nil {
                throw OctopusError.io
            }
        }
     
        if !FileManager().fileExists(atPath: modelPathArg!){
            throw OctopusError.invalidArgument(message: "Model file at does not exist at '\(modelPathArg!)'")
        }
            
        let status = pv_octopus_init(
            accessKey,
            modelPathArg,
            &handle)
        try checkStatus(status)
    }
    
    deinit {
        self.delete()
    }
    
    /// Releases resources acquired by Octopus.
    public func delete() {
        if handle != nil {
            pv_octopus_delete(handle);
            handle = nil
        }
    }
    
    /// Indexes raw PCM data.
    ///
    /// - Parameters:
    ///   - pcm: An array of audio samples. The audio needs to have a sample rate
    ///          equal to `.pcmDataSampleRate` and be single-channel, 16-bit linearly-encoded.
    /// - Throws: OctopusError
    /// - Returns: OctopusMetadata object that is used to perform searches
    public func indexAudioData(pcm:[Int16]) throws -> OctopusMetadata {
        
        if handle == nil {
            throw OctopusError.invalidState
        }
        
        var cMetadata: UnsafeMutableRawPointer?
        var cNumMetadataBytes : Int32 = -1
        let status = pv_octopus_index(
            handle,
            pcm,
            Int32(pcm.count),
            &cMetadata,
            &cNumMetadataBytes)
        
        try checkStatus(status)
        
        let numMetadataBytes = Int(cNumMetadataBytes)
        let metadata = cMetadata!.bindMemory(to: UInt8.self, capacity: numMetadataBytes)
        
        return OctopusMetadata(handle: metadata, numBytes: numMetadataBytes)
    }
    
    /// Reads and indexes a given audio file.
    ///
    /// - Parameters:
    ///   - path: Absolute path to an audio file.
    /// - Throws: OctopusError
    /// - Returns: OctopusMetadata object that is used to perform searches
    public func indexAudioFile(path:String) throws -> OctopusMetadata {
        if handle == nil {
            throw OctopusError.invalidState
        }
        
        if !FileManager().fileExists(atPath: path){
            throw OctopusError.invalidArgument(message: "Audio file at does not exist at '\(path)'")
        }
        
        var cMetadata: UnsafeMutableRawPointer?
        var cNumMetadataBytes : Int32 = -1
        let status = pv_octopus_index_file(
            handle,
            path,
            &cMetadata,
            &cNumMetadataBytes)
        
        try checkStatus(status)
        
        let numMetadataBytes = Int(cNumMetadataBytes)
        let metadata = cMetadata!.bindMemory(to: UInt8.self, capacity: numMetadataBytes)
        
        return OctopusMetadata(handle: metadata, numBytes: numMetadataBytes)
    }
    
    /// Reads and indexes a given audio file.
    ///
    /// - Parameters:
    ///   - metadata: An `OctopusMetadata` object obtained via `.indexAudioData` or `.indexAudioFile`
    ///   - phrases: A set of phrases to search for in the metadata
    /// - Throws: OctopusError
    /// - Returns: A dictionary of phrases and match arrays. Matches are represented by immutable `OctopusMatch` objects.
    public func search(metadata: OctopusMetadata, phrases:Set<String>) throws -> Dictionary<String, [OctopusMatch] >{
        if handle == nil {
            throw OctopusError.invalidState
        }
        
        var matches = Dictionary<String, [OctopusMatch]>()
        
        for phrase in phrases {
            var cMatches:UnsafeMutablePointer<pv_octopus_match_t>?
            var cNumMatches:Int32 = -1
        
            let status = pv_octopus_search(handle,
                              metadata.handle,
                              Int32(metadata.numBytes),
                              phrase,
                              &cMatches,
                              &cNumMatches)
            try checkStatus(status)
            
            let numPhraseMatches = Int(cNumMatches)
            var phraseMatches = [OctopusMatch]()
            for cMatch in UnsafeBufferPointer(start: cMatches, count: numPhraseMatches) {
                let phraseMatch = OctopusMatch(
                    startSec: Float(cMatch.start_sec),
                    endSec: Float(cMatch.end_sec),
                    probability: Float(cMatch.probability))
                phraseMatches.append(phraseMatch)
            }
            
            matches[phrase] = phraseMatches
            
        }
        
        return matches
    }
    
    private func checkStatus(_ status: pv_status_t) throws {
            switch status {
                case PV_STATUS_IO_ERROR:
                    throw OctopusError.io
                case PV_STATUS_OUT_OF_MEMORY:
                    throw OctopusError.outOfMemory
                case PV_STATUS_INVALID_ARGUMENT:
                    throw OctopusError.invalidArgument(message:"Octopus rejected one of the provided arguments.")
                case PV_STATUS_INVALID_STATE:
                    throw OctopusError.invalidState
                default:
                    return
            }
        }
}
