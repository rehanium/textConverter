const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const inputLines = document.getElementById('inputLines');
const outputLines = document.getElementById('outputLines');
const copyOutput = document.getElementById('copyOutput');
const clearInput = document.getElementById('clearInput');
const trimWhitespace = document.getElementById('trimWhitespace');
const ignoreEmpty = document.getElementById('ignoreEmpty');
const escapeMode = document.getElementById('escapeMode');
const outputSeparator = document.getElementById('outputSeparator');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const status = document.getElementById('status');
const quoteRadios = document.querySelectorAll('input[name="quote"]');

const quoteByType = { single: "'", double: '"' };
const THEME_KEY = 'line-quote-theme';
let statusTimer;

function getQuoteCharacter() {
  const selected = document.querySelector('input[name="quote"]:checked');
  return quoteByType[selected?.value] ?? quoteByType.single;
}

function escapeLine(line) {
  const mode = escapeMode.value;
  if (mode === 'single' || mode === 'both') {
    line = line.replaceAll("'", "\\'");
  }
  if (mode === 'double' || mode === 'both') {
    line = line.replaceAll('"', '\\"');
  }
  return line;
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
    if (trimWhitespace.checked) line = line.trim();
    if (ignoreEmpty.checked && line.length === 0) continue;

    transformed.push(`${quote}${escapeLine(line)}${quote},`);
  }

  const separator = outputSeparator.value === 'space' ? ' ' : '\n';
  outputText.value = transformed.join(separator);
  const outputUnit = outputSeparator.value === 'space' ? 'item' : 'line';
  outputLines.textContent = `${transformed.length} ${outputUnit}${transformed.length === 1 ? '' : 's'}`;
}

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const useLight = theme === 'dark';
  themeIcon.textContent = useLight ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', useLight ? 'Switch to light mode' : 'Switch to dark mode');
  themeToggle.setAttribute('title', useLight ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
  setStatus(`Switched to ${nextTheme} mode.`);
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
escapeMode.addEventListener('change', convertText);
outputSeparator.addEventListener('change', convertText);
quoteRadios.forEach((radio) => radio.addEventListener('change', convertText));
copyOutput.addEventListener('click', copyToClipboard);
clearInput.addEventListener('click', clearAll);
themeToggle.addEventListener('click', toggleTheme);

applyTheme(getPreferredTheme());
convertText();
