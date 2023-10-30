//
//  Copyright 2021-2023 Picovoice Inc.
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

/// iOS binding for Octopus Speech-to-Index engine. It transforms audio into searchable metadata.
public class Octopus {

    /// Required audio sample rate for PCM data
    public static let pcmDataSampleRate = Int(pv_sample_rate())

    /// Octopus version
    public static let version = String(cString: pv_octopus_version())

    private var handle: OpaquePointer?

    private static var sdk = "ios"

    public static func setSdk(sdk: String) {
        self.sdk = sdk
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from the Picovoice Console (https://console.picovoice.ai/)
    ///   - modelPath: Absolute path to file containing model parameters.
    /// - Throws: OctopusError
    public init(accessKey: String, modelPath: String? = nil) throws {

        var modelPathArg = modelPath

        if modelPath == nil {
            let bundle = Bundle(for: type(of: self))

            modelPathArg = bundle.path(forResource: "octopus_params", ofType: "pv")
            if modelPathArg == nil {
                throw OctopusIOError("Could not retrieve default model from app bundle")
            }
        }

        if !FileManager().fileExists(atPath: modelPathArg!) {
            modelPathArg = try getResourcePath(modelPathArg!)
        }

        pv_set_sdk(Octopus.sdk)

        let status = pv_octopus_init(
            accessKey,
            modelPathArg,
            &handle)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToOctopusError(status, "Octopus init failed")
        }
    }

    deinit {
        self.delete()
    }

    /// Releases resources acquired by Octopus.
    public func delete() {
        if handle != nil {
            pv_octopus_delete(handle)
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
    public func indexAudioData(pcm: [Int16]) throws -> OctopusMetadata {

        if handle == nil {
            throw OctopusInvalidStateError("Octopus must be initialized before indexing")
        }

        var cNumMetadataBytes: Int32 = -1
        var status = pv_octopus_index_size(
            handle,
            Int32(pcm.count),
            &cNumMetadataBytes)

        if status != PV_STATUS_SUCCESS {
            throw pvStatusToOctopusError(status, "Octopus failed to determine index buffer size")
        }

        let numMetadataBytes = Int(cNumMetadataBytes)
        var cMetadata: UnsafeMutableRawPointer? = UnsafeMutablePointer.allocate(capacity: numMetadataBytes)

        status = pv_octopus_index(
            handle,
            pcm,
            Int32(pcm.count),
            cMetadata)

        if status != PV_STATUS_SUCCESS {
            throw pvStatusToOctopusError(status, "Octopus index failed")
        }
        
        let metadata = cMetadata!.bindMemory(to: UInt8.self, capacity: numMetadataBytes)
        free(cMetadata)

        return OctopusMetadata(handle: metadata, numBytes: numMetadataBytes)
    }

    /// Reads and indexes a given audio file.
    ///
    /// - Parameters:
    ///   - path: Absolute path to an audio file.
    /// - Throws: OctopusError
    /// - Returns: OctopusMetadata object that is used to perform searches
    public func indexAudioFile(path: String) throws -> OctopusMetadata {
        if handle == nil {
            throw OctopusInvalidStateError("Octopus must be initialized before indexing")
        }

        var pathArg = path
        if !FileManager().fileExists(atPath: pathArg) {
            pathArg = try getResourcePath(pathArg)
        }

        var cNumMetadataBytes: Int32 = -1
        var status = status = pv_octopus_index_file_size(
            handle,
            pathArg,
            &cNumMetadataBytes)

        if status != PV_STATUS_SUCCESS {
            throw pvStatusToOctopusError(status, "Octopus failed to determine index buffer size")
        }

        let numMetadataBytes = Int(cNumMetadataBytes)
        var cMetadata: UnsafeMutableRawPointer?

        status = pv_octopus_index_file(
                handle,
                pathArg,
                cMetadata)

        if status != PV_STATUS_SUCCESS {
            throw pvStatusToOctopusError(status, "Octopus index failed")
        }

        let metadata = cMetadata!.bindMemory(to: UInt8.self, capacity: numMetadataBytes)
        free(cMetadata)

        return OctopusMetadata(handle: metadata, numBytes: numMetadataBytes)
    }

    /// Reads and indexes a given audio file.
    ///
    /// - Parameters:
    ///   - metadata: An `OctopusMetadata` object obtained via `.indexAudioData` or `.indexAudioFile`
    ///   - phrases: A set of phrases to search for in the metadata
    /// - Throws: OctopusError
    /// - Returns: A dictionary of phrases and match arrays. 
    ///   Matches are represented by immutable `OctopusMatch` objects.
    public func search(metadata: OctopusMetadata, phrases: Set<String>) throws -> [String: [OctopusMatch]] {
        if handle == nil {
            throw OctopusInvalidStateError("Octopus must be initialized before searching")
        }

        var matches = [String: [OctopusMatch]]()

        for phrase in phrases {

            let formattedPhrase: String = phrase.trimmingCharacters(in: .whitespacesAndNewlines)
                .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
                .replacingOccurrences(of: "[‘’]+", with: "'", options: .regularExpression)
                .split(separator: " ")
                .joined(separator: " ")

            if formattedPhrase.isEmpty {
                throw OctopusInvalidArgumentError("Search phrase cannot be empty")
            }

            var cMatches: UnsafeMutablePointer<pv_octopus_match_t>?
            var cNumMatches: Int32 = -1

            let status = pv_octopus_search(
                handle,
                metadata.handle,
                Int32(metadata.numBytes),
                formattedPhrase,
                &cMatches,
                &cNumMatches)
            if status != PV_STATUS_SUCCESS {
                throw pvStatusToOctopusError(status, "Octopus search failed")
            }

            let numPhraseMatches = Int(cNumMatches)
            var phraseMatches = [OctopusMatch]()
            for cMatch in UnsafeBufferPointer(start: cMatches, count: numPhraseMatches) {
                let phraseMatch = OctopusMatch(
                    startSec: Float(cMatch.start_sec),
                    endSec: Float(cMatch.end_sec),
                    probability: Float(cMatch.probability))
                phraseMatches.append(phraseMatch)
            }
            pv_octopus_matches_delete(cMatches)

            matches[formattedPhrase] = phraseMatches
        }

        return matches
    }

    /// Given a path, return the full path to the resource.
    ///
    /// - Parameters:
    ///   - filePath: relative path of a file in the bundle.
    /// - Throws: OctopusIOError
    /// - Returns: The full path of the resource.
    private func getResourcePath(_ filePath: String) throws -> String {
        if let resourcePath = Bundle(for: type(of: self)).resourceURL?.appendingPathComponent(filePath).path {
            if FileManager.default.fileExists(atPath: resourcePath) {
                return resourcePath
            }
        }

        throw OctopusIOError(
            "Could not find file at path '\(filePath)'." +
            "If this is a packaged asset, ensure you have added it to your xcode project.")
    }

    private func pvStatusToOctopusError(
        _ status: pv_status_t,
        _ message: String,
        _ messageStack: [String] = [) -> OctopusError {
        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            return OctopusMemoryError(message, messageStack)
        case PV_STATUS_IO_ERROR:
            return OctopusIOError(message, messageStack)
        case PV_STATUS_INVALID_ARGUMENT:
            return OctopusInvalidArgumentError(message, messageStack)
        case PV_STATUS_STOP_ITERATION:
            return OctopusStopIterationError(message, messageStack)
        case PV_STATUS_KEY_ERROR:
            return OctopusKeyError(message, messageStack)
        case PV_STATUS_INVALID_STATE:
            return OctopusInvalidStateError(message, messageStack)
        case PV_STATUS_RUNTIME_ERROR:
            return OctopusRuntimeError(message, messageStack)
        case PV_STATUS_ACTIVATION_ERROR:
            return OctopusActivationError(message, messageStack)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            return OctopusActivationLimitError(message, messageStack)
        case PV_STATUS_ACTIVATION_THROTTLED:
            return OctopusActivationThrottledError(message, messageStack)
        case PV_STATUS_ACTIVATION_REFUSED:
            return OctopusActivationRefusedError(message, messageStack)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
            return OctopusError("\(pvStatusString): \(message)", messageStack)
        }
    }

    private func getMessageStack() throws -> [String] {
        var messageStackRef: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var messageStackDepth: Int32 = 0
        let status = pv_get_error_stack(&messageStackRef, &messageStackDepth)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToPorcupineError(status, "Unable to get Porcupine error state")
        }

        var messageStack: [String] = []
        for i in 0..<messageStackDepth {
            messageStack.append(String(cString: messageStackRef!.advanced(by: Int(i)).pointee!))
        }

        pv_free_error_stack(messageStackRef)

        return messageStack
    }
}
