/**
 * Remember the last flashcard a student opened, so the homepage can resume it.
 */
window.LastPlace = (function () {
  var KEY = 'p6-flash-last-v1';

  function folder() {
    var path = (location && location.pathname) || '';
    var match = path.match(/\/(unit[1-4]|dictation3)(?:\/|$)/);
    return match ? match[1] : '';
  }

  function save(card) {
    var id = folder();
    if (!id || !card || !card.n || !card.en) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        unitId: id,
        n: card.n,
        en: card.en,
        zh: card.zh || '',
        href: id + '/#c' + card.n
      }));
    } catch (e) {}
  }

  function focusHash() {
    var id = String((location && location.hash) || '').replace(/^#/, '');
    if (!/^c[1-9]\d*$/.test(id) || !document.getElementById) return;
    var el = document.getElementById(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  }

  return { KEY: KEY, save: save, focusHash: focusHash };
})();
