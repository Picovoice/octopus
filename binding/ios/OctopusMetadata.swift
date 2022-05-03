//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation

public class OctopusMetadata {
    var handle: UnsafeMutablePointer<UInt8>?
    let numBytes: Int
    
    init(handle: UnsafeMutablePointer<UInt8>, numBytes: Int) {
        self.handle = handle
        self.numBytes = numBytes
    }
    
    /// Constructor.
    ///
    /// - Parameters:
    ///   - metadataBytes: A byte array that was previously obtained via `getBytes`
    public init(metadataBytes:[UInt8]) {
        self.handle = UnsafeMutablePointer<UInt8>.allocate(capacity: metadataBytes.count)
        self.handle?.initialize(from: metadataBytes, count: metadataBytes.count)
        self.numBytes = metadataBytes.count
    }
    
    deinit {
        self.delete()
    }
    
    /// Releases resources aquired by `OctopusMetadata`
    public func delete() {
        if handle != nil {
            handle!.deallocate()
            handle = nil
        }
    }
    
    /// Gets a binary representation of the metadata
    ///
    /// - Throws: OctopusError
    /// - Returns: A byte array of the metadata
    public func getBytes() throws -> [UInt8] {
        if handle == nil {
            throw OctopusInvalidStateError("Octopus metadata has been deleted")
        }
        
        return Array(UnsafeBufferPointer(start: handle, count:numBytes))
    }
    
}
