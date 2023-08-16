/*
    Copyright 2021 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.octopus;

/**
 * Class that contains match results returned from Octopus search.
 */
public class OctopusMatch {

    private final float startSec;
    private final float endSec;
    private final float probability;

    /**
     * Constructor.
     *
     * @param startSec      The starting second of the match word.
     * @param endSec        The ending second of the match word.
     * @param probability   Floating-point value between [0, 1].
     */
    public OctopusMatch(float startSec, float endSec, float probability) {
        this.startSec = startSec;
        this.endSec = endSec;
        this.probability = probability;
    }

    public float getStartSec() {
        return startSec;
    }

    public float getEndSec() {
        return endSec;
    }

    public float getProbability() {
        return probability;
    }
}
