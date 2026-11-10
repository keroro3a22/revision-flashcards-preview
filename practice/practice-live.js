/* Use published practice questions when the studio has published this mode. */
window.PracticeLive = (function () {
  function packName(unit) {
    return 'PRACTICE_UNIT' + String(unit || '').replace(/^unit/, '');
  }

  function question(row) {
    var body = row.published || {};
    var options = String(body.options || '').split('|').map(function (part) { return part.trim(); }).filter(Boolean);
    return {
      id: body.id || ('live-' + row.level_name + '-' + row.n),
      wordKey: body.wordKey || '',
      sentence: body.sentence || body.prompt || '',
      blank: body.blank || '______',
      options: options,
      answer: body.answer || '',
      accept: body.accept || [body.answer || ''],
      explain: body.explain || '',
      word: body.word || body.prompt || '',
      en: body.en || body.prompt || '',
      zh: body.zh || body.answer || '',
      form: body.form || body.options || '',
      img: body.img || ''
    };
  }

  function apply(unit, mode, rows) {
    var pack = window[packName(unit)];
    if (!pack || !rows || !rows.length) return;
    if (mode === 'fill') {
      pack.fillIn = [];
      pack.fillInHard = [];
      rows.forEach(function (row) {
        var item = question(row);
        if (row.level_name === 'hard') pack.fillInHard.push(item);
        else pack.fillIn.push(item);
      });
      return;
    }
    var items = rows.map(question);
    if (mode === 'letters') pack.missingLetters = items;
    else if (mode === 'match') pack.matching = items;
    else if (mode === 'timed') pack.timed = items;
  }

  function ready(mode) {
    var cfg = window.SUPABASE_PUBLIC || {};
    var unit = 'unit1';
    try { unit = new URLSearchParams(location.search).get('unit') || 'unit1'; } catch (e) {}
    if (!cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return Promise.resolve();
    var client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return client.from('practice_items_live')
      .select('n,level_name,published')
      .eq('book', 'oxford').eq('series', 'oxford').eq('term', 'first').eq('level', 'p6')
      .eq('unit_id', unit).eq('track', 'vocab').eq('mode', mode)
      .order('n', { ascending: true })
      .then(function (result) {
        if (!result.error && result.data && result.data.length) apply(unit, mode, result.data);
      }, function () {});
  }

  return { ready: ready };
})();
