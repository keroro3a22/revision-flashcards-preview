/* The Resources shelf for the current book. Prices are visible. Files stay locked. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Resources = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function text(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function formatPrice(value) {
    var amount = Number(value);
    if (!isFinite(amount)) return 'HK$0';
    var rounded = Math.round(amount * 100) / 100;
    return 'HK$' + (rounded % 1 ? rounded.toFixed(2) : String(rounded));
  }

  function kindLabel(kind) {
    return kind === 'practice-paper' ? 'Practice paper' : 'Mock test';
  }

  function client() {
    var cfg = root && root.SUPABASE_PUBLIC;
    if (!cfg || !cfg.url || !cfg.key || !root.supabase || !root.supabase.createClient) return null;
    return root.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  function paint(box, rows) {
    box.replaceChildren();
    if (!rows.length) {
      var empty = document.createElement('p');
      empty.className = 'resource-empty';
      empty.textContent = 'No papers for this book yet.';
      box.appendChild(empty);
      return;
    }
    var list = document.createElement('div');
    list.className = 'resource-list';
    rows.forEach(function (row) {
      var card = document.createElement('article');
      card.className = 'resource-card';
      var title = document.createElement('h3');
      title.textContent = row.title || 'Untitled paper';
      var meta = document.createElement('p');
      meta.className = 'resource-meta';
      meta.textContent = kindLabel(row.kind) + ' · ' + formatPrice(row.price);
      card.appendChild(title);
      card.appendChild(meta);
      if (row.note) {
        var note = document.createElement('p');
        note.textContent = row.note;
        card.appendChild(note);
      }
      var button = document.createElement('button');
      button.type = 'button';
      button.disabled = true;
      button.textContent = 'Download locked';
      card.appendChild(button);
      list.appendChild(card);
    });
    box.appendChild(list);
  }

  function mount(place, box) {
    if (!box) return;
    box.replaceChildren();
    var waiting = document.createElement('p');
    waiting.className = 'resource-empty';
    waiting.textContent = 'Loading papers…';
    box.appendChild(waiting);
    var db = client();
    if (!db) {
      waiting.textContent = 'No papers for this book yet.';
      return;
    }
    db.from('resources_live').select('id,title,kind,price,note')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
      .order('id', { ascending: true })
      .then(function (result) {
        paint(box, result.error ? [] : (result.data || []));
      }).catch(function () { paint(box, []); });
  }

  return { formatPrice: formatPrice, kindLabel: kindLabel, mount: mount };
});
