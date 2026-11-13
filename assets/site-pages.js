/* Unit titles, door pictures, and the Get started lines.
   An empty saved field keeps the default. Students read site_pages_live. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SitePages = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  var DOORS = [
    { id: 'revision-vocab', group: 'revision', groupLabel: 'Revision card', label: 'Vocab', note: 'Open the word cards.', photo: 'first', track: 'vocab', source: 'lesson' },
    { id: 'revision-grammar', group: 'revision', groupLabel: 'Revision card', label: 'Grammar', note: 'Open the grammar cards.', photo: 'first', track: 'grammar', source: 'lesson' },
    { id: 'practice-vocab', group: 'practice', groupLabel: 'Practice', label: 'Vocab', note: 'Open the quizzes.', photo: 'second', track: 'vocab', source: 'practice' },
    { id: 'practice-grammar', group: 'practice', groupLabel: 'Practice', label: 'Grammar', note: 'Open the grammar games.', photo: 'second', track: 'grammar', source: 'practice' }
  ];
  var HOME = [
    { id: 'hero', label: 'English Revision', note: 'Flashcards, games, quizzes', image: '' },
    { id: 'hear', label: 'Hear it', note: 'Tap Play on a card. Practise the word aloud with the syllable breaks.', image: 'covers/unit4.jpg' },
    { id: 'see', label: 'See it', note: 'Look at the picture for the word. Tap it to enlarge and notice the scene.', image: 'unit3/thumb_01.jpg' },
    { id: 'read', label: 'Read it', note: 'Read a textbook sentence and a Form 1 sentence. Traditional Chinese is under each one.', image: 'unit1/thumb_01.jpg' }
  ];
  var BOOK_A_TITLES = {
    unit1: 'For a good cause',
    unit2: 'Lend a helping hand',
    unit3: 'Junior Super Chef',
    unit4: 'Film magic',
    unit5: 'The Land of Kangaroos',
    unit6: 'International Week'
  };
  var BOOK_A_PACKS = {
    unit1: 'Charity verbs. adopt a pet, donate money, walkathon.',
    unit2: 'Natural disasters and how we help. drought, flood, rescue.',
    unit3: 'Kitchen verbs. beat, grate, simmer, and more for cooking class.',
    unit4: 'Genres and cinema words. action film, comedy, fantasy, musical.',
    unit5: 'Travelling activities. snowboarding, a kangaroo, a cruise, and more.',
    unit6: 'Countries and culture. China, a kimono, a carnival, and more.'
  };
  var BOOK_A_IMAGES = {
    unit1: {
      'revision-vocab': 'covers/unit1.jpg',
      'revision-grammar': 'practice/grammar/illust/u1_09_fair.jpg',
      'practice-vocab': 'unit1/thumb_08.jpg',
      'practice-grammar': 'practice/grammar/illust/u1_09_fair.jpg'
    },
    unit2: {
      'revision-vocab': 'covers/unit2.jpg',
      'revision-grammar': 'practice/grammar/illust/u2_06_typhoon.jpg',
      'practice-vocab': 'unit2/thumb_09.jpg',
      'practice-grammar': 'practice/grammar/illust/u2_06_typhoon.jpg'
    },
    unit3: {
      'revision-vocab': 'covers/unit3.jpg',
      'revision-grammar': 'unit3/thumb_06.jpg',
      'practice-vocab': 'unit3/thumb_04.jpg',
      'practice-grammar': 'unit3/thumb_06.jpg'
    },
    unit4: {
      'revision-vocab': 'covers/unit4.jpg',
      'revision-grammar': 'practice/grammar/illust/u4_sparkly_finale.jpg',
      'practice-vocab': 'unit4/thumb_10.jpg',
      'practice-grammar': 'practice/grammar/illust/u4_sparkly_finale.jpg'
    },
    unit5: {
      'revision-vocab': 'covers/unit5.jpg',
      'revision-grammar': 'unit5/thumb_17.png',
      'practice-vocab': 'unit5/thumb_09.png',
      'practice-grammar': 'unit5/thumb_17.png'
    },
    unit6: {
      'revision-vocab': 'covers/unit6.jpg',
      'revision-grammar': 'unit6/thumb_20.png',
      'practice-vocab': 'unit6/thumb_10.png',
      'practice-grammar': 'unit6/thumb_20.png'
    }
  };
  var request = 0;

  function bookA(place) {
    return !!place && place.book === 'oxford' && place.series === 'oxford' && place.level === 'p6' && place.term === 'first';
  }

  function text(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function imageSrc(unitId, image) {
    var value = text(image);
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.indexOf('/') >= 0) return value;
    return (unitId ? unitId + '/' : '') + value.replace(/^\.\//, '');
  }

  function bySlot(pages, unitId) {
    var out = {};
    (pages || []).forEach(function (row) {
      if (row.unit_id === unitId) out[row.slot] = row;
    });
    return out;
  }

  function lessonRows(lessons, unitId, track) {
    return (lessons || []).filter(function (row) {
      return row.unit_id === unitId && row.track === track;
    }).sort(function (a, b) { return Number(a.n) - Number(b.n); });
  }

  function cardsFor(lessons, unitId, track) {
    return lessonRows(lessons, unitId, track).filter(function (row) { return text(row.img); });
  }

  function countOf(rows, unitId, track) {
    return (rows || []).filter(function (row) {
      return row.unit_id === unitId && row.track === track;
    }).length;
  }

  function cardPhoto(cards, which) {
    if (!cards.length) return '';
    if (which === 'second') return cards[1] ? cards[1].img : cards[0].img;
    return cards[0].img;
  }

  function defaults(place, unitId, slot, lessons) {
    if (unitId === 'home') {
      var home = HOME.filter(function (item) { return item.id === slot; })[0] || { label: '', note: '', image: '' };
      return { label: home.label, note: home.note, image: home.image };
    }
    if (slot === 'title') {
      return {
        label: bookA(place) ? (BOOK_A_TITLES[unitId] || '') : '',
        note: bookA(place) ? (BOOK_A_PACKS[unitId] || '') : '',
        image: ''
      };
    }
    var door = DOORS.filter(function (item) { return item.id === slot; })[0];
    if (!door) return { label: '', note: '', image: '' };
    var cards = cardsFor(lessons, unitId, door.track);
    var photo = cardPhoto(cards, door.photo);
    if (!photo && bookA(place) && BOOK_A_IMAGES[unitId]) photo = BOOK_A_IMAGES[unitId][slot] || '';
    return { label: door.label, note: door.note, image: photo };
  }

  function savedValue(row, key) {
    return row ? text(row[key]) : '';
  }

  function chosen(row, key, fallback) {
    var value = savedValue(row, key);
    return value || fallback;
  }

  function photoRatio(slot) {
    if (slot === 'title' || slot === 'hero') return 1;
    return 4 / 3;
  }

  function rowFrame(row) {
    if (!row) return null;
    if (row.frame) return row.frame;
    if (row.image_frame) return row.image_frame;
    return null;
  }

  function hrefFor(place, unitId, doorId) {
    var term = 'term=' + encodeURIComponent(place.term || 'first');
    if (doorId === 'revision-vocab') return unitId + '/?' + term;
    if (doorId === 'revision-grammar') return unitId + '/grammar/?' + term;
    if (doorId === 'practice-vocab') return 'practice/?unit=' + encodeURIComponent(unitId) + '&' + term;
    return 'practice/grammar/' + unitId + '-hub/?' + term;
  }

  function resolveUnit(place, unitId, pages, lessons, practices) {
    var saved = bySlot(pages, unitId);
    var titleRow = saved.title;
    var title = chosen(titleRow, 'label', defaults(place, unitId, 'title', lessons).label);
    var packNote = chosen(titleRow, 'note', defaults(place, unitId, 'title', lessons).note);
    var items = DOORS.map(function (door) {
      var row = saved[door.id];
      var base = defaults(place, unitId, door.id, lessons);
      var count = door.source === 'lesson' ? lessonRows(lessons, unitId, door.track).length : countOf(practices, unitId, door.track);
      var ready = count > 0;
      if (door.id === 'practice-grammar' && !/^unit[1-6]$/.test(unitId)) ready = false;
      var ownImage = savedValue(row, 'image');
      var image = imageSrc(unitId, ownImage || (ready ? base.image : ''));
      return {
        id: door.id,
        group: door.group,
        label: chosen(row, 'label', base.label),
        note: ready ? chosen(row, 'note', base.note) : 'Coming soon',
        image: ready ? image : '',
        frame: ready ? rowFrame(row) : null,
        href: ready ? hrefFor(place, unitId, door.id) : '',
        ready: ready
      };
    });
    return {
      id: unitId,
      title: title,
      packNote: packNote,
      words: lessonRows(lessons, unitId, 'vocab').length,
      listed: !!(title || items.some(function (item) { return item.ready; })),
      items: items
    };
  }

  function groupsFor(place, unitId, catalog) {
    var unit = resolveUnit(place, unitId, catalog.pages, catalog.lessons, catalog.practices);
    var groups = [];
    ['revision', 'practice'].forEach(function (id) {
      var door = DOORS.filter(function (item) { return item.group === id; })[0];
      groups.push({
        id: id,
        label: door.groupLabel,
        items: unit.items.filter(function (item) { return item.group === id; })
      });
    });
    return { title: unit.title, groups: groups, unit: unit };
  }

  function packsFor(place, unitIds, catalog) {
    return (unitIds || []).map(function (unitId) {
      return resolveUnit(place, unitId, catalog.pages, catalog.lessons, catalog.practices);
    }).filter(function (unit) { return unit.listed; });
  }

  function homeCopy(place, pages) {
    var saved = bySlot(pages, 'home');
    var out = {};
    HOME.forEach(function (item) {
      var row = saved[item.id];
      out[item.id] = {
        label: chosen(row, 'label', item.label),
        note: chosen(row, 'note', item.note),
        image: imageSrc('', chosen(row, 'image', item.image)),
        frame: rowFrame(row)
      };
    });
    return out;
  }

  function slotsFor(unitId) {
    if (unitId === 'home') {
      return [
        { id: 'hero', name: 'Get started' },
        { id: 'hear', name: 'Hear it' },
        { id: 'see', name: 'See it' },
        { id: 'read', name: 'Read it' }
      ];
    }
    return [{ id: 'title', name: 'Unit title' }].concat(DOORS.map(function (door) {
      return { id: door.id, name: door.groupLabel + ' · ' + door.label };
    }));
  }

  function client() {
    var cfg = root && root.SUPABASE_PUBLIC;
    if (!cfg || !cfg.url || !cfg.key || !root.supabase || !root.supabase.createClient) return null;
    return root.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  function loadCatalog(db, place) {
    var pages = db.from('site_pages_live').select('unit_id,slot,label,note,image,frame')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level);
    var lessons = db.from('lesson_cards_live').select('unit_id,track,n,img')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level).limit(2000);
    var practices = db.from('practice_items_live').select('unit_id,track')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level).limit(5000);
    return Promise.all([pages, lessons, practices]).then(function (results) {
      return {
        pages: results[0].error ? [] : (results[0].data || []),
        lessons: results[1].error ? [] : (results[1].data || []),
        practices: results[2].error ? [] : (results[2].data || [])
      };
    });
  }

  function unitIds(place) {
    var api = root && root.RevisionPlace;
    if (api && api.unitsFor) {
      return api.unitsFor(place.book, place.level, place.series, place.term).map(function (unit) { return unit.id; });
    }
    return ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'];
  }

  function paintHome(place, catalog) {
    if (!root.document) return;
    var hero = root.document.getElementById('hero-title');
    var support = root.document.querySelector('.hero-support');
    var how = root.document.querySelector('#how .how-grid');
    var track = root.document.getElementById('pack-index');
    if (!hero && !track) return;
    var copy = homeCopy(place, catalog.pages);
    if (hero) hero.textContent = copy.hero.label;
    if (support) support.textContent = copy.hero.note;
    if (how) {
      ['hear', 'see', 'read'].forEach(function (id, index) {
        var card = how.querySelectorAll('.how-card')[index];
        if (!card) return;
        var img = card.querySelector('img');
        var name = card.querySelector('h3');
        var line = card.querySelector('p');
        if (img && copy[id].image) img.src = copy[id].image;
        if (img && copy[id].frame && root.ImgFrame) root.ImgFrame.apply(img, copy[id].frame, photoRatio(id));
        if (name) name.textContent = copy[id].label;
        if (line) line.textContent = copy[id].note;
      });
    }
    if (!track) return;
    var tones = ['coral', 'green', 'sky', 'sunny', 'coral', 'pink'];
    var packs = packsFor(place, unitIds(place), catalog);
    track.replaceChildren();
    packs.forEach(function (unit, index) {
      var n = String(unit.id).replace(/^unit/, '');
      var article = root.document.createElement('article');
      article.className = 'pack-card tone-' + tones[index % tones.length];
      article.setAttribute('aria-roledescription', 'slide');
      var cover = unit.items.filter(function (item) { return item.id === 'revision-vocab'; })[0];
      var src = (cover && cover.image) || imageSrc(unit.id, cardPhoto(cardsFor(catalog.lessons, unit.id, 'vocab'), 'first'));
      var heading = 'Unit ' + n + (unit.title ? ' · ' + unit.title : '');
      var open = cover && cover.ready ? cover.href : './';
      article.innerHTML = '<div class="pack-cover">' + (src ? '<img src="' + escapeHtml(src) + '" alt="" width="640" height="480" loading="lazy" />' : '') + '</div>'
        + '<div class="pack-body"><h3>' + escapeHtml(heading) + '</h3>'
        + (unit.packNote ? '<p>' + escapeHtml(unit.packNote) + '</p>' : '')
        + '<p class="pack-tags"><span class="tag">Unit ' + n + '</span>'
        + (unit.words ? '<span class="tag nums">' + unit.words + ' words</span>' : '')
        + '</p><a class="btn btn-primary pack-open" href="' + escapeHtml(open) + '">Open Unit ' + n + '</a></div>';
      track.appendChild(article);
    });
    var status = root.document.getElementById('pack-status');
    if (status) status.textContent = packs.length ? '1 of ' + packs.length : '';
    if (root.refreshPackCarousel) root.refreshPackCarousel();
  }

  function whenReady(done) {
    var tries = 0;
    function tick() {
      var db = client();
      if (db) { done(db); return; }
      tries += 1;
      if (tries < 40) setTimeout(tick, 100);
    }
    tick();
  }

  function mount(place) {
    if (!place || place.unit === 'game') return;
    var token = ++request;
    whenReady(function (db) {
      loadCatalog(db, place).then(function (catalog) {
        if (token !== request) return;
        if (root.RevisionPlacePaint && place.unit && place.unit !== 'home') {
          root.RevisionPlacePaint(place, groupsFor(place, place.unit, catalog));
        }
        paintHome(place, catalog);
      }).catch(function () {});
    });
  }

  function placeFrom(body) {
    var saved = root.RevisionPlace && root.RevisionPlace.read(root.localStorage);
    var params;
    try { params = new URLSearchParams(root.location.search); } catch (e) { params = new URLSearchParams(); }
    var query = params.get('term') || '';
    var book = body && body.getAttribute('data-book') || (saved && saved.book) || 'oxford';
    var series = body && body.getAttribute('data-series') || (saved && saved.series) || 'oxford';
    var level = body && body.getAttribute('data-level') || (saved && saved.level) || 'p6';
    var unit = body && body.getAttribute('data-unit') || '';
    var queryUnit = params.get('unit') || '';
    if (!unit && /^unit\d+$/.test(queryUnit)) unit = queryUnit;
    if (!unit) {
      var named = String(root.location.pathname || '').match(/unit(\d+)/);
      unit = named ? 'unit' + named[1] : (saved && saved.unit) || 'unit1';
    }
    var term = query === 'first' || query === 'second' ? query : (saved && saved.term) || (body && body.getAttribute('data-term')) || 'first';
    return { book: book, series: series, term: term, level: level, unit: unit };
  }

  function applyHeading(place, title, track) {
    if (!root.document) return;
    if (!title && (!place || place.term === 'first')) return;
    var n = String(place.unit || '').replace(/^unit/, '');
    var text = title ? 'Unit ' + n + ' ' + title : 'Unit ' + n;
    var lesson = root.document.querySelector('.unit-header h1');
    if (lesson) {
      lesson.textContent = track === 'grammar' ? text + ' · Grammar' : text;
      root.document.title = lesson.textContent;
    }
    var sub = root.document.getElementById('unit-sub');
    if (sub) sub.textContent = 'Unit ' + n + ' · ' + title;
    var practice = root.document.querySelector('.prac-header h1');
    var practicePath = String(root.location.pathname || '').replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
    if (practice && /grammar\/unit\d+-hub$/.test(practicePath)) {
      practice.textContent = 'Unit ' + n + ' · ' + title;
    }
  }

  function mountHeading() {
    if (!root.document) return;
    var body = root.document.body;
    var lesson = root.document.querySelector('.unit-header h1');
    var practice = root.document.querySelector('.prac-header h1');
    var sub = root.document.getElementById('unit-sub');
    if (!lesson && !practice && !sub) return;
    if (lesson) return;
    var place = placeFrom(body);
    whenReady(function (db) {
    db.from('site_pages_live').select('label')
      .eq('book', place.book).eq('series', place.series).eq('term', place.term).eq('level', place.level)
      .eq('unit_id', place.unit).eq('slot', 'title')
      .maybeSingle()
      .then(function (result) {
        var label = result.data && text(result.data.label);
        var fallback = bookA(place) ? BOOK_A_TITLES[place.unit] : '';
        applyHeading(place, label || fallback, body && body.getAttribute('data-track'));
      }).catch(function () {});
    });
  }

  if (root && root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mountHeading);
    else mountHeading();
  }

  return {
    doors: DOORS,
    defaults: defaults,
    imageSrc: imageSrc,
    photoRatio: photoRatio,
    resolveUnit: resolveUnit,
    groupsFor: groupsFor,
    packsFor: packsFor,
    homeCopy: homeCopy,
    slotsFor: slotsFor,
    loadCatalog: loadCatalog,
    mount: mount,
    paintHome: paintHome,
    applyHeading: applyHeading,
    placeFrom: placeFrom
  };
});
