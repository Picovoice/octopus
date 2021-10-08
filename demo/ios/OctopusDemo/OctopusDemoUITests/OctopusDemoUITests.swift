//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import XCTest
import Octopus

class OctopusDemoUITests: XCTestCase {
    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"
    
    let phrases: Set<String> = ["gorilla", "terminator"]
    let expectedMatch = OctopusMatch(
        startSec: 39.168,
        endSec: 40.128,
        probability: 1.0)
    
    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    override func tearDownWithError() throws {
        
    }

    func testIndexAndSearchFile() throws {
        let bundle = Bundle(for: type(of: self))
        let audioFilePath = bundle.path(forResource: "audio/multiple_keywords", ofType: "wav")!
        
        let octopus = try Octopus(accessKey: accessKey)
        let metadata = try octopus.indexAudioFile(path: audioFilePath)
        let matches = try octopus.search(metadata: metadata, phrases: phrases)
        XCTAssert(matches["gorilla"]!.count == 0)
        XCTAssert(matches["terminator"]!.count == 1)
        
        let terminatorMatches = matches["terminator"]!
        XCTAssert(terminatorMatches[0].startSec == expectedMatch.startSec)
        XCTAssert(terminatorMatches[0].endSec == expectedMatch.endSec)
        XCTAssert(terminatorMatches[0].probability == expectedMatch.probability)
        
        metadata.delete()
        octopus.delete()
    }

    func testIndexAndSearchData() throws {
        let bundle = Bundle(for: type(of: self))
        let fileURL:URL = bundle.url(forResource: "audio/multiple_keywords", withExtension: "wav")!
        let audioData = try Data(contentsOf: fileURL)
        var pcm = Array<Int16>(repeating: 0, count: (audioData.count - 44) / 2)
        _ = pcm.withUnsafeMutableBytes {
            audioData.copyBytes(to: $0, from: 44..<audioData.count)
        }
        
        let octopus = try Octopus(accessKey: accessKey)
        let metadata = try octopus.indexAudioData(pcm: pcm)
        let matches = try octopus.search(metadata: metadata, phrases: phrases)
        XCTAssert(matches["gorilla"]!.count == 0)
        XCTAssert(matches["terminator"]!.count == 1)
        
        let terminatorMatches = matches["terminator"]!
        XCTAssert(terminatorMatches[0].startSec == expectedMatch.startSec)
        XCTAssert(terminatorMatches[0].endSec == expectedMatch.endSec)
        XCTAssert(terminatorMatches[0].probability == expectedMatch.probability)
        
        metadata.delete()
        octopus.delete()
    }
    
    func testMetadataMarshalling() throws {
        let bundle = Bundle(for: type(of: self))
        let audioFilePath = bundle.path(forResource: "audio/multiple_keywords", ofType: "wav")!
        
        let octopus = try Octopus(accessKey: accessKey)
        var metadata:OctopusMetadata? = try octopus.indexAudioFile(path: audioFilePath)
        
        let metadataBytes = try metadata!.getBytes()
        XCTAssert(metadataBytes.count == 227360)
        metadata!.delete()
        metadata = nil
        XCTAssert(metadataBytes.count == 227360)
        
        metadata = OctopusMetadata(metadataBytes: metadataBytes)
        let matches = try octopus.search(metadata: metadata!, phrases: phrases)
        XCTAssert(matches["gorilla"]!.count == 0)
        XCTAssert(matches["terminator"]!.count == 1)
        
        let terminatorMatches = matches["terminator"]!
        XCTAssert(terminatorMatches[0].startSec == expectedMatch.startSec)
        XCTAssert(terminatorMatches[0].endSec == expectedMatch.endSec)
        XCTAssert(terminatorMatches[0].probability == expectedMatch.probability)
        
        metadata!.delete()
        octopus.delete()
    }
}
