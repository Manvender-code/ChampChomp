// Works with your popup.html / popup.css.
// Shows detected rows and, on "Get Hint", looks up dp.json for win/lose and next move.

// UI nodes
const rowsView = document.getElementById('rowsView');
const resultBox = document.getElementById('result');
const refreshBtn = document.getElementById('refreshBtn');
const hintBtn = document.getElementById('getHintBtn');
const manualInput = document.getElementById('manualInput');
const setManualBtn = document.getElementById('setManualBtn');

let currentBoard = null; // [a,b,c,d]
let dpTable = null;

// Load DP once
async function loadDP() {
    if (dpTable) return dpTable;
    const url = chrome.runtime.getURL('dp.json');
    const res = await fetch(url);
    dpTable = await res.json();
    return dpTable;
}

// Helpers
function showRows(arr) {
    rowsView.textContent = arr ? `[${arr.join(', ')}]` : '—';
}

function showStatus(type, text) {
    resultBox.className = 'result ' + (type || '');
    resultBox.textContent = text || '';
}

function arraysEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function lookupHint(board) {
    const dp = await loadDP();
    const hit = dp.find(entry => arraysEqual(entry.key, board));
    if (!hit) return null;
    return hit.value; // {first: "yes"/"no", second: [row,col] or null}
}

// Normalize to 4 rows, top->bottom, non-decreasing.
// If user entered fewer than 4 rows, pad leading zeros.
function normalizeBoard(raw) {
    const nums = raw.map(n => Number(n)).filter(n => Number.isFinite(n) && n >= 0);
    if (!nums.length) return null;
    // Ensure non-decreasing top->bottom; if not, try reversed.
    const nonDec = nums.every((n, i) => i === 0 || n >= nums[i - 1]);
    let rows = nonDec ? nums : nums.slice().reverse();
    rows = rows.slice(0, 4);
    while (rows.length < 4) rows.unshift(0);
    return rows;
}

// Ask the active tab’s content script to parse
function requestParse() {
    showStatus('', ''); // clear
    rowsView.textContent = '…';
    currentBoard = null;

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs?.[0]?.id;
        if (!tabId) {
            rowsView.textContent = '—';
            showStatus('not-found', 'No active tab.');
            return;
        }
        chrome.tabs.sendMessage(tabId, { type: 'CHOMP_PARSE' }, (resp) => {
            if (chrome.runtime.lastError) {
                rowsView.textContent = '—';
                showStatus('not-found', 'Could not reach page content.');
                return;
            }
            if (!resp || !resp.ok) {
                rowsView.textContent = '—';
                showStatus('not-found', resp?.reason || 'Board not found.');
                return;
            }
            currentBoard = resp.board;
            showRows(currentBoard);
        });
    });
}

// UI events
refreshBtn.addEventListener('click', requestParse);

setManualBtn.addEventListener('click', () => {
    const parts = manualInput.value.trim().split(/\s+/);
    const norm = normalizeBoard(parts);
    if (!norm) {
        showStatus('not-found', 'Enter numbers like: 3 5 8 8');
        return;
    }
    currentBoard = norm;
    showRows(norm);
    showStatus('', '');
});

hintBtn.addEventListener('click', async () => {
    if (!currentBoard) {
        showStatus('not-found', 'No board yet. Click Refresh or enter rows manually.');
        return;
    }
    const hint = await lookupHint(currentBoard);
    if (!hint) {
        showStatus('not-found', 'Position not in DP table.');
        return;
    }
    if (hint.first === 'yes') {
        // next move coordinates are given as e.g. [4,2]; we’ll just show them verbatim.
        showStatus('win', `Winning! Suggested move: ${hint.second ? `[${hint.second.join(', ')}]` : '(any)'}`);
    } else {
        showStatus('lose', 'Losing with best play.');
    }
});

// Auto-parse on popup open
requestParse();
