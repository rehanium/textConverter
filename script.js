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
const idDetection = document.getElementById('idDetection');
const convertIdsBtn = document.getElementById('convertIds');
const quoteRadios = document.querySelectorAll('input[name="quote"]');
const outputFormatRadios = document.querySelectorAll('input[name="outputFormat"]');

const quoteByType = { single: "'", double: '"' };
const THEME_KEY = 'line-quote-theme';
const PREFERENCES_KEY = 'salesforce-converter-preferences';
let statusTimer;
let detectedIdType = null; // '15' or '18' or null

// Preferences management
function savePreferences() {
  const preferences = {
    quoteStyle: document.querySelector('input[name="quote"]:checked')?.value || 'single',
    outputFormat: document.querySelector('input[name="outputFormat"]:checked')?.value || 'newline',
    wrapperMode: wrapperMode.value,
    sortMode: sortMode.value,
    trimWhitespace: trimWhitespace.checked,
    ignoreEmpty: ignoreEmpty.checked,
    deduplicate: deduplicateCheckbox.checked,
    escapeMode: escapeMode.value,
    splitDelimiter: splitDelimiter.value
  };
  
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  
  const saveBtn = document.getElementById('savePreferences');
  const resetBtn = document.getElementById('resetPreferences');
  
  saveBtn.classList.add('saved');
  saveBtn.textContent = '✓ Saved';
  resetBtn.style.display = 'inline-block';
  
  setStatus('Preferences saved for next visit.');
  
  setTimeout(() => {
    saveBtn.classList.remove('saved');
    saveBtn.textContent = '💾 Save Settings';
  }, 2000);
}

function loadPreferences() {
  const saved = localStorage.getItem(PREFERENCES_KEY);
  if (!saved) return false;
  
  try {
    const preferences = JSON.parse(saved);
    
    // Apply quote style
    const quoteRadio = document.querySelector(`input[name="quote"][value="${preferences.quoteStyle}"]`);
    if (quoteRadio) quoteRadio.checked = true;
    
    // Apply output format
    const formatRadio = document.querySelector(`input[name="outputFormat"][value="${preferences.outputFormat}"]`);
    if (formatRadio) formatRadio.checked = true;
    
    // Apply other settings
    wrapperMode.value = preferences.wrapperMode || 'none';
    sortMode.value = preferences.sortMode || 'none';
    trimWhitespace.checked = preferences.trimWhitespace || false;
    ignoreEmpty.checked = preferences.ignoreEmpty !== undefined ? preferences.ignoreEmpty : true;
    deduplicateCheckbox.checked = preferences.deduplicate || false;
    escapeMode.value = preferences.escapeMode || 'none';
    splitDelimiter.value = preferences.splitDelimiter || '';
    
    // Show reset button
    document.getElementById('resetPreferences').style.display = 'inline-block';
    
    return true;
  } catch (e) {
    console.error('Failed to load preferences:', e);
    return false;
  }
}

function resetPreferences() {
  localStorage.removeItem(PREFERENCES_KEY);
  
  // Reset to defaults
  document.querySelector('input[name="quote"][value="single"]').checked = true;
  document.querySelector('input[name="outputFormat"][value="newline"]').checked = true;
  wrapperMode.value = 'none';
  sortMode.value = 'none';
  trimWhitespace.checked = false;
  ignoreEmpty.checked = true;
  deduplicateCheckbox.checked = false;
  escapeMode.value = 'none';
  splitDelimiter.value = '';
  
  document.getElementById('resetPreferences').style.display = 'none';
  
  setStatus('Preferences reset to defaults.');
  convertText();
}

// Salesforce ID validation and conversion
const SFID_15_REGEX = /^[a-zA-Z0-9]{15}$/;
const SFID_18_REGEX = /^[a-zA-Z0-9]{18}$/;

function isValidSalesforceId(id) {
  return SFID_15_REGEX.test(id) || SFID_18_REGEX.test(id);
}

function convert15to18(id15) {
  if (id15.length !== 15) return id15;
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
  let suffix = '';
  
  for (let i = 0; i < 3; i++) {
    let flags = 0;
    for (let j = 0; j < 5; j++) {
      const c = id15.charAt(i * 5 + j);
      if (c >= 'A' && c <= 'Z') {
        flags += 1 << j;
      }
    }
    suffix += chars.charAt(flags);
  }
  
  return id15 + suffix;
}

function convert18to15(id18) {
  if (id18.length !== 18) return id18;
  return id18.substring(0, 15);
}

function detectSalesforceIds(text) {
  const lines = text.split('\n');
  let count15 = 0;
  let count18 = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (SFID_15_REGEX.test(trimmed)) count15++;
    if (SFID_18_REGEX.test(trimmed)) count18++;
  }
  
  const total = count15 + count18;
  if (total === 0) return null;
  
  // Determine predominant type
  if (count15 > count18) return { type: '15', count: total };
  if (count18 > count15) return { type: '18', count: total };
  return { type: '15', count: total }; // Default to 15 if equal
}

function updateIdDetection() {
  const detection = detectSalesforceIds(inputText.value);
  
  if (detection) {
    detectedIdType = detection.type;
    const targetType = detection.type === '15' ? '18' : '15';
    idDetection.textContent = `${detection.count} ID${detection.count > 1 ? 's' : ''} detected`;
    idDetection.style.display = 'inline-block';
    convertIdsBtn.textContent = `Convert IDs: ${detection.type}→${targetType}`;
    convertIdsBtn.style.display = 'inline-block';
  } else {
    detectedIdType = null;
    idDetection.style.display = 'none';
    convertIdsBtn.style.display = 'none';
  }
}

function convertSalesforceIds() {
  if (!detectedIdType) return;
  
  const lines = inputText.value.split('\n');
  const converted = lines.map(line => {
    const trimmed = line.trim();
    
    if (detectedIdType === '15' && SFID_15_REGEX.test(trimmed)) {
      const id18 = convert15to18(trimmed);
      return line.replace(trimmed, id18);
    }
    
    if (detectedIdType === '18' && SFID_18_REGEX.test(trimmed)) {
      const id15 = convert18to15(trimmed);
      return line.replace(trimmed, id15);
    }
    
    return line;
  });
  
  inputText.value = converted.join('\n');
  const targetType = detectedIdType === '15' ? '18' : '15';
  setStatus(`Converted to ${targetType}-character IDs.`);
  updateIdDetection();
  convertText();
}

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
  
  // Update ID detection
  updateIdDetection();
  
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
convertIdsBtn.addEventListener('click', convertSalesforceIds);
document.getElementById('savePreferences').addEventListener('click', savePreferences);
document.getElementById('resetPreferences').addEventListener('click', resetPreferences);

// Initialize
applyTheme(getPreferredTheme());
loadPreferences(); // Load saved preferences
convertText();