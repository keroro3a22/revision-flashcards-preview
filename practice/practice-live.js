/* Use published practice questions when the studio has published this mode. */
window.PracticeLive = (function () {
  function packName(unit) {
    if (unit === 'mixed') return 'PRACTICE_MIXED';
    return 'PRACTICE_UNIT' + String(unit || '').replace(/^unit/, '');
  }

  function question(row) {
    var body = row.published || {};
    var options = String(body.options || '').split('|').map(function (part) { return part.trim(); }).filter(Boolean);
    var setNo = Number(row.set_no);
    if (!isFinite(setNo) || setNo < 1) setNo = Number(body.set) || 1;
    return {
      id: body.id || ('live-' + row.level_name + '-' + setNo + '-' + row.n),
      set: setNo,
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
      img: body.img || '',
      frame: body.frame || null
    };
  }

  function bySet(rows) {
    return (rows || []).slice().sort(function (a, b) {
      var aSet = Number(a.set_no) || Number(a.published && a.published.set) || 1;
      var bSet = Number(b.set_no) || Number(b.published && b.published.set) || 1;
      if (aSet !== bSet) return aSet - bSet;
      return Number(a.n) - Number(b.n);
    });
  }

  function apply(unit, mode, rows) {
    var pack = window[packName(unit)];
    if (!pack || !rows || !rows.length) return;
    var ordered = bySet(rows);
    if (mode === 'fill') {
      pack.fillIn = [];
      pack.fillInHard = [];
      ordered.forEach(function (row) {
        var item = question(row);
        if (row.level_name === 'hard') pack.fillInHard.push(item);
        else pack.fillIn.push(item);
      });
      return;
    }
    var items = ordered.map(question);
    items.forEach(function (item) { delete item.set; });
    if (mode === 'letters') pack.missingLetters = items;
    else if (mode === 'match') pack.matching = items;
    else if (mode === 'timed') pack.timed = items;
  }

  function currentPlace(unit) {
    var saved = window.RevisionPlace && window.RevisionPlace.read(window.localStorage);
    var query = '';
    try { query = new URLSearchParams(location.search).get('term') || ''; } catch (e) {}
    var term = query === 'first' || query === 'second' ? query : (saved && saved.term) || 'first';
    if ((query === 'first' || query === 'second') && saved && window.RevisionPlace) {
      window.RevisionPlace.write(window.localStorage, Object.assign({}, saved, { term: term, unit: unit }));
    }
    return {
      book: saved && saved.book || 'oxford',
      series: saved && saved.series || 'oxford',
      term: term,
      level: saved && saved.level || 'p6',
      unit: unit
    };
  }

  function ready(mode) {
    var cfg = window.SUPABASE_PUBLIC || {};
    var unit = 'unit1';
    try { unit = new URLSearchParams(location.search).get('unit') || 'unit1'; } catch (e) {}
    var here = currentPlace(unit);
    if (!cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return Promise.resolve();
    var client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return client.from('practice_items_live')
      .select('n,level_name,set_no,published')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term).eq('level', here.level)
      .eq('unit_id', here.unit).eq('track', 'vocab').eq('mode', mode)
      .order('set_no', { ascending: true })
      .order('n', { ascending: true })
      .then(function (result) {
        if (!result.error && result.data && result.data.length) apply(unit, mode, result.data);
      }, function () {});
  }

  return { ready: ready };
})();
