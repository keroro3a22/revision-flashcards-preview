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
  if (!book || !series || !term || !level || !unit || !cfg.url || !cfg.key) return;

  function show(cards) {
    if (!cards || !cards.length || typeof window.applyLessonCards !== 'function') return;
    window.applyLessonCards(cards);
  }

  function load() {
    if (!window.supabase || !window.supabase.createClient) return;
    var client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    var columns = 'n,en,syllables,zh,pos,ex_en,ex_zh,adv_en,adv_zh,highlight,highlight_adv,audio,img,video,pattern,note_zh,cutout';
    var legacy = 'n,en,syllables,zh,pos,ex_en,ex_zh,adv_en,adv_zh,highlight,audio,img,video,pattern,note_zh,cutout';
    function run(list, fallback) {
      client.from('lesson_cards_live').select(list)
        .eq('book', book).eq('series', series).eq('term', term).eq('level', level).eq('unit_id', unit).eq('track', track)
        .order('n', { ascending: true })
        .then(function (result) {
          if (result.error && fallback) { run(fallback, ''); return; }
          if (!result.error) show(result.data);
        });
    }
    run(columns, legacy);
  }

  if (window.supabase && window.supabase.createClient) load();
  else {
    var tag = document.createElement('script');
    tag.src = '../assets/vendor/supabase.js?v=1';
    tag.onload = load;
    document.head.appendChild(tag);
  }
})();
