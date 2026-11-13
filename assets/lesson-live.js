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
  if (!book || !series || !term || !level || !unit || !cfg.url || !cfg.key) return;

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

  function show(cards) {
    if (!cards || !cards.length || typeof window.applyLessonCards !== 'function') return;
    window.applyLessonCards(cards.map(function (card) {
      if (!card || !card.img) return card;
      var next = Object.assign({}, card);
      next.img = officialLessonImage(card.img);
      return next;
    }));
  }

  function load() {
    if (!window.supabase || !window.supabase.createClient) return;
    var client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    client.from('lesson_cards_live').select('n,en,syllables,zh,pos,ex_en,ex_zh,adv_en,adv_zh,highlight,highlight_adv,audio,img,img_frame,video,pattern,note_zh,cutout')
      .eq('book', book).eq('series', series).eq('term', term).eq('level', level).eq('unit_id', unit).eq('track', track)
      .order('n', { ascending: true })
      .then(function (result) { if (!result.error) show(result.data); });
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
    document.head.appendChild(tag);
  }
})();
