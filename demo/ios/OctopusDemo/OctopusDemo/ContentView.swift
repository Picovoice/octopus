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
        let interactDisabled: Bool = viewModel.state == UIState.FATAL_ERROR || viewModel.isBusy

        VStack(alignment: .center) {
            Spacer()
            ZStack(alignment: .center) {
                Text(String(format: "%.1f", viewModel.recordingTimeSec))
                    .font(.system(size: 60.0))
                    .padding(20)
                    .opacity(viewModel.state == UIState.RECORDING ? 1 : 0)
                ProgressView("Indexing...")
                    .progressViewStyle(CircularProgressViewStyle(tint: activeBlue))
                    .scaleEffect(x: 2, y: 2, anchor: .center)
                    .opacity(viewModel.state == UIState.INDEXING ? 1 : 0)
                    .padding(20)

                VStack(alignment: .center) {
                    Text(viewModel.searchResultCountText)
                        .font(.system(size: 25.0))
                        .opacity(viewModel.state == UIState.SEARCH_RESULTS ||
                                    viewModel.state == UIState.ZERO_SEARCH_RESULTS ? 1 : 0)
                        .frame(alignment: .center)
                        .padding(.top, 30)
                    VStack(alignment: .center) {
                        HStack(alignment: .center) {
                            Text("Start (sec)")
                                .padding(3)
                                .font(.headline)
                                .frame(maxWidth: .infinity, alignment: .center)
                            Text("End (sec)")
                                .padding(3)
                                .font(.headline)
                                .frame(maxWidth: .infinity, alignment: .center)
                            Text("Probability")
                                .padding(3)
                                .font(.headline)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                        .frame(maxWidth: .infinity)
                        ScrollView {
                            VStack(alignment: .center) {
                                ForEach(viewModel.results, id: \.startSec) { result in
                                    HStack(alignment: .center) {
                                        Text(String(format: "%.1fs", result.startSec))
                                            .frame(maxWidth: .infinity, alignment: .center)
                                            .foregroundColor(.white)
                                            .padding(6)
                                        Text(String(format: "%.1fs", result.endSec))
                                            .frame(maxWidth: .infinity, alignment: .center)
                                            .foregroundColor(.white)
                                            .padding(6)
                                        Text(String(format: "%.0f%%", result.probability * 100))
                                            .frame(maxWidth: .infinity, alignment: .center)
                                            .foregroundColor(.white)
                                            .padding(6)
                                    }.background(Color(red: 0, green: 229/255, blue: 195/255, opacity: 0.1))
                                    .frame(maxWidth: .infinity)
                                }
                            }
                            .padding(10)
                            .background(Color(red: 37/255, green: 24/255, blue: 126/255, opacity: 1))
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .opacity(viewModel.state == UIState.SEARCH_RESULTS ? 1 : 0)
                    .padding(.vertical, 30)
                    .frame(maxWidth: .infinity)
                }.padding(.vertical, 20)
                .frame(maxWidth: .infinity)
            }.frame(maxWidth: .infinity)

            Spacer()
            Spacer()
            Spacer()

            HStack(alignment: .center) {
                TextField("Search Phrase",
                          text: $viewModel.searchPhraseText,
                          onCommit: viewModel.searchMetadata)
                    .padding(7)
                    .padding(.horizontal, 25)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    .disableAutocorrection(true)
                    .autocapitalization(.none)
                    .overlay(HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                            .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
                            .padding(.leading, 8)
                    })
                    .disabled(interactDisabled)
                Button(action: viewModel.searchMetadata) {
                    Text("Search")
                }.disabled(interactDisabled)
            }
            .padding(.horizontal, 10)
            .opacity(viewModel.state == UIState.NEW_SEARCH ||
                     viewModel.state == UIState.SEARCH_RESULTS ||
                     viewModel.state == UIState.ZERO_SEARCH_RESULTS ? 1 : 0)

            Text(viewModel.errorMessage)
                .frame(minWidth: 0, maxWidth: UIScreen.main.bounds.width - 50)
                .padding()
                .font(.body)
                .background(dangerRed)
                .foregroundColor(.white)
                .cornerRadius(.infinity)
                .opacity(viewModel.state == UIState.FATAL_ERROR ? 1 : 0)

            Spacer()
            Text(viewModel.statusText)
                .padding(4)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
            Button(action: viewModel.toggleRecording) {
                Text(viewModel.state == UIState.RECORDING ? "STOP" : "RECORD")
                    .font(.title)
                    .background(interactDisabled ? Color.gray : activeBlue)
                    .foregroundColor(.white)
                    .padding(.horizontal, 35.0)
                    .padding(.vertical, 20.0)
            }.background(
                Capsule().fill(interactDisabled ? Color.gray : activeBlue)
            )
            .padding(12)
            .disabled(interactDisabled)
        }
        .padding(25)
        .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
        .alert(isPresented: $viewModel.showErrorAlert,
               content: {
                Alert(
                    title: Text("Error").foregroundColor(Color.red),
                    message: Text(viewModel.errorAlertMessage),
                    dismissButton: .default(Text("OK")))
               })
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ContentView()
        }
    }
}
