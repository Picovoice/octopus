import { Octopus, OctopusWorker } from '../';

// @ts-ignore
import octopusParams from './octopus_params';
import { PvModel } from '@picovoice/web-utils';

import { testResults, languages } from './test_results';

const ACCESS_KEY: string = Cypress.env('ACCESS_KEY');

const assertInBetween = (value: number, expected: number, epsilon = 0.01) => {
  expect(Math.abs(value - expected)).to.be.lte(epsilon);
};

const runInitTest = async (
  instance: typeof Octopus | typeof OctopusWorker,
  params: {
    accessKey?: string;
    model?: PvModel;
    expectFailure?: boolean;
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/octopus_params.pv', forceWrite: true },
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const octopus = await instance.create(accessKey, model);
    expect(octopus.sampleRate).to.be.eq(16000);
    expect(typeof octopus.version).to.eq('string');
    expect(octopus.version.length).to.be.greaterThan(0);

    if (octopus instanceof OctopusWorker) {
      octopus.terminate();
    } else {
      await octopus.release();
    }
  } catch (e) {
    if (expectFailure) {
      isFailed = true;
    } else {
      expect(e).to.be.undefined;
    }
  }

  if (expectFailure) {
    expect(isFailed).to.be.true;
  }
};

const runProcTest = async (
  instance: typeof Octopus | typeof OctopusWorker,
  inputPcm: Int16Array,
  results: any[],
  params: {
    accessKey?: string;
    model?: PvModel;
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/octopus_params.pv', forceWrite: true },
  } = params;

  try {
    const octopus = await instance.create(accessKey, model);

    const metadata = await octopus.index(inputPcm);
    console.log(metadata);
    for (const { phrase, expected } of results) {
      const res = await octopus.search(metadata, phrase);
      expect(res.length).to.be.gt(0);
      for (let i = 0; i < expected.length; i++) {
        assertInBetween(res[i].startSec, expected[i].startSec);
        assertInBetween(res[i].endSec, expected[i].endSec);
        assertInBetween(res[i].probability, expected[i].probability, 0.1);
      }
    }

    if (octopus instanceof OctopusWorker) {
      octopus.terminate();
    } else {
      await octopus.release();
    }
  } catch (e) {
    expect(e).to.be.undefined;
  }
};

describe('Octopus Binding', function () {
  // for (const instance of [Octopus, OctopusWorker]) {
  //   const instanceString = instance === OctopusWorker ? 'worker' : 'main';
  //
  //   it(`should be able to init with public path (${instanceString})`, () => {
  //     cy.wrap(null).then(async () => {
  //       await runInitTest(instance);
  //     });
  //   });
  //
  //   it(`should be able to init with base64 (${instanceString})`, () => {
  //     cy.wrap(null).then(async () => {
  //       await runInitTest(instance, {
  //         model: { base64: octopusParams, forceWrite: true },
  //       });
  //     });
  //   });
  //
  //   it(`should be able to handle UTF-8 public path (${instanceString})`, () => {
  //     cy.wrap(null).then(async () => {
  //       await runInitTest(instance, {
  //         model: {
  //           publicPath: '/test/octopus_params.pv',
  //           forceWrite: true,
  //           customWritePath: '테스트',
  //         },
  //       });
  //     });
  //   });
  //
  //   it(`should be able to handle invalid public path (${instanceString})`, () => {
  //     cy.wrap(null).then(async () => {
  //       await runInitTest(instance, {
  //         model: { publicPath: 'invalid', forceWrite: true },
  //         expectFailure: true,
  //       });
  //     });
  //   });
  //
  //   it(`should be able to handle invalid base64 (${instanceString})`, () => {
  //     cy.wrap(null).then(async () => {
  //       await runInitTest(instance, {
  //         model: { base64: 'invalid', forceWrite: true },
  //         expectFailure: true,
  //       });
  //     });
  //   });
  //
  //   it(`should be able to handle invalid access key (${instanceString})`, () => {
  //     cy.wrap(null).then(async () => {
  //       await runInitTest(instance, {
  //         accessKey: 'invalid',
  //         expectFailure: true,
  //       });
  //     });
  //   });
  //
  //   it(`should return correct error message stack (${instanceString})`, async () => {
  //     let messageStack = [];
  //     try {
  //       const octopus = await instance.create('invalidAccessKey', {
  //         publicPath: '/test/octopus_params.pv',
  //         forceWrite: true,
  //       });
  //       expect(octopus).to.be.undefined;
  //     } catch (e: any) {
  //       messageStack = e.messageStack;
  //     }
  //
  //     expect(messageStack.length).to.be.gt(0);
  //     expect(messageStack.length).to.be.lte(8);
  //
  //     try {
  //       const octopus = await instance.create('invalidAccessKey', {
  //         publicPath: '/test/octopus_params.pv',
  //         forceWrite: true,
  //       });
  //       expect(octopus).to.be.undefined;
  //     } catch (e: any) {
  //       expect(messageStack.length).to.be.eq(e.messageStack.length);
  //     }
  //   });

  // for (const language of languages) {
  for (const language of ['en']) {
    // it(`should be able to process (${language}) (${instanceString})`, () => {
    it(`should be able to process (${language}) `, () => {
      try {
        const suffix = language === 'en' ? '' : `_${language}`;
        cy.getFramesFromFile(
          `audio_samples/multiple_keywords${suffix}.wav`
        ).then(async pcm => {
          // await runProcTest(instance, pcm, testResults[language], {
          await runProcTest(Octopus, pcm, testResults[language], {
            model: {
              publicPath: `/test/octopus_params${suffix}.pv`,
              forceWrite: true,
            },
          });
        });
      } catch (e) {
        expect(e).to.be.undefined;
      }
    });
  }
  // }
  //
  // it(`should be able to transfer buffer`, () => {
  //   try {
  //     cy.getFramesFromFile(`audio_samples/multiple_keywords.wav`).then(
  //       async pcm => {
  //         const octopus = await OctopusWorker.create(ACCESS_KEY, {
  //           publicPath: '/test/octopus_params.pv',
  //           forceWrite: true,
  //         });
  //
  //         let copy = new Int16Array(pcm.length);
  //         copy.set(pcm);
  //         await octopus.index(copy, {
  //           transfer: true,
  //           transferCallback: data => {
  //             copy = data;
  //           },
  //         });
  //         octopus.terminate();
  //
  //         expect(copy).to.deep.eq(pcm);
  //       }
  //     );
  //   } catch (e) {
  //     expect(e).to.be.undefined;
  //   }
  // });
});
