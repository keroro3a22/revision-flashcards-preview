/* Path copy on the public site. Only a signed-in content editor sees the buttons. */
(function () {
  var style = document.createElement('style');
  style.textContent = [
    '.copy-path { font: inherit; font-size: 0.75rem; font-weight: 700; color: #16324f; background: #fff; border: 1px solid #8ea4ba; border-radius: 999px; padding: 0.15rem 0.55rem; cursor: pointer; }',
    '.copy-path-page { margin: 0.35rem 0 0.2rem; }',
    '.copy-path-row { margin-top: 0.35rem; }',
    '.toolbar .copy-path-row, .prac-header .copy-path-page { margin-left: 0.4rem; }'
  ].join('\n');

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

  var shown = false;
  var listObserver = null;

  function refresh() {
    if (!shown) return;
    mountPage();
    mountCards();
    mountQuestion();
  }

  function start() {
    shown = true;
    if (!style.parentNode) document.head.appendChild(style);
    document.documentElement.classList.add('copy-path-on');
    function go() {
      refresh();
      var list = document.getElementById('list');
      if (list && window.MutationObserver && !listObserver) {
        listObserver = new MutationObserver(function () { refresh(); });
        listObserver.observe(list, { childList: true });
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
  }

  function hide() {
    shown = false;
    document.documentElement.classList.remove('copy-path-on');
    document.querySelectorAll('.copy-path').forEach(function (button) { button.remove(); });
  }

  function vendorSrc() {
    var scripts = document.getElementsByTagName('script');
    var i;
    for (i = 0; i < scripts.length; i += 1) {
      var src = scripts[i].src || '';
      if (src.indexOf('copy-path.js') !== -1) return src.replace(/copy-path\.js(?:\?.*)?$/, 'vendor/supabase.js?v=1');
    }
    return 'assets/vendor/supabase.js?v=1';
  }

  function whenSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve) {
      var tag = document.createElement('script');
      tag.src = vendorSrc();
      tag.onload = function () { resolve(); };
      tag.onerror = function () { resolve(); };
      document.head.appendChild(tag);
    });
  }

  function applySession(client, session) {
    if (!session) {
      hide();
      return;
    }
    client.rpc('is_content_editor').then(function (check) {
      if (check && !check.error && check.data === true) start();
      else hide();
    }, hide);
  }

  whenSdk().then(function () {
    var cfg = window.SUPABASE_PUBLIC || {};
    if (!cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return;
    var client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: {
        storageKey: 'p6-sb-auth',
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    client.auth.getSession().then(function (result) {
      applySession(client, result.data && result.data.session);
    }, hide);
    client.auth.onAuthStateChange(function (_event, session) {
      applySession(client, session);
    });
  });
})();
