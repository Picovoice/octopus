const languages = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt'];

const testResults = {
  en: [
    {
      phrase: 'alexa',
      expected: [{ startSec: 7.648, endSec: 8.352, probability: 1 }],
    },
    {
      phrase: 'porcupine',
      expected: [
        { startSec: 5.728, endSec: 6.752, probability: 1 },
        { startSec: 35.36, endSec: 36.416, probability: 1 },
      ],
    },
  ],
  de: [
    {
      phrase: 'ananas',
      expected: [{ startSec: 0.0, endSec: 0.704, probability: 0.954 }],
    },
  ],
  es: [
    {
      phrase: 'manzana',
      expected: [{ startSec: 5.184, endSec: 5.984, probability: 1 }],
    },
  ],
  fr: [
    {
      phrase: 'perroquet',
      expected: [{ startSec: 4.352, endSec: 5.184, probability: 0.952 }],
    },
  ],
  it: [
    {
      phrase: 'porcospino',
      expected: [{ startSec: 0.48, endSec: 1.728, probability: 1 }],
    },
  ],
  ja: [
    {
      phrase: 'りんご',
      expected: [{ startSec: 0.99, endSec: 1.634, probability: 1 }],
    },
  ],
  ko: [
    {
      phrase: '아이스크림',
      expected: [{ startSec: 6.592, endSec: 7.52, probability: 0.961 }],
    },
  ],
  pt: [
    {
      phrase: 'porco espinho',
      expected: [{ startSec: 0.48, endSec: 1.792, probability: 1 }],
    },
  ],
};

export { testResults, languages };
