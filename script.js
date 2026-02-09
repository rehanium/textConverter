const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const inputLines = document.getElementById('inputLines');
const outputLines = document.getElementById('outputLines');
const copyOutput = document.getElementById('copyOutput');
const clearInput = document.getElementById('clearInput');
const trimWhitespace = document.getElementById('trimWhitespace');
const ignoreEmpty = document.getElementById('ignoreEmpty');
const status = document.getElementById('status');
const quoteRadios = document.querySelectorAll('input[name="quote"]');

const quoteByType = {
  single: "'",
  double: '"'
};

let statusTimer;

function getQuoteCharacter() {
  const selected = document.querySelector('input[name="quote"]:checked');
  return quoteByType[selected?.value] ?? quoteByType.single;
}

function setStatus(message, duration = 1800) {
  clearTimeout(statusTimer);
  status.textContent = message;
  if (duration > 0) {
    statusTimer = setTimeout(() => {
      status.textContent = '';
    }, duration);
  }
}

function convertText() {
  const quote = getQuoteCharacter();
  const rawLines = inputText.value.split('\n');

  inputLines.textContent = `${rawLines.length} line${rawLines.length === 1 ? '' : 's'}`;

  const transformed = [];
  for (let line of rawLines) {
    if (trimWhitespace.checked) {
      line = line.trim();
    }

    if (ignoreEmpty.checked && line.length === 0) {
      continue;
    }

    transformed.push(`${quote}${line}${quote},`);
  }

  outputText.value = transformed.join('\n');
  outputLines.textContent = `${transformed.length} line${transformed.length === 1 ? '' : 's'}`;
}

async function copyToClipboard() {
  if (!outputText.value) {
    setStatus('Nothing to copy.');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputText.value);
    setStatus('Output copied to clipboard.');
  } catch {
    outputText.select();
    document.execCommand('copy');
    setStatus('Output copied using fallback method.');
  }
}

function clearAll() {
  inputText.value = '';
  convertText();
  inputText.focus();
  setStatus('Input cleared.');
}

inputText.addEventListener('input', convertText);
trimWhitespace.addEventListener('change', convertText);
ignoreEmpty.addEventListener('change', convertText);
quoteRadios.forEach((radio) => radio.addEventListener('change', convertText));
copyOutput.addEventListener('click', copyToClipboard);
clearInput.addEventListener('click', clearAll);

convertText();
