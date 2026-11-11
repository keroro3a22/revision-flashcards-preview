/* Hidden path copy for the public site.
   Open any page with ?copy=1 once on this browser to show the buttons.
   Open ?copy=0 to hide them again. Students do not see them. */
(function () {
  var KEY = 'revision-copy-path';

  function enabled() {
    try {
      var flag = new URLSearchParams(location.search).get('copy');
      if (flag === '1') localStorage.setItem(KEY, '1');
      if (flag === '0') localStorage.removeItem(KEY);
      return localStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  if (!enabled()) return;
  document.documentElement.classList.add('copy-path-on');

  var style = document.createElement('style');
  style.textContent = [
    '.copy-path { font: inherit; font-size: 0.75rem; font-weight: 700; color: #16324f; background: #fff; border: 1px solid #8ea4ba; border-radius: 999px; padding: 0.15rem 0.55rem; cursor: pointer; }',
    '.copy-path-page { margin: 0.35rem 0 0.2rem; }',
    '.copy-path-row { margin-top: 0.35rem; }',
    '.toolbar .copy-path-row, .prac-header .copy-path-page { margin-left: 0.4rem; }'
  ].join('\n');
  document.head.appendChild(style);

  function copyText(text, button) {
    function mark() {
      if (!button) return;
      var old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = old; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(mark, function () { fallback(text); mark(); });
      return;
    }
    fallback(text);
    mark();
  }

  function fallback(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (e) {}
    area.remove();
  }

  function termLabel(term) {
    return term === 'second' ? '下學期' : '上學期';
  }

  function unitLabel(unit) {
    if (unit === 'mixed') return 'Mixed topic';
    return 'Unit ' + String(unit || '').replace(/^unit/, '');
  }

  function lessonBits() {
    var body = document.body;
    if (!body) return null;
    var unit = body.getAttribute('data-unit');
    var track = body.getAttribute('data-track');
    if (!unit || !track) return null;
    return {
      book: body.getAttribute('data-book') || 'oxford',
      series: body.getAttribute('data-series') || 'oxford',
      level: body.getAttribute('data-level') || 'p6',
      term: body.getAttribute('data-term') || 'first',
      unit: unit,
      track: track
    };
  }

  function lessonPath(row) {
    var here = lessonBits();
    if (!here) return practicePath();
    var kind = here.track === 'grammar' ? 'Grammar' : 'Vocab';
    var title = ['Oxford', String(here.level).toUpperCase(), termLabel(here.term), unitLabel(here.unit), 'Revision card', kind];
    var path = [here.book, here.series, here.term, here.level, here.unit, 'revision', here.track];
    var lines = [];
    if (row && row.n) {
      path.push(String(row.n));
      title.push('#' + row.n);
      if (row.label) title.push(row.label);
      lines.push('Lesson row ' + row.n);
    } else {
      lines.push('Lesson table');
    }
    lines.push(title.join(' · '));
    lines.push(path.join('/'));
    if (row && row.label) lines.push(row.label);
    return lines.join('\n');
  }

  function siteFile() {
    var path = location.pathname || '';
    var marker = '/revision-flashcards-preview/';
    var at = path.indexOf(marker);
    path = at >= 0 ? path.slice(at + marker.length) : path.replace(/^\//, '');
    return path + (location.search || '');
  }

  function practicePath(question) {
    var unit = 'unit1';
    try { unit = new URLSearchParams(location.search).get('unit') || unit; } catch (e) {}
    var file = siteFile();
    var name = (file.split('/').pop() || '').replace(/\.html.*/, '').replace(/-/g, ' ');
    var lines = [question ? 'Practice question' : 'Practice page'];
    var title = ['Oxford', 'P6', '上學期', unitLabel(unit), name];
    if (question) title.push(question);
    lines.push(title.join(' · '));
    lines.push(file);
    return lines.join('\n');
  }

  function questionText() {
    var num = document.getElementById('q-num');
    var hint = document.getElementById('hint');
    var bits = [];
    if (num && num.textContent.trim()) bits.push(num.textContent.trim());
    if (hint && hint.textContent.trim()) bits.push(hint.textContent.trim());
    return bits.join(' · ');
  }

  function makeButton(className, onClick) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = 'Copy path';
    el.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      onClick(el);
    });
    return el;
  }

  function mountPage() {
    if (document.querySelector('.copy-path-page')) return;
    var host = document.querySelector('.unit-header, .prac-header, header') || document.body;
    host.appendChild(makeButton('copy-path copy-path-page', function (button) {
      copyText(lessonBits() ? lessonPath(null) : practicePath(''), button);
    }));
  }

  function mountCards() {
    document.querySelectorAll('.card').forEach(function (card) {
      if (card.querySelector('.copy-path-row')) return;
      var num = card.querySelector('.num');
      if (!num) return;
      var head = card.querySelector('.headword, .pattern');
      var el = makeButton('copy-path copy-path-row', function (button) {
        copyText(lessonPath({
          n: num.textContent.trim(),
          label: head ? head.textContent.trim() : ''
        }), button);
      });
      var main = card.querySelector('.main') || card;
      main.appendChild(el);
    });
  }

  function mountQuestion() {
    var num = document.getElementById('q-num');
    if (!num || num.parentElement.querySelector('.copy-path-row')) return;
    num.parentElement.appendChild(makeButton('copy-path copy-path-row', function (button) {
      copyText(practicePath(questionText()), button);
    }));
  }

  function refresh() {
    mountPage();
    mountCards();
    mountQuestion();
  }

  function start() {
    refresh();
    var list = document.getElementById('list');
    if (list && window.MutationObserver) {
      new MutationObserver(function () { mountCards(); }).observe(list, { childList: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
