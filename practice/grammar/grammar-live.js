/* Published grammar practice is the same list the studio edits.
   When that list is empty, the page keeps the questions written in the file. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarLive = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function extractSets(source) {
    var start = source.search(/(?:const|let|var)\s+set1Data\s*=/);
    var end = source.search(/(?:const|let|var)\s+SETS\s*=|function boot\(SETS\)/);
    if (start < 0 || end < 0 || end <= start) return [];
    var chunk = source.slice(start, end);
    return new Function(chunk + '\nreturn [set1Data, set2Data, set3Data, set4Data, set5Data];')();
  }

  function setMeta(set) {
    var meta = {};
    Object.keys(set || {}).forEach(function (key) {
      if (key === 'scenes' || key === 'bubbles' || key === 'items' || key === 'endQ') return;
      meta[key] = set[key];
    });
    return meta;
  }

  function promptOf(item) {
    if (!item) return '';
    if (Array.isArray(item.parts)) return item.parts.join('');
    if (Array.isArray(item.preview)) {
      return item.preview.map(function (part) { return part === 'REL' ? '____' : part; }).join('');
    }
    if (item.q) return item.q;
    if (item.full && item.answer && String(item.full).indexOf(item.answer) >= 0) {
      return String(item.full).replace(item.answer, '____');
    }
    if (item.a || item.b) return [item.a || '', item.b || ''].filter(Boolean).join('\n');
    return item.sentence || item.prompt || '';
  }

  function answerOf(item) {
    if (!item || item.answer == null) return '';
    return Array.isArray(item.answer) ? item.answer.join(' | ') : String(item.answer);
  }

  function optionsOf(item) {
    if (!item || item.options == null) return '';
    return Array.isArray(item.options) ? item.options.join(' | ') : String(item.options);
  }

  function flatten(sets) {
    var rows = [];
    (sets || []).forEach(function (set, setIndex) {
      var meta = setMeta(set);
      function push(item, bucket) {
        var body = {
          set: setIndex + 1,
          bucket: bucket,
          meta: meta,
          item: item,
          prompt: promptOf(item),
          answer: answerOf(item),
          explain: item.explain || '',
          options: optionsOf(item)
        };
        rows.push(body);
      }
      (set.scenes || []).forEach(function (item) { push(item, 'scenes'); });
      (set.bubbles || []).forEach(function (item) { push(item, 'bubbles'); });
      (set.items || []).forEach(function (item) { push(item, 'items'); });
      if (set.endQ) push(set.endQ, 'endQ');
    });
    return rows;
  }

  function rebuild(rows) {
    var sets = [];
    (rows || []).forEach(function (row) {
      var body = row && row.published ? row.published : row;
      if (!body || !body.item) return;
      var index = (Number(body.set) || 1) - 1;
      if (!sets[index]) {
        sets[index] = Object.assign({ scenes: [], bubbles: [], items: [] }, body.meta || {});
      }
      var set = sets[index];
      if (body.bucket === 'endQ') set.endQ = body.item;
      else if (body.bucket === 'scenes') set.scenes.push(body.item);
      else if (body.bucket === 'bubbles') set.bubbles.push(body.item);
      else set.items.push(body.item);
    });
    return sets.filter(Boolean).map(function (set) {
      var out = Object.assign({}, set);
      if (!out.scenes.length) delete out.scenes;
      if (!out.bubbles.length) delete out.bubbles;
      if (!out.items.length) delete out.items;
      return out;
    });
  }

  function load(opts) {
    var cfg = root.SUPABASE_PUBLIC || {};
    var mode = opts && opts.mode;
    var unit = mode === 'boss' ? 'mixed' : ((opts && opts.unit) || 'unit1');
    if (!mode || !cfg.url || !cfg.key || !root.supabase || !root.supabase.createClient) {
      return Promise.resolve(null);
    }
    var saved = root.RevisionPlace && root.RevisionPlace.read(root.localStorage);
    var here = {
      book: saved && saved.book || 'oxford',
      series: saved && saved.series || 'oxford',
      term: saved && saved.term || 'first',
      level: saved && saved.level || 'p6'
    };
    var client = root.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return client.from('practice_items_live')
      .select('n,published')
      .eq('book', here.book).eq('series', here.series).eq('term', here.term).eq('level', here.level)
      .eq('unit_id', unit).eq('track', 'grammar').eq('mode', mode)
      .order('n', { ascending: true })
      .then(function (result) {
        if (result.error || !result.data || !result.data.length) return null;
        var data = result.data.slice().sort(function (a, b) {
          var aSet = Number(a.published && a.published.set) || 1;
          var bSet = Number(b.published && b.published.set) || 1;
          if (aSet !== bSet) return aSet - bSet;
          return Number(a.n) - Number(b.n);
        });
        return rebuild(data);
      }, function () { return null; });
  }

  return {
    extractSets: extractSets,
    flatten: flatten,
    rebuild: rebuild,
    load: load
  };
});
