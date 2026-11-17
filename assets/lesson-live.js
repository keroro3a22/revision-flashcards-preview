/* Replace the cards baked into the page with the published rows, when they exist. */
(function () {
  var body = document.body;
  var book = body.getAttribute('data-book');
  var series = body.getAttribute('data-series');
  var term = body.getAttribute('data-term');
  var level = body.getAttribute('data-level');
  var unit = body.getAttribute('data-unit');
  var track = body.getAttribute('data-track') || 'vocab';
  var cfg = window.SUPABASE_PUBLIC || {};
  var queryTerm = '';
  try { queryTerm = new URLSearchParams(location.search).get('term') || ''; } catch (e) {}
  var savedPlace = window.RevisionPlace && window.RevisionPlace.read(window.localStorage);
  if (queryTerm === 'first' || queryTerm === 'second') term = queryTerm;
  else if (savedPlace && savedPlace.book === book && savedPlace.series === series && savedPlace.level === level && savedPlace.unit === unit && (savedPlace.term === 'first' || savedPlace.term === 'second')) term = savedPlace.term;
  if (term === 'first' || term === 'second') body.setAttribute('data-term', term);
  var lessonSettled = false;
  function revealLesson() {
    lessonSettled = true;
    document.documentElement.setAttribute('data-lesson', 'ready');
  }
  if (!book || !series || !term || !level || !unit || !cfg.url || !cfg.key) {
    revealLesson();
    return;
  }

  function officialLessonImage(url) {
    if (!url || term !== 'first') return url;
    var text = String(url);
    var file = text.split('?')[0].split('/').pop();
    var vocab = {
      'u2_vocab_01_drought.jpg': 'thumb_01.jpg?v=4',
      'u2_vocab_02_earthquake.jpg': 'thumb_02.jpg?v=4',
      'u2_vocab_04_landslip.jpg': 'thumb_04.jpg?v=4',
      'u2_vocab_05_tsunami.jpg': 'thumb_05.jpg?v=4',
      'u2_vocab_09_destroy.jpg': 'thumb_09.jpg?v=4'
    };
    if (vocab[file]) return vocab[file];
    if (file === 'u5-grammar-13-1x1.png') return 'thumb_29.jpg?v=4';
    return text;
  }

  function mediaRoot() {
    var scripts = document.getElementsByTagName('script');
    var i;
    for (i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      var cut = src.indexOf('assets/lesson-live.js');
      if (cut !== -1) return src.slice(0, cut);
    }
    return '';
  }

  function livePath(url) {
    if (!url) return url;
    var text = String(url);
    if (/^https?:\/\//i.test(text)) return text;
    if (text.indexOf('oxford-6b/') === 0) return mediaRoot() + text;
    return text;
  }

  function funfactPath(url) {
    var text = livePath(url);
    if (!text || /^https?:\/\//i.test(text) || text.indexOf('/') < 0) return text;
    return mediaRoot() + text.replace(/^(\.\.\/)+/, '');
  }

  function brainIcon() {
    return mediaRoot() + 'assets/brain-boost.png?v=1';
  }
  var funfactPop = null;
  var funfactReturn = null;

  function funfactReady(card) {
    if (!card || !(card.funfact_on === true || card.funfact_on === 'true')) return false;
    return !!(String(card.funfact_text || '').trim() || String(card.funfact_img || '').trim());
  }

  function pageLocked() {
    var lightbox = document.getElementById('lightbox');
    return !!(lightbox && lightbox.classList.contains('open'));
  }

  function closeFunfact() {
    if (!funfactPop || !funfactPop.classList.contains('open')) return;
    funfactPop.classList.remove('open');
    if (!pageLocked()) document.body.style.overflow = '';
    if (funfactReturn && funfactReturn.focus) funfactReturn.focus();
    funfactReturn = null;
  }

  function ensureFunfactPop() {
    if (funfactPop) return funfactPop;
    funfactPop = document.createElement('div');
    funfactPop.className = 'funfact-pop';
    funfactPop.setAttribute('role', 'dialog');
    funfactPop.setAttribute('aria-modal', 'true');
    funfactPop.setAttribute('aria-labelledby', 'funfact-title');
    funfactPop.innerHTML = '<div class="funfact-card">'
      + '<p id="funfact-title" class="funfact-title">Brain Boost !</p>'
      + '<div class="funfact-photo img-crop"><img class="funfact-img" alt=""></div>'
      + '<div class="funfact-block"></div>'
      + '<button type="button" class="funfact-close">Close</button>'
      + '</div>';
    funfactPop.addEventListener('click', function (event) {
      if (event.target === funfactPop) closeFunfact();
    });
    funfactPop.querySelector('.funfact-close').addEventListener('click', closeFunfact);
    document.body.appendChild(funfactPop);
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !funfactPop.classList.contains('open')) return;
      event.stopPropagation();
      closeFunfact();
    }, true);
    return funfactPop;
  }

  function appendFunfactPieces(parent, line, headlineClass) {
    var re = /\{\{(h|m)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    var last = 0;
    var match;
    while ((match = re.exec(line))) {
      if (match.index > last) parent.appendChild(document.createTextNode(line.slice(last, match.index)));
      if (match[2]) {
        var span = document.createElement('span');
        span.className = match[1] === 'h' ? headlineClass : 'hl';
        span.textContent = match[2];
        parent.appendChild(span);
      }
      last = re.lastIndex;
    }
    if (last < line.length) parent.appendChild(document.createTextNode(line.slice(last)));
  }
  function paintFunfactBlock(block, raw) {
    block.textContent = '';
    var lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
    lines.forEach(function (line) {
      if (!String(line).trim()) return;
      var row = document.createElement('p');
      row.className = 'funfact-line';
      appendFunfactPieces(row, line, 'funfact-headline');
      if (row.childNodes.length === 1 && row.firstChild.classList && row.firstChild.classList.contains('funfact-headline')) row.classList.add('is-headline');
      if (row.childNodes.length) block.appendChild(row);
    });
    return !!block.childNodes.length;
  }
  function openFunfact(card, button) {
    var box = ensureFunfactPop();
    var photo = box.querySelector('.funfact-photo');
    var img = box.querySelector('.funfact-img');
    var block = box.querySelector('.funfact-block');
    var words = String(card.funfact_text || '').trim();
    var picture = String(card.funfact_img || '').trim();
    if (picture) {
      photo.hidden = false;
      img.hidden = false;
      img.src = picture;
      img.alt = words ? '' : 'Brain Boost !';
      if (window.ImgFrame) window.ImgFrame.apply(img, card.funfact_frame, 3 / 2);
    } else {
      photo.hidden = true;
      img.hidden = true;
      img.removeAttribute('src');
      img.alt = '';
    }
    block.hidden = !paintFunfactBlock(block, words);
    funfactReturn = button || null;
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    box.querySelector('.funfact-close').focus();
  }

  function mountFunfacts(cards) {
    (cards || []).forEach(function (card) {
      if (!funfactReady(card)) return;
      var article = document.getElementById('c' + card.n);
      if (!article || article.querySelector('.funfact-btn')) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'funfact-btn';
      button.setAttribute('aria-label', 'Brain Boost !');
      var icon = document.createElement('img');
      icon.src = brainIcon();
      icon.alt = '';
      icon.draggable = false;
      button.appendChild(icon);
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openFunfact(card, button);
      });
      var speaker = article.querySelector('.speaker');
      if (speaker) speaker.insertAdjacentElement('afterend', button);
      else article.appendChild(button);
    });
  }

  function show(cards) {
    if (!cards || !cards.length || typeof window.applyLessonCards !== 'function') {
      revealLesson();
      return;
    }
    var mapped = cards.map(function (card) {
      if (!card) return card;
      var next = Object.assign({}, card);
      if (next.img) next.img = livePath(officialLessonImage(next.img));
      if (next.audio) next.audio = livePath(next.audio);
      if (next.funfact_img) next.funfact_img = funfactPath(next.funfact_img);
      return next;
    });
    window.applyLessonCards(mapped);
    mountFunfacts(mapped);
    revealLesson();
  }

  function load() {
    if (!window.supabase || !window.supabase.createClient) return;
    var client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    client.from('lesson_cards_live').select('n,en,syllables,zh,pos,ex_en,ex_zh,adv_en,adv_zh,highlight,highlight_adv,audio,img,img_frame,video,pattern,note_zh,cutout,funfact_on,funfact_text,funfact_img,funfact_frame')
      .eq('book', book).eq('series', series).eq('term', term).eq('level', level).eq('unit_id', unit).eq('track', track)
      .order('n', { ascending: true })
      .then(function (result) {
        if (result.error || !result.data || !result.data.length) {
          if (!result.error && term === 'second') {
            var list = document.getElementById('list');
            if (list) list.textContent = '';
          }
          revealLesson();
          return;
        }
        show(result.data);
      }, revealLesson);
    client.from('site_pages_live').select('label')
      .eq('book', book).eq('series', series).eq('term', term).eq('level', level)
      .eq('unit_id', unit).eq('slot', 'title')
      .maybeSingle()
      .then(function (result) {
        var label = result.data && String(result.data.label || '').trim();
        var heading = document.querySelector('.unit-header h1');
        if (!heading) return;
        if (!label && term === 'first') return;
        var text = label ? 'Unit ' + String(unit).replace(/^unit/, '') + ' ' + label : 'Unit ' + String(unit).replace(/^unit/, '');
        heading.textContent = track === 'grammar' ? text + ' · Grammar' : text;
        document.title = heading.textContent;
      });
  }

  if (window.supabase && window.supabase.createClient) load();
  else {
    var tag = document.createElement('script');
    tag.src = '../assets/vendor/supabase.js?v=1';
    tag.onload = load;
    tag.onerror = revealLesson;
    document.head.appendChild(tag);
  }
  setTimeout(function () {
    if (!lessonSettled) revealLesson();
  }, 8000);
})();
