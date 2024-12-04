//
//  Copyright 2022-2024 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import XCTest

import Octopus

class OctopusLanguageTests: BaseTest {

    static var testData: [[Any]] = [
        ["en", [
            "alexa": [[7.648, 8.352, 1]],
            "porcupine": [[5.728, 6.752, 1], [35.360, 36.416, 0.946]]
        ]],
        ["de", ["ananas": [[0.000, 0.704, 1]]]],
        ["es", ["manzana": [[5.184, 5.984, 1]]]],
        ["fr", ["perroquet": [[4.352, 5.184, 0.99]]]],
        ["it", ["porcospino": [[0.480, 1.728, 1]]]],
        ["ja", ["りんご": [[0.992, 1.632, 1]]]],
        ["ko", ["아이스크림": [[6.592, 7.520, 0.961]]]],
        ["pt", ["porco espinho": [[0.480, 1.792, 1]]]]
    ]

    func testWrapper() throws {
        let bundle = Bundle(for: type(of: self))

        for testCase in OctopusLanguageTests.testData {
            let suffix = (testCase[0]) as! String == "en" ? "" : "_\(testCase[0])"

            let testAudioPath = bundle.path(
                forResource: "multiple_keywords\(suffix)",
                ofType: "wav",
                inDirectory: "test_resources/audio")!
            let modelPath = bundle.path(
                forResource: "octopus_params\(suffix)",
                ofType: "pv",
                inDirectory: "test_resources/model_files")!

            let expectedResults = testCase[1] as! [String: [[Double]]]

            try XCTContext.runActivity(named: "(\(testCase[0]))") { _ in
                let octopus = try Octopus(accessKey: accessKey, modelPath: modelPath)
                let metadata = try octopus.indexAudioFile(path: testAudioPath)
                let matches = try octopus.search(metadata: metadata, phrases: Set(expectedResults.keys))

                for (phrase, expectedMatches) in expectedResults {
                    XCTAssert(matches[phrase]!.count == expectedMatches.count)

                    let phraseMatches = matches[phrase]!
                    for i in 0...phraseMatches.count - 1 {
                        XCTAssertEqual(phraseMatches[i].startSec, Float(expectedMatches[i][0]), accuracy: 0.01)
                        XCTAssertEqual(phraseMatches[i].endSec, Float(expectedMatches[i][1]), accuracy: 0.01)
                        XCTAssertEqual(phraseMatches[i].probability, Float(expectedMatches[i][2]), accuracy: 0.01)
                    }
                }

                metadata.delete()
                octopus.delete()
            }
        }
    }
}
