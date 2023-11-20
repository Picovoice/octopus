//
//  Copyright 2022-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

public class OctopusError: LocalizedError {
    private let message: String
    private let messageStack: [String]

    public init (_ message: String, _ messageStack: [String] = []) {
        self.message = message
        self.messageStack = messageStack
    }

    public var errorDescription: String? {
        var messageString = message
        if messageStack.count > 0 {
            messageString += ":"
            for i in 0..<messageStack.count {
                messageString += "\n  [\(i)] \(messageStack[i])"
            }
        }
        return messageString
    }

    public var name: String {
        get {
            return String(describing: type(of: self))
        }
    }
}

public class OctopusMemoryError: OctopusError {}

public class OctopusIOError: OctopusError {}

public class OctopusInvalidArgumentError: OctopusError {}

public class OctopusStopIterationError: OctopusError {}

public class OctopusKeyError: OctopusError {}

public class OctopusInvalidStateError: OctopusError {}

public class OctopusRuntimeError: OctopusError {}

public class OctopusActivationError: OctopusError {}

public class OctopusActivationLimitError: OctopusError {}

public class OctopusActivationThrottledError: OctopusError {}

public class OctopusActivationRefusedError: OctopusError {}
