/* Standalone file browser. Website folders come from the site catalog.
   New uploads stay in the private inbox until a photo is copied out. */
(function () {
  var SITE = 'assets/site-files.json?v=1';
  var dialog = null;
  var onKey = null;
  var preview = null;
  var uploadJob = null;
  var refreshAfterUpload = null;
  var activeSay = function () {};

  function isImage(name) {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  }

  function isPdf(name) {
    return /\.pdf$/i.test(name || '');
  }

  var pdfLoading = null;
  var thumbQueue = [];
  var thumbRunning = false;

  function loadPdfJs() {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js?v=1';
      return Promise.resolve(window.pdfjsLib);
    }
    if (pdfLoading) return pdfLoading;
    pdfLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'assets/vendor/pdf.min.js?v=1';
      script.onload = function () {
        if (!window.pdfjsLib) { reject(new Error('The PDF preview did not load.')); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js?v=1';
        resolve(window.pdfjsLib);
      };
      script.onerror = function () { reject(new Error('The PDF preview did not load.')); };
      document.head.appendChild(script);
    });
    return pdfLoading;
  }

  function fileAddress(item) {
    if (item.signed) {
      return new Promise(function (resolve) {
        item.signed(function (url) { resolve(url || ''); });
      });
    }
    return Promise.resolve(item.src || item.path || '');
  }

  function renderPdfPage(url, width) {
    return loadPdfJs().then(function (pdfjs) {
      return pdfjs.getDocument({ url: url }).promise;
    }).then(function (doc) {
      return doc.getPage(1).then(function (page) {
        var base = page.getViewport({ scale: 1 });
        var view = page.getViewport({ scale: Math.max(width, 1) / base.width });
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(view.width));
        canvas.height = Math.max(1, Math.floor(view.height));
        var ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return page.render({ canvasContext: ctx, viewport: view }).promise.then(function () {
          doc.destroy();
          return canvas;
        });
      });
    });
  }

  function enqueueThumb(task) {
    thumbQueue.push(task);
    if (thumbRunning) return;
    function next() {
      var job = thumbQueue.shift();
      if (!job) { thumbRunning = false; return; }
      thumbRunning = true;
      Promise.resolve().then(job).then(next, next);
    }
    next();
  }

  function usePdfThumb(client, item, say, pick) {
    say('Making the PDF preview…');
    fileAddress(item).then(function (url) {
      if (!url) throw new Error('The PDF preview could not be made.');
      return renderPdfPage(url, 960);
    }).then(function (canvas) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('The PDF preview could not be made.'));
        }, 'image/png');
      });
    }).then(function (blob) {
      if (!client || !client.storage) throw new Error('Sign in before using a PDF.');
      var safe = String(item.name || 'page').replace(/\.pdf$/i, '').replace(/[^\w.\-]+/g, '-').replace(/^\.+/, '');
      var path = 'library/' + Date.now() + '-' + (safe || 'page') + '.png';
      return client.storage.from('lesson-media').upload(path, blob, { contentType: 'image/png', upsert: false }).then(function (result) {
        if (result.error) throw new Error(result.error.message);
        var pub = client.storage.from('lesson-media').getPublicUrl(path);
        var made = pub && pub.data && pub.data.publicUrl;
        if (!made) throw new Error('The PDF preview was made, but the address was missing.');
        return made;
      });
    }).then(function (url) {
      close();
      pick(url);
    }).catch(function (error) {
      say(error.message || 'The PDF preview could not be made.');
    });
  }

  function saveBlob(blob, name) {
    var link = document.createElement('a');
    var objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = name || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 1500);
  }

  function downloadUrl(url, name, say) {
    say('Downloading…');
    fetch(url).then(function (response) {
      if (!response.ok) throw new Error('The file could not be downloaded.');
      return response.blob();
    }).then(function (blob) {
      saveBlob(blob, name);
      say('Download started.');
    }).catch(function () {
      var link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      say('Download opened.');
    });
  }

  function copyText(value, button) {
    var done = function () {
      var previous = button.textContent;
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = previous; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done, done);
    else done();
  }

  function closePreview() {
    if (preview) preview.remove();
    preview = null;
  }

  function showPreview(url, name) {
    closePreview();
    var root = document.createElement('div');
    root.className = 'studio-preview';
    var card = document.createElement('div');
    card.className = 'studio-preview-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', name || 'Preview');
    var bar = document.createElement('div');
    var heading = document.createElement('p');
    heading.textContent = name || 'Preview';
    var closer = document.createElement('button');
    closer.type = 'button';
    closer.textContent = 'Close';
    closer.addEventListener('click', closePreview);
    bar.appendChild(heading);
    bar.appendChild(closer);
    card.appendChild(bar);
    if (/\.pdf$/i.test(name || '')) {
      var frame = document.createElement('iframe');
      frame.src = url;
      frame.title = name || 'Preview';
      card.appendChild(frame);
    } else {
      var img = document.createElement('img');
      img.src = url;
      img.alt = name || '';
      card.appendChild(img);
    }
    root.addEventListener('click', function (event) {
      if (event.target === root) closePreview();
    });
    card.addEventListener('click', function (event) { event.stopPropagation(); });
    root.appendChild(card);
    document.body.appendChild(root);
    preview = root;
    closer.focus();
  }

  function openPreview(item) {
    function show(url) {
      if (!url) { activeSay('This file could not be previewed.'); return; }
      showPreview(url, item.name);
    }
    if (item.signed) item.signed(show);
    else show(item.src || item.path);
  }

  function close() {
    closePreview();
    refreshAfterUpload = null;
    if (onKey) document.removeEventListener('keydown', onKey);
    onKey = null;
    if (dialog) dialog.remove();
    dialog = null;
  }

  function keepPage(event) {
    if (!uploadJob) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function uploadFiles(client, list, say) {
    var files = Array.prototype.slice.call(list || []).filter(Boolean);
    if (!files.length) return;
    if (!client || !client.storage) { say('Sign in before uploading.'); return; }
    if (uploadJob) {
      uploadJob.files = uploadJob.files.concat(files);
      uploadJob.say = say || uploadJob.say;
      return;
    }
    uploadJob = { client: client, files: files, index: 0, ok: 0, say: say, left: false };
    window.addEventListener('beforeunload', keepPage);
    nextUpload();
  }

  function finishUpload(message) {
    var say = uploadJob && uploadJob.say;
    uploadJob = null;
    window.removeEventListener('beforeunload', keepPage);
    if (refreshAfterUpload) refreshAfterUpload(message);
    else if (say) say(message);
  }

  function nextUpload() {
    var job = uploadJob;
    if (!job) return;
    if (job.left) {
      finishUpload('Upload stopped because the page was left. ' + job.ok + ' of ' + job.files.length + ' finished.');
      return;
    }
    if (job.index >= job.files.length) {
      var total = job.files.length;
      var ok = job.ok;
      var message = ok === total
        ? (total === 1 ? 'Uploaded 1 file to the private inbox.' : 'Uploaded ' + total + ' files to the private inbox.')
        : ('Uploaded ' + ok + ' of ' + total + ' files to the private inbox.');
      finishUpload(message);
      return;
    }
    var file = job.files[job.index];
    job.say('Uploading ' + (job.index + 1) + ' of ' + job.files.length + ' · ' + (file.name || 'file') + '.');
    send(job.client, file, function (ok) {
      if (!uploadJob) return;
      if (uploadJob.left) { nextUpload(); return; }
      if (ok) uploadJob.ok += 1;
      else uploadJob.say('Could not upload ' + (file.name || 'file') + '.');
      uploadJob.index += 1;
      nextUpload();
    });
  }

  function open(client, hooks) {
    var say = (hooks && hooks.say) || function () {};
    activeSay = say;
    close();
    var root = document.createElement('div');
    root.className = 'studio-files';
    var card = document.createElement('div');
    card.className = 'studio-files-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'studio-files-title');
    root.addEventListener('click', function (event) {
      if (event.target === root) close();
    });
    card.addEventListener('click', function (event) { event.stopPropagation(); });

    var head = document.createElement('div');
    head.className = 'studio-files-head';
    var title = document.createElement('h2');
    title.id = 'studio-files-title';
    title.textContent = 'Library';
    var actions = document.createElement('div');
    var upload = document.createElement('button');
    upload.type = 'button';
    upload.textContent = 'Upload';
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.multiple = true;
    picker.hidden = true;
    upload.addEventListener('click', function () { picker.click(); });
    var closer = document.createElement('button');
    closer.type = 'button';
    closer.textContent = 'Close';
    closer.addEventListener('click', close);
    actions.appendChild(upload);
    actions.appendChild(picker);
    actions.appendChild(closer);
    head.appendChild(title);
    head.appendChild(actions);

    var picking = !!(hooks && hooks.onPick);
    var preferred = String((hooks && hooks.folder) || '');
    var note = document.createElement('p');
    note.className = 'studio-files-note';
    note.textContent = picking
      ? 'Choose a photo. Drop a new one here if it is not in the library yet.'
      : 'Website folders are the photos already on the site. Drop new files here to put them in the private inbox.';

    var body = document.createElement('div');
    body.className = 'studio-files-body';
    var nav = document.createElement('nav');
    nav.className = 'studio-files-folders';
    nav.setAttribute('aria-label', 'Folders');
    var main = document.createElement('div');
    main.className = 'studio-files-main';
    body.appendChild(nav);
    body.appendChild(main);
    card.appendChild(head);
    card.appendChild(note);
    card.appendChild(body);
    root.appendChild(card);
    document.body.appendChild(root);
    dialog = root;
    onKey = function (event) {
      if (event.key !== 'Escape') return;
      if (preview) { closePreview(); return; }
      close();
    };
    document.addEventListener('keydown', onKey);
    closer.focus();

    var siteFolders = [];
    var BOOKS = {
      oxford: { label: 'Oxford', series: { oxford: 'Living Oxford English' } },
      longman: { label: 'Longman', series: { 'mypearson-express': 'Primary Longman Express', elect: 'Primary Longman Elect' } }
    };
    var TERMS = [{ id: 'first', label: 'Book A' }, { id: 'second', label: 'Book B' }];
    var LEVELS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    var UNITS = ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'];
    var FILE_GROUPS = [
      { id: 'covers', label: 'Covers' },
      { id: 'practice', label: 'Practice' },
      { id: 'game', label: 'Game' },
      { id: 'assets', label: 'Assets' }
    ];
    var here = hooks.place || {};
    var unit = /^unit[1-6]$/.test(here.unit || '') ? here.unit : (/^unit[1-6]$/.test(preferred) ? preferred : '');
    var view = {
      kind: 'site',
      area: 'lessons',
      lesson: {
        book: here.book === 'longman' ? 'longman' : 'oxford',
        series: here.series || (here.book === 'longman' ? 'mypearson-express' : 'oxford'),
        term: here.term === 'second' ? 'second' : 'first',
        level: /^p[1-6]$/.test(here.level || '') ? here.level : 'p6',
        unit: unit
      },
      folder: '',
      bucket: '',
      parts: []
    };
    var chosen = false;
    var pinned = '';
    function status(text) {
      if (uploadJob || pinned) return;
      say(text);
    }

    function groupOf(name) {
      if (name === 'covers' || name.slice(-7) === '/covers') return 'covers';
      if (name.indexOf('practice/') === 0) return 'practice';
      if (name.indexOf('game/') === 0) return 'game';
      if (name === 'assets' || name.indexOf('assets/') === 0) return 'assets';
      return '';
    }

    function childLabel(name, group) {
      if (group === 'practice') return name.replace(/^practice\//, '');
      if (group === 'game') return name.replace(/^game\//, '');
      if (group === 'assets' && name !== 'assets') return name.replace(/^assets\//, '');
      return name;
    }

    function foldersIn(group) {
      return siteFolders.filter(function (folder) { return groupOf(folder.name) === group; });
    }

    function blankView() {
      return { kind: 'site', area: 'lessons', lesson: null, folder: '', bucket: '', parts: [] };
    }

    function chooseLesson(lesson) {
      chosen = true;
      view = blankView();
      view.area = 'lessons';
      view.lesson = lesson;
      paint();
    }

    function goBack() {
      if (view.kind === 'store') {
        if (!view.parts.length) return;
        view.parts = view.parts.slice(0, -1);
        paint();
        return;
      }
      if (view.area === 'lessons' && view.lesson) {
        var lesson = view.lesson;
        if (lesson.unit) { lesson.unit = ''; paint(); return; }
        if (lesson.level) { lesson.level = ''; paint(); return; }
        if (lesson.term) { lesson.term = ''; paint(); return; }
        if (lesson.series) { lesson.series = ''; paint(); return; }
        if (lesson.book) { lesson.book = ''; paint(); }
        return;
      }
      if (view.folder) { view.folder = ''; paint(); }
    }

    function navButton(label, on, pick, depth) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-files-nav' + (on ? ' is-on' : '');
      button.textContent = label;
      button.style.marginLeft = ((depth || 0) * 0.7) + 'rem';
      button.style.width = 'calc(100% - ' + ((depth || 0) * 0.7) + 'rem)';
      button.addEventListener('click', pick);
      return button;
    }

    function paintNav() {
      nav.replaceChildren();
      var lessonLabel = document.createElement('p');
      lessonLabel.className = 'studio-files-group';
      lessonLabel.textContent = 'Lessons';
      nav.appendChild(lessonLabel);
      Object.keys(BOOKS).forEach(function (bookId) {
        var book = BOOKS[bookId];
        var openBook = view.area === 'lessons' && view.lesson && view.lesson.book === bookId;
        nav.appendChild(navButton(book.label, openBook && !view.lesson.series, function () {
          chooseLesson({ book: bookId });
        }, 0));
        if (!openBook) return;
        Object.keys(book.series).forEach(function (seriesId) {
          var openSeries = view.lesson.series === seriesId;
          nav.appendChild(navButton(book.series[seriesId], openSeries && !view.lesson.term, function () {
            chooseLesson({ book: bookId, series: seriesId });
          }, 1));
          if (!openSeries) return;
          TERMS.forEach(function (term) {
            var openTerm = view.lesson.term === term.id;
            nav.appendChild(navButton(term.label, openTerm && !view.lesson.level, function () {
              chooseLesson({ book: bookId, series: seriesId, term: term.id });
            }, 2));
            if (!openTerm) return;
            LEVELS.forEach(function (levelId) {
              var openLevel = view.lesson.level === levelId;
              nav.appendChild(navButton(levelId.toUpperCase(), openLevel && !view.lesson.unit, function () {
                chooseLesson({ book: bookId, series: seriesId, term: term.id, level: levelId });
              }, 3));
              if (!openLevel) return;
              UNITS.forEach(function (unitId) {
                nav.appendChild(navButton('Unit ' + unitId.replace('unit', ''), view.lesson.unit === unitId, function () {
                  chooseLesson({ book: bookId, series: seriesId, term: term.id, level: levelId, unit: unitId });
                }, 4));
              });
            });
          });
        });
      });
      FILE_GROUPS.forEach(function (group) {
        var open = view.area === group.id;
        nav.appendChild(navButton(group.label, open && !view.folder, function () {
          chosen = true;
          view = { kind: 'site', area: group.id, lesson: null, folder: '', bucket: '', parts: [] };
          paint();
        }, 0));
        if (!open) return;
        foldersIn(group.id).forEach(function (folder) {
          nav.appendChild(navButton(childLabel(folder.name, group.id), view.folder === folder.name, function () {
            chosen = true;
            view.folder = folder.name;
            view.kind = 'site';
            paint();
          }, 1));
        });
      });
      var storeLabel = document.createElement('p');
      storeLabel.className = 'studio-files-group';
      storeLabel.textContent = 'Storage';
      nav.appendChild(storeLabel);
      nav.appendChild(navButton('Public uploads', view.kind === 'store' && view.bucket === 'lesson-media', function () {
        chosen = true;
        view = { kind: 'store', area: 'store', lesson: null, folder: '', bucket: 'lesson-media', parts: [] };
        paint();
      }, 0));
      nav.appendChild(navButton('Private inbox', view.kind === 'store' && view.bucket === 'lesson-inbox', function () {
        chosen = true;
        view = { kind: 'store', area: 'store', lesson: null, folder: '', bucket: 'lesson-inbox', parts: [] };
        paint();
      }, 0));
      var current = nav.querySelector('.is-on');
      if (current && current.scrollIntoView) current.scrollIntoView({ block: 'nearest' });
    }

    function watchPreview(node, item) {
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      function open(event) {
        event.preventDefault();
        openPreview(item);
      }
      node.addEventListener('click', open);
      node.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        open(event);
      });
    }

    function fileBox(item) {
      var box = document.createElement('article');
      box.className = 'studio-files-item';
      var previewable = isImage(item.name) || isPdf(item.name);
      if (isPdf(item.name)) {
        var pdfImg = document.createElement('img');
        pdfImg.alt = '';
        box.appendChild(pdfImg);
        watchPreview(pdfImg, item);
        enqueueThumb(function () {
          if (!pdfImg.isConnected) return;
          return fileAddress(item).then(function (url) {
            if (!url || !pdfImg.isConnected) return;
            return renderPdfPage(url, 360).then(function (canvas) {
              if (pdfImg.isConnected) pdfImg.src = canvas.toDataURL('image/jpeg', 0.82);
            });
          }).catch(function () {});
        });
      }
      if (isImage(item.name)) {
        var img = document.createElement('img');
        img.alt = '';
        if (item.src) img.src = item.src;
        else if (item.signed) item.signed(function (url) { if (url) img.src = url; });
        box.appendChild(img);
        watchPreview(img, item);
      }
      var name = document.createElement('p');
      name.textContent = item.name;
      if (previewable) {
        name.className = 'is-preview';
        watchPreview(name, item);
      }
      box.appendChild(name);
      var copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copy path';
      copy.addEventListener('click', function () { copyText(item.path, copy); });
      box.appendChild(copy);
      var download = document.createElement('button');
      download.type = 'button';
      download.textContent = 'Download';
      download.addEventListener('click', function () {
        if (item.signed) {
          item.signed(function (url) {
            if (!url) { say('The file could not be downloaded.'); return; }
            downloadUrl(url, item.name, say);
          });
          return;
        }
        downloadUrl(item.href || item.src || item.path, item.name, say);
      });
      box.appendChild(download);
      if (picking && (isImage(item.name) || isPdf(item.name))) {
        var use = document.createElement('button');
        use.type = 'button';
        use.textContent = 'Use this photo';
        use.addEventListener('click', function () {
          if (isPdf(item.name)) {
            usePdfThumb(client, item, say, hooks.onPick);
            return;
          }
          if (item.privateImage) {
            copyPublic(client, item.storagePath, item.name, say, function (url) {
              if (!url) return;
              var pick = hooks.onPick;
              close();
              pick(url);
            });
            return;
          }
          var chosen = item.path;
          var pick = hooks.onPick;
          close();
          pick(chosen);
        });
        box.appendChild(use);
      } else if (item.privateImage) {
        var publish = document.createElement('button');
        publish.type = 'button';
        publish.textContent = 'Copy to public library';
        publish.addEventListener('click', function () { copyPublic(client, item.storagePath || item.path, item.name, say); });
        box.appendChild(publish);
      }
      if (item.bucket && item.storagePath) {
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.addEventListener('click', function () {
          if (!window.confirm('Remove ' + item.name + '?')) return;
          say('Removing…');
          client.storage.from(item.bucket).remove([item.storagePath]).then(function (result) {
            if (result.error) { say(result.error.message); return; }
            say('Removed ' + item.name + '.');
            paint();
          });
        });
        box.appendChild(remove);
      }
      return box;
    }

    function crumbBar(steps, showBack) {
      var bar = document.createElement('p');
      bar.className = 'studio-files-crumbs';
      if (showBack) {
        var back = document.createElement('button');
        back.type = 'button';
        back.className = 'studio-files-back';
        back.textContent = 'Back';
        back.addEventListener('click', goBack);
        bar.appendChild(back);
      }
      steps.forEach(function (step, index) {
        if (index || showBack) bar.appendChild(document.createTextNode(' / '));
        if (!step.go) {
          bar.appendChild(document.createTextNode(step.label));
          return;
        }
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = step.label;
        button.addEventListener('click', step.go);
        bar.appendChild(button);
      });
      return bar;
    }

    function lessonSteps(lesson) {
      var steps = [];
      if (!lesson || !lesson.book || !BOOKS[lesson.book]) return steps;
      var book = BOOKS[lesson.book];
      steps.push({ label: book.label, go: function () { chooseLesson({ book: lesson.book }); } });
      if (!lesson.series || !book.series[lesson.series]) return steps;
      steps.push({ label: book.series[lesson.series], go: function () { chooseLesson({ book: lesson.book, series: lesson.series }); } });
      if (!lesson.term) return steps;
      var term = TERMS.filter(function (item) { return item.id === lesson.term; })[0];
      steps.push({ label: term ? term.label : lesson.term, go: function () { chooseLesson({ book: lesson.book, series: lesson.series, term: lesson.term }); } });
      if (!lesson.level) return steps;
      steps.push({ label: lesson.level.toUpperCase(), go: function () { chooseLesson({ book: lesson.book, series: lesson.series, term: lesson.term, level: lesson.level }); } });
      if (!lesson.unit) return steps;
      steps.push({ label: 'Unit ' + lesson.unit.replace('unit', '') });
      steps[steps.length - 2].go = function () {
        chooseLesson({ book: lesson.book, series: lesson.series, term: lesson.term, level: lesson.level });
      };
      return steps;
    }

    function lessonFiles(lesson) {
      if (!lesson || lesson.book !== 'oxford' || lesson.series !== 'oxford' || lesson.term !== 'first' || lesson.level !== 'p6' || !lesson.unit) return null;
      var found = null;
      siteFolders.forEach(function (folder) {
        if (folder.name === lesson.unit) found = folder;
      });
      return found;
    }

    function choiceGrid(items) {
      var grid = document.createElement('div');
      grid.className = 'studio-files-grid';
      items.forEach(function (item) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'studio-files-folder';
        button.textContent = item.label;
        button.addEventListener('click', item.go);
        grid.appendChild(button);
      });
      return grid;
    }

    function paintFiles(folder) {
      var grid = document.createElement('div');
      grid.className = 'studio-files-grid';
      folder.files.forEach(function (file) {
        grid.appendChild(fileBox({ name: file.name, path: file.path, src: file.path }));
      });
      main.appendChild(grid);
      status(folder.files.length + (folder.files.length === 1 ? ' file in ' : ' files in ') + folder.name + '.');
    }

    function paintSite() {
      paintNav();
      main.replaceChildren();
      if (view.area === 'lessons') {
        var lesson = view.lesson || {};
        var steps = lessonSteps(lesson);
        main.appendChild(crumbBar(steps, !!(lesson.book || lesson.series || lesson.term || lesson.level || lesson.unit)));
        if (lesson.unit) {
          var folder = lessonFiles(lesson);
          if (!folder) {
            var empty = document.createElement('p');
            empty.textContent = 'This folder is empty.';
            main.appendChild(empty);
            status('This folder is empty.');
            return;
          }
          paintFiles(folder);
          return;
        }
        var book = BOOKS[lesson.book];
        var items = [];
        if (!lesson.book) {
          Object.keys(BOOKS).forEach(function (bookId) {
            items.push({ label: BOOKS[bookId].label, go: function () { chooseLesson({ book: bookId }); } });
          });
        } else if (!lesson.series) {
          Object.keys(book.series).forEach(function (seriesId) {
            items.push({ label: book.series[seriesId], go: function () { chooseLesson({ book: lesson.book, series: seriesId }); } });
          });
        } else if (!lesson.term) {
          TERMS.forEach(function (term) {
            items.push({ label: term.label, go: function () { chooseLesson({ book: lesson.book, series: lesson.series, term: term.id }); } });
          });
        } else if (!lesson.level) {
          LEVELS.forEach(function (levelId) {
            items.push({ label: levelId.toUpperCase(), go: function () { chooseLesson({ book: lesson.book, series: lesson.series, term: lesson.term, level: levelId }); } });
          });
        } else {
          UNITS.forEach(function (unitId) {
            items.push({ label: 'Unit ' + unitId.replace('unit', ''), go: function () { chooseLesson({ book: lesson.book, series: lesson.series, term: lesson.term, level: lesson.level, unit: unitId }); } });
          });
        }
        main.appendChild(choiceGrid(items));
        status(items.length + (items.length === 1 ? ' folder.' : ' folders.'));
        return;
      }
      var group = FILE_GROUPS.filter(function (item) { return item.id === view.area; })[0];
      var groupSteps = [{ label: group ? group.label : 'Files', go: view.folder ? function () { view.folder = ''; paint(); } : null }];
      if (view.folder) groupSteps.push({ label: childLabel(view.folder, view.area) });
      main.appendChild(crumbBar(groupSteps, !!view.folder));
      if (!view.folder) {
        var folders = foldersIn(view.area).map(function (folder) {
          return { label: childLabel(folder.name, view.area), go: function () { view.folder = folder.name; paint(); } };
        });
        if (!folders.length) {
          var none = document.createElement('p');
          none.textContent = 'This folder is empty.';
          main.appendChild(none);
          status('This folder is empty.');
          return;
        }
        main.appendChild(choiceGrid(folders));
        status(folders.length + (folders.length === 1 ? ' folder.' : ' folders.'));
        return;
      }
      var picked = null;
      siteFolders.forEach(function (folder) { if (folder.name === view.folder) picked = folder; });
      if (!picked) {
        main.appendChild(document.createTextNode(''));
        status('This folder is empty.');
        return;
      }
      paintFiles(picked);
    }

    function paintStore() {
      paintNav();
      main.replaceChildren();
      var crumbs = document.createElement('p');
      crumbs.className = 'studio-files-crumbs';
      var rootName = view.bucket === 'lesson-inbox' ? 'Private inbox' : 'Public uploads';
      var back = document.createElement('button');
      back.type = 'button';
      back.textContent = rootName;
      back.addEventListener('click', function () {
        view.parts = [];
        paint();
      });
      crumbs.appendChild(back);
      view.parts.forEach(function (part, index) {
        crumbs.appendChild(document.createTextNode(' / '));
        var jump = document.createElement('button');
        jump.type = 'button';
        jump.textContent = part;
        jump.addEventListener('click', function () {
          view.parts = view.parts.slice(0, index + 1);
          paint();
        });
        crumbs.appendChild(jump);
      });
      if (view.parts.length) {
        var back = document.createElement('button');
        back.type = 'button';
        back.className = 'studio-files-back';
        back.textContent = 'Back';
        back.addEventListener('click', goBack);
        crumbs.insertBefore(back, crumbs.firstChild);
      }
      main.appendChild(crumbs);
      if (!client || !client.storage) {
        status('Sign in to open stored files.');
        return;
      }
      var bucket = view.bucket;
      var prefix = view.parts.join('/');
      var keep = pinned;
      if (keep) say(keep);
      else status('Loading files…');
      client.storage.from(bucket).list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
        .then(function (result) {
          if (!dialog || view.kind !== 'store' || view.bucket !== bucket || view.parts.join('/') !== prefix) return;
          if (result.error) { say(result.error.message); return; }
          var items = result.data || [];
          var grid = document.createElement('div');
          grid.className = 'studio-files-grid';
          items.forEach(function (item) {
            var path = prefix ? prefix + '/' + item.name : item.name;
            if (!item.id) {
              var folder = document.createElement('button');
              folder.type = 'button';
              folder.className = 'studio-files-folder';
              folder.textContent = item.name;
              folder.addEventListener('click', function () {
                view.parts = view.parts.concat(item.name);
                paint();
              });
              grid.appendChild(folder);
              return;
            }
            var src = '';
            var publicUrl = '';
            if (view.bucket === 'lesson-media') {
              var pub = client.storage.from(view.bucket).getPublicUrl(path);
              publicUrl = pub && pub.data && pub.data.publicUrl || '';
              if (isImage(item.name)) src = publicUrl;
            }
            var privateFile = view.bucket === 'lesson-inbox';
            var box = fileBox({
              name: item.name,
              path: view.bucket === 'lesson-media' ? (publicUrl || path) : path,
              src: src,
              bucket: view.bucket,
              storagePath: path,
              privateImage: privateFile && isImage(item.name),
              signed: privateFile ? function (done) {
                client.storage.from(bucket).createSignedUrl(path, 120).then(function (signed) {
                  done(signed.data && signed.data.signedUrl);
                });
              } : null
            });
            grid.appendChild(box);
          });
          if (!items.length) {
            var empty = document.createElement('p');
            empty.textContent = 'This folder is empty.';
            main.appendChild(empty);
            if (keep) say(keep);
            else status('This folder is empty.');
            return;
          }
          main.appendChild(grid);
          if (keep) say(keep);
          else status(items.length + (items.length === 1 ? ' item here.' : ' items here.'));
        });
    }

    function paint() {
      if (view.kind === 'store') paintStore();
      else paintSite();
    }

    refreshAfterUpload = function (message) {
      pinned = message || '';
      if (!dialog) {
        if (pinned) say(pinned);
        pinned = '';
        return;
      }
      view = { kind: 'store', area: 'store', lesson: null, folder: '', bucket: 'lesson-inbox', parts: ['inbox'] };
      paint();
      pinned = '';
    };

    picker.addEventListener('change', function () {
      var files = picker.files;
      picker.value = '';
      uploadFiles(client, files, say);
    });

    var dragDepth = 0;
    root.addEventListener('dragenter', function (event) {
      event.preventDefault();
      dragDepth += 1;
      root.classList.add('is-dropping');
    });
    root.addEventListener('dragover', function (event) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    root.addEventListener('dragleave', function () {
      dragDepth -= 1;
      if (dragDepth <= 0) {
        dragDepth = 0;
        root.classList.remove('is-dropping');
      }
    });
    root.addEventListener('drop', function (event) {
      event.preventDefault();
      dragDepth = 0;
      root.classList.remove('is-dropping');
      var files = event.dataTransfer && event.dataTransfer.files;
      uploadFiles(client, files, say);
    });

    fetch(SITE).then(function (response) {
      if (!response.ok) throw new Error('The website file list did not load.');
      return response.json();
    }).then(function (catalog) {
      siteFolders = (catalog && catalog.folders) || [];
      if (!siteFolders.length) say('No website files were found.');
      paint();
    }).catch(function (error) {
      say(error.message || 'The website file list did not load.');
      paintNav();
    });
  }

  var uploadSerial = 0;

  function send(client, file, done) {
    if (!client || !client.storage) { if (done) done(false); return; }
    var safe = String(file.name || 'file').replace(/[^\w.\-]+/g, '-').replace(/^\.+/, '');
    uploadSerial += 1;
    var path = 'inbox/' + Date.now() + '-' + uploadSerial + '-' + (safe || 'file');
    client.storage.from('lesson-inbox').upload(path, file, { upsert: false }).then(function (result) {
      if (uploadJob && document.visibilityState === 'hidden') uploadJob.left = true;
      if (done) done(!(result && result.error));
    }).catch(function () {
      if (uploadJob && document.visibilityState === 'hidden') uploadJob.left = true;
      if (done) done(false);
    });
  }

  function copyPublic(client, path, name, say, done) {
    if (!client || !client.storage) { say('Sign in before copying a file.'); return; }
    say('Copying to the public library…');
    client.storage.from('lesson-inbox').download(path).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var dest = 'library/' + Date.now() + '-' + name;
      client.storage.from('lesson-media').upload(dest, result.data, { upsert: false }).then(function (uploaded) {
        if (uploaded.error) { say(uploaded.error.message); return; }
        var pub = client.storage.from('lesson-media').getPublicUrl(dest);
        var url = pub && pub.data && pub.data.publicUrl;
        if (!url) { say('Copied to the public library, but the address was missing.'); return; }
        say('Public copy: ' + url);
        if (done) done(url);
      });
    });
  }

  window.RevisionStudioLibrary = { open: open, close: close };
})();
