import { VoiceCommand } from './types';

const HINDI_WORDS = {
  kret: ['kret', 'kreta', 'kreti', 'kre', 'gayi', 'gai', 'geya'],
  payment: ['diye', 'de', 'dia', 'diya', 'rupaye', 'rupees', 'paisa'],
  numbers: new Map([
    ['zero', 0],
    ['ek', 1],
    ['do', 2],
    ['teen', 3],
    ['char', 4],
    ['paanch', 5],
    ['chha', 6],
    ['saat', 7],
    ['aath', 8],
    ['nau', 9],
    ['das', 10],
    ['gyarah', 11],
    ['barah', 12],
    ['tera', 13],
    ['chaudah', 14],
    ['pandrah', 15],
    ['sola', 16],
    ['satrah', 17],
    ['athara', 18],
    ['unnis', 19],
    ['bees', 20],
    ['tees', 30],
    ['chaalees', 40],
    ['pachas', 50],
    ['saath', 60],
    ['sattar', 70],
    ['assi', 80],
    ['nawwe', 90],
    ['sau', 100],
    ['hazaar', 1000],
  ]),
};

function normalizeHindi(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,।॥]/g, '');
}

/**
 * NUMBER PARSER (DIGITS + HINDI WORDS)
 */
function extractNumbers(words: string[]): number {
  const text = words.join(' ');

  // 1. Direct number detection (15, 5000)
  const digitMatch = text.match(/\d+/);
  if (digitMatch) {
    return parseInt(digitMatch[0], 10);
  }

  // 2. Hindi number words fallback
  let number = 0;
  let current = 0;

  for (const word of words) {
    const num = HINDI_WORDS.numbers.get(word);

    if (num !== undefined) {
      if (num >= 100) {
        current = current || 1;
        current *= num;
        number += current;
        current = 0;
      } else {
        current += num;
      }
    }
  }

  return number + current || 0;
}

/**
 * CUSTOMER NAME DETECTOR (MULTI WORD SUPPORT)
 */
function findCustomerName(text: string): string {
  const cleanedText = text.toLowerCase();

  const commonNames = [
    'ramesh',
    'govind',
    'kamlesh',
    'tiwari',
    'nisar',
    'ramchandra',
    'vijay',
    'amresh',
    'master',
    'bhagwan',
    'johar',
    'pappu k',
    'pappu 51',
    'guruji',
    'vali',
    'jaynandan',
    'ganga',
    'radhe',
    'jeetu',
    'money',
    'mahesh',
    'naresh',
    'kanhaiya sarfabaad',
    'surjeet',
    'bablu'
  ];

  for (const name of commonNames) {
    if (cleanedText.includes(name.toLowerCase())) {
      return name;
    }
  }

  return '';
}

/**
 * MAIN PARSER
 */
export function parseVoiceCommand(text: string): VoiceCommand | null {
  const normalized = normalizeHindi(text);
  const words = normalized.split(/\s+/);

  const isSale = HINDI_WORDS.kret.some(w => normalized.includes(w));
  const isPayment = HINDI_WORDS.payment.some(w => normalized.includes(w));
  const isQuery =
    normalized.includes('hisab') ||
    normalized.includes('batao') ||
    normalized.includes('kitna');

  // nothing matched
  if (!isSale && !isPayment && !isQuery) {
    return null;
  }

  const customerName = findCustomerName(text);
  if (!customerName) {
    return null;
  }

  const command: VoiceCommand = {
    type: isQuery
      ? 'query'
      : isSale
      ? 'sale'
      : 'payment',
    customer_name: customerName,
    raw_text: text,
  };

  // QUERY = no numbers needed
  if (isQuery) {
    return command;
  }

  // SALE
  if (isSale) {
    const quantity = extractNumbers(words);
    if (quantity > 0) {
      command.quantity = quantity;
    }
  }

  // PAYMENT
  if (isPayment) {
    const amount = extractNumbers(words);
    if (amount > 0) {
      command.amount = amount;
    }
  }

  return command;
}

/**
 * SPEAK FUNCTION (VOICE OUTPUT)
 */
export function speak(text: string, lang: string = 'hi-IN'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Speech error'));

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}