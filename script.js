const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const inputLines = document.getElementById('inputLines');
const outputLines = document.getElementById('outputLines');
const copyOutput = document.getElementById('copyOutput');
const clearInput = document.getElementById('clearInput');
const trimWhitespace = document.getElementById('trimWhitespace');
const ignoreEmpty = document.getElementById('ignoreEmpty');
const escapeMode = document.getElementById('escapeMode');
const deduplicateCheckbox = document.getElementById('deduplicate');
const sortMode = document.getElementById('sortMode');
const wrapperMode = document.getElementById('wrapperMode');
const splitDelimiter = document.getElementById('splitDelimiter');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const status = document.getElementById('status');
const charCount = document.getElementById('charCount');
const uniqueCount = document.getElementById('uniqueCount');
const quoteRadios = document.querySelectorAll('input[name="quote"]');
const outputFormatRadios = document.querySelectorAll('input[name="outputFormat"]');

const quoteByType = { single: "'", double: '"' };
const THEME_KEY = 'line-quote-theme';
let statusTimer;

function getQuoteCharacter() {
  const selected = document.querySelector('input[name="quote"]:checked');
  return quoteByType[selected?.value] ?? quoteByType.single;
}

function getOutputFormat() {
  const selected = document.querySelector('input[name="outputFormat"]:checked');
  return selected?.value ?? 'newline';
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

function splitByDelimiter(text) {
  const delimiter = splitDelimiter.value;
  if (!delimiter) return text.split('\n');
  
  // Split by delimiter and then by newlines
  const allItems = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const items = line.split(delimiter);
    allItems.push(...items);
  }
  
  return allItems;
}

function convertText() {
  const quote = getQuoteCharacter();
  const rawInput = inputText.value;
  
  // Split by delimiter if specified, otherwise by newline
  let rawLines = splitByDelimiter(rawInput);
  
  inputLines.textContent = `${rawLines.length} line${rawLines.length === 1 ? '' : 's'}`;

  let transformed = [];
  let uniqueValues = new Set();
  
  for (let line of rawLines) {
    if (trimWhitespace.checked) line = line.trim();
    
    // Skip empty lines only when ignoreEmpty is checked
    if (ignoreEmpty.checked && line.length === 0) continue;
    
    uniqueValues.add(line);
    transformed.push(line);
  }

  // Deduplicate if checked
  if (deduplicateCheckbox.checked) {
    transformed = Array.from(new Set(transformed));
  }

  // Sort if selected
  const sort = sortMode.value;
  if (sort === 'asc') {
    transformed.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  } else if (sort === 'desc') {
    transformed.sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' }));
  }

  // Add quotes and escape
  const quotedItems = transformed.map(line => `${quote}${escapeLine(line)}${quote}`);
  
  // Join with separator
  const separator = getOutputFormat() === 'space' ? ' ' : '\n';
  let output = quotedItems.join(`,${separator}`);
  
  // Apply wrapper
  const wrapper = wrapperMode.value;
  if (wrapper === 'parentheses') {
    output = `(${output})`;
  } else if (wrapper === 'braces') {
    output = `{${output}}`;
  }
  
  outputText.value = output;
  
  // Update stats
  const outputUnit = getOutputFormat() === 'space' ? 'item' : 'line';
  outputLines.textContent = `${transformed.length} ${outputUnit}${transformed.length === 1 ? '' : 's'}`;
  
  // Character count with warning
  const charCountValue = output.length;
  charCount.textContent = `${charCountValue} characters`;
  if (charCountValue > 4000) {
    charCount.className = 'count warning';
    charCount.title = 'Warning: Exceeds SOQL query limit of 4,000 characters';
  } else {
    charCount.className = 'count';
    charCount.title = '';
  }
  
  // Unique count
  uniqueCount.textContent = `${uniqueValues.size} unique`;
  if (uniqueValues.size < rawLines.length - (ignoreEmpty.checked ? rawLines.filter(l => !l.trim()).length : 0)) {
    uniqueCount.className = 'count info';
    uniqueCount.title = `${rawLines.length - uniqueValues.size} duplicate${rawLines.length - uniqueValues.size === 1 ? '' : 's'} found`;
  } else {
    uniqueCount.className = 'count';
    uniqueCount.title = '';
  }
}

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  themeIcon.textContent = isDark ? '☀️' : '🌙';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  themeToggle.setAttribute('aria-label', label);
  themeToggle.setAttribute('title', label);
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

// Event listeners
inputText.addEventListener('input', convertText);
trimWhitespace.addEventListener('change', convertText);
ignoreEmpty.addEventListener('change', convertText);
escapeMode.addEventListener('change', convertText);
deduplicateCheckbox.addEventListener('change', convertText);
sortMode.addEventListener('change', convertText);
wrapperMode.addEventListener('change', convertText);
splitDelimiter.addEventListener('input', convertText);
quoteRadios.forEach((radio) => radio.addEventListener('change', convertText));
outputFormatRadios.forEach((radio) => radio.addEventListener('change', convertText));
copyOutput.addEventListener('click', copyToClipboard);
clearInput.addEventListener('click', clearAll);
themeToggle.addEventListener('click', toggleTheme);

// Initialize
applyTheme(getPreferredTheme());
convertText();