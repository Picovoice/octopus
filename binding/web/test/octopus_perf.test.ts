import { Octopus, OctopusWorker } from '../';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
const NUM_TEST_ITERATIONS = Number(Cypress.env('NUM_TEST_ITERATIONS'));
const INDEX_PERFORMANCE_THRESHOLD_SEC = Number(
  Cypress.env('INDEX_PERFORMANCE_THRESHOLD_SEC')
);
const SEARCH_PERFORMANCE_THRESHOLD_SEC = Number(
  Cypress.env('SEARCH_PERFORMANCE_THRESHOLD_SEC')
);

async function testPerformance(
  instance: typeof Octopus | typeof OctopusWorker,
  inputPcm: Int16Array
) {
  const indexPerfResults: number[] = [];
  const searchPerfResults: number[] = [];

  for (let j = 0; j < NUM_TEST_ITERATIONS; j++) {
    const octopus = await instance.create(ACCESS_KEY, {
      publicPath: '/test/octopus_params.pv',
      forceWrite: true,
    });

    let start = Date.now();
    const metadata = await octopus.index(inputPcm);
    let end = Date.now();
    indexPerfResults.push((end - start) / 1000);

    start = Date.now();
    await octopus.search(metadata, 'porcupine');
    end = Date.now();
    searchPerfResults.push((end - start) / 1000);

    if (octopus instanceof OctopusWorker) {
      octopus.terminate();
    } else {
      await octopus.release();
    }
  }

  const indexAvgPerf =
    indexPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;
  const searchAvgPerf =
    searchPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;

  // eslint-disable-next-line no-console
  console.log(`Average index performance: ${indexAvgPerf} seconds`);
  // eslint-disable-next-line no-console
  console.log(`Average search performance: ${searchAvgPerf} seconds`);

  expect(indexAvgPerf).to.be.lessThan(INDEX_PERFORMANCE_THRESHOLD_SEC);
  expect(searchAvgPerf).to.be.lessThan(SEARCH_PERFORMANCE_THRESHOLD_SEC);
}

describe('Octopus binding performance test', () => {
  Cypress.config('defaultCommandTimeout', 120000);

  for (const instance of [Octopus, OctopusWorker]) {
    const instanceString = instance === OctopusWorker ? 'worker' : 'main';

    it(`should be lower than performance threshold (${instanceString})`, () => {
      cy.getFramesFromFile('audio_samples/multiple_keywords.wav').then(
        async inputPcm => {
          await testPerformance(instance, inputPcm);
        }
      );
    });
  }
});
