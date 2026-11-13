/* Sentence-fill sets. Students never pick a set.
   An unfinished set continues at the saved question.
   A finished set opens the next set on the next visit. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FillSets = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function setNumber(item) {
    var n = Number(item && item.set);
    if (!isFinite(n) || n < 1) return 1;
    return Math.floor(n);
  }

  function group(items) {
    var buckets = [];
    (items || []).forEach(function (item) {
      var n = setNumber(item);
      if (!buckets[n - 1]) buckets[n - 1] = [];
      buckets[n - 1].push(item);
    });
    return buckets.filter(function (bucket) { return bucket && bucket.length; });
  }

  function key(unitId, mode) {
    return 'p6-fill-set-v1:' + (unitId || 'unit') + ':' + (mode || 'easy');
  }

  function read(storage, storageKey) {
    try {
      var raw = storage.getItem(storageKey);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function write(storage, storageKey, progress) {
    try {
      storage.setItem(storageKey, JSON.stringify({
        set: Number(progress.set) || 0,
        item: Number(progress.item) || 0,
        finished: !!progress.finished
      }));
    } catch (e) { /* private mode */ }
  }

  function resume(progress, sets) {
    var count = (sets || []).length;
    if (!count) return { set: 0, item: 0 };
    var set = 0;
    var item = 0;
    if (progress) {
      set = Number(progress.set) || 0;
      item = Number(progress.item) || 0;
      if (progress.finished) {
        set += 1;
        item = 0;
      }
    }
    set = ((set % count) + count) % count;
    var len = sets[set].length;
    if (item < 0) item = 0;
    if (item >= len) item = len - 1;
    return { set: set, item: item };
  }

  function locate(sets, focusId) {
    if (!focusId) return null;
    for (var s = 0; s < (sets || []).length; s++) {
      for (var i = 0; i < sets[s].length; i++) {
        if (sets[s][i] && sets[s][i].id === focusId) return { set: s, item: i };
      }
    }
    return null;
  }

  return {
    group: group,
    key: key,
    read: read,
    write: write,
    resume: resume,
    locate: locate
  };
});
