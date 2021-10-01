//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//
import SwiftUI

struct ContentView: View {
    @StateObject var viewModel = ViewModel()
    
    let activeBlue = Color(red: 55/255, green: 125/255, blue: 1, opacity: 1)
    let detectionBlue = Color(red: 0, green: 229/255, blue: 195/255, opacity: 1)
    let dangerRed = Color(red: 1, green: 14/255, blue: 14/255, opacity: 1)

    var body: some View {
        let isError = viewModel.errorMessage.count > 0
        let btnColor = (isError) ? Color.gray : activeBlue
        let errorMsgColor = (isError) ? dangerRed : Color.white

        Spacer();
        Spacer();        

        VStack(alignment: .center){
            Button(action: viewModel.toggleRecording){
                Text(viewModel.recordToggleButtonText)
                    .font(.title)
                    .background(btnColor)
                    .foregroundColor(.white)
                    .padding(.horizontal, 35.0)
                    .padding(.vertical, 20.0)
            }.background(
                Capsule().fill(btnColor)
            ).padding(12).disabled(isError);
            Spacer();

            Text(viewModel.messageText);
            Spacer();
            
            HStack(alignment: .center) {
                TextField("Search Phrase", text: $viewModel.searchPhraseText)
                    .padding(7)
                    .padding(.horizontal, 25)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    .overlay(HStack() {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                            .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
                            .padding(.leading, 8)
                    })
                    .disabled(isError)
                Button(action: viewModel.searchMetadata){
                    Text("Search")
                }.disabled(isError)
            }.padding(.horizontal, 48);
            List {
                ForEach(viewModel.results, id: \.startSec) { result in
                    HStack() {
                        Text(String(format: "Start: %.1fs", result.startSec));
                        Text(String(format: "End: %.1fs", result.endSec));
                        Text(String(format: "Probability: %.0f%%", result.probability * 100));
                    }
                }
            }
            Spacer()

            Text(viewModel.errorMessage)
                .frame(minWidth: 0, maxWidth: UIScreen.main.bounds.width - 50)
                .padding(.vertical, 10)
                .padding(.horizontal, 10)
                .font(.body)
                .background(errorMsgColor)
                .foregroundColor(.white)
                .cornerRadius(.infinity)
            Spacer()
        }.frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ContentView()
        }
    }
}

