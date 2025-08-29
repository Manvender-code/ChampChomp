// content.js — simple robust parser for UCLA Chomp page
(function () {
    const BLANK_RE = /blank/i;

    // Count filled cells in one row: left → right, stop at blank
    function countRowSquares(tr) {
        const tds = Array.from(tr.querySelectorAll('td'));
        let count = 0;
        for (const td of tds) {
            const img = td.querySelector('img');
            if (!img) break;                         // no image at all
            const src = img.getAttribute('src') || '';
            if (BLANK_RE.test(src)) break;           // stop at first blank.gif
            count++;                                 // brown.jpeg or poison ⇒ filled
        }
        return count;
    }

    function findGameTable(doc) {
        const form = doc.querySelector('form[name="game"]');
        if (form) {
            const t = form.querySelector('table');
            if (t) return t;
        }
        for (const t of Array.from(doc.getElementsByTagName('table'))) {
            if (t.querySelector('a[href^="javascript:yourChoice"]')) return t;
        }
        return null;
    }

    function parseBoardFromDocument(doc) {
        const table = findGameTable(doc);
        if (!table) return null;

        const trs = Array.from(table.querySelectorAll('tr'));
        if (!trs.length) return null;

        // Just take rows in DOM order (top → bottom)
        const counts = trs.map(countRowSquares);

        // Limit to 4 rows for the DP table (pad with zeros at top if fewer)
        let normalized = counts.slice(0, 4);
        while (normalized.length < 4) normalized.unshift(0);

        return normalized;
    }

    function parseBoardAllContexts() {
        const docs = [document];
        for (const f of Array.from(document.querySelectorAll('iframe, frame'))) {
            try {
                if (f.contentDocument) docs.push(f.contentDocument);
            } catch (_) { }
        }
        for (const d of docs) {
            const board = parseBoardFromDocument(d);
            if (board) return board;
        }
        return null;
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg && msg.type === 'CHOMP_PARSE') {
            try {
                const board = parseBoardAllContexts();
                if (board) {
                    sendResponse({ ok: true, board });
                } else {
                    sendResponse({ ok: false, reason: 'Board not found' });
                }
            } catch (e) {
                sendResponse({ ok: false, reason: e?.message || String(e) });
            }
            return true;
        }
    });
})();
