/**
 * Shared practice helpers
 */
window.PracticeCommon = (function () {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function unitParam() {
    return (window.PracticeRegistry && window.PracticeRegistry.qsUnit()) || 'unit1';
  }

  function loadUnit() {
    const id = unitParam();
    const pack = window.PracticeRegistry.getUnit(id);
    return { id, pack };
  }

  function hubLink(unitId) {
    return 'index.html?unit=' + encodeURIComponent(unitId || unitParam());
  }

  function practiceLink(page, unitId) {
    return page + '?unit=' + encodeURIComponent(unitId || unitParam());
  }

  function playAudio(src) {
    if (!src) return;
    try {
      const a = new Audio(src);
      a.play().catch(function () {});
    } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Mask a full phrase. Spaces and punctuation stay visible.
   * Easy and Hard each draw one legal combination from letter-rules.js.
   */
  function maskPhrase(phrase, mode, random, ignoreWords) {
    if (window.LetterRules) return window.LetterRules.maskPhrase(phrase, mode, random, ignoreWords);
    return String(phrase || '');
  }

  /** @deprecated use maskPhrase so phrases keep spaces */
  function maskWord(word, mode) {
    return maskPhrase(word, mode);
  }

  function patternToSlots(word, pattern) {
    // If pattern given with _, use it; else treat pattern as mask of same length
    const w = word;
    const p = pattern || w;
    const slots = [];
    // Align by index when same length; else rebuild from _
    if (p.length === w.length) {
      for (let i = 0; i < w.length; i++) {
        if (p[i] === '_') slots.push({ type: 'blank', answer: w[i], index: i });
        else slots.push({ type: 'show', char: w[i], index: i });
      }
    } else {
      // fallback: show all as blanks for letters
      for (let i = 0; i < w.length; i++) {
        if (/[a-zA-Z]/.test(w[i])) slots.push({ type: 'blank', answer: w[i], index: i });
        else slots.push({ type: 'show', char: w[i], index: i });
      }
    }
    return slots;
  }

  function slotChar(slot) {
    if (!slot) return '';
    return slot.type === 'show' ? (slot.char || '') : (slot.answer || '');
  }

  /**
   * Group letter slots into unbreakable words.
   * A word is one run of letters. Spaces, "/" and other punctuation
   * are wrap points, so a line may break between words or at those
   * separators, never between the letters of one word.
   * Slash and punctuation stay on the end of the word they follow
   * ("buy/", "fund-") and the next letters start a new word.
   * A following space is recorded as trail: 'space' (not its own slot).
   */
  function groupLetterSlots(slots) {
    const groups = [];
    let current = null;
    function flush() {
      if (current && current.slots.length) groups.push(current);
      current = null;
    }
    (slots || []).forEach(function (slot) {
      const ch = slotChar(slot);
      if (ch === ' ') {
        if (current && current.slots.length) {
          current.trail = 'space';
          flush();
        }
        return;
      }
      if (!current) current = { kind: 'word', slots: [], trail: 'none' };
      current.slots.push(slot);
      if (ch === '/' || !/[a-zA-Z]/.test(ch)) flush();
    });
    flush();
    return groups;
  }

  /**
   * Quiz feedback cats from いらすとや
   * https://www.irasutoya.com/2017/12/blog-post_89.html
   * feedback-ok.png = マルを出す猫, feedback-bad.png = バツを出す猫
   */
  function feedbackArt(kind) {
    if (kind === 'ok') return 'icons/feedback-ok.png';
    if (kind === 'bad') return 'icons/feedback-bad.png';
    return '';
  }

  function showFeedback(el, kind, fillBody) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    el.className = 'toast' + (kind ? ' ' + kind : '');
    const src = feedbackArt(kind);
    if (src) {
      const img = document.createElement('img');
      img.className = 'toast-cat';
      img.src = src;
      img.alt = '';
      el.appendChild(img);
    }
    const body = document.createElement('div');
    body.className = 'toast-body';
    if (fillBody) fillBody(body);
    el.appendChild(body);
    el.hidden = false;
  }

  function toast(el, msg, kind) {
    showFeedback(el, kind, function (body) {
      body.textContent = msg;
    });
  }

  return {
    shuffle, unitParam, loadUnit, hubLink, practiceLink,
    playAudio, escapeHtml, maskWord, maskPhrase, patternToSlots, groupLetterSlots,
    toast, showFeedback
  };
})();
