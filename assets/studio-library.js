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
  var uploadFolder = function () { return 'inbox'; };
  var draggingFile = null;
  var movingFile = null;

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
    uploadFolder = function () { return 'inbox'; };
    draggingFile = null;
    movingFile = null;
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

  function unitPrefix(lesson) {
    if (!lesson) return '';
    var book = lesson.book === 'longman' ? 'longman' : (lesson.book === 'oxford' ? 'oxford' : '');
    if (!book) return '';
    var seriesOk = book === 'oxford'
      ? lesson.series === 'oxford'
      : (lesson.series === 'mypearson-express' || lesson.series === 'elect');
    if (!seriesOk) return '';
    if (lesson.term !== 'first' && lesson.term !== 'second') return '';
    if (!/^p[1-6]$/.test(lesson.level || '')) return '';
    if (!/^unit[1-6]$/.test(lesson.unit || '')) return '';
    return 'units/' + book + '/' + lesson.series + '/' + lesson.term + '/' + lesson.level + '/' + lesson.unit;
  }

  function lessonFromFolder(folder) {
    var parts = String(folder || '').split('/');
    if (parts[0] !== 'units' || parts.length !== 6) return null;
    var lesson = { book: parts[1], series: parts[2], term: parts[3], level: parts[4], unit: parts[5] };
    if (unitPrefix(lesson) !== parts.join('/')) return null;
    return lesson;
  }

  function landed(folder) {
    if (folder == null) return 'the private inbox';
    var parts = String(folder).split('/').filter(Boolean);
    if (parts[0] === 'units' && /^unit[1-6]$/.test(parts[5] || '')) return 'Unit ' + parts[5].replace('unit', '');
    if (!parts.length) return 'the private inbox';
    return parts[parts.length - 1];
  }

  function jobFolder(job) {
    if (!job || !job.items || !job.items.length) return 'inbox';
    var folder = job.items[0].folder;
    for (var i = 1; i < job.items.length; i++) {
      if (job.items[i].folder !== folder) return null;
    }
    return folder;
  }

  function uploadFiles(client, list, say, folder) {
    var files = Array.prototype.slice.call(list || []).filter(Boolean);
    if (!files.length) return;
    if (!client || !client.storage) { say('Sign in before uploading.'); return; }
    var dest = folder == null ? uploadFolder() : folder;
    var items = files.map(function (file) { return { file: file, folder: dest }; });
    if (uploadJob) {
      uploadJob.items = uploadJob.items.concat(items);
      uploadJob.say = say || uploadJob.say;
      return;
    }
    uploadJob = { client: client, items: items, index: 0, ok: 0, say: say, left: false };
    window.addEventListener('beforeunload', keepPage);
    nextUpload();
  }

  function finishUpload(message) {
    var job = uploadJob;
    var say = job && job.say;
    var shown = job ? jobFolder(job) : 'inbox';
    var openFolder = shown == null && job && job.items.length ? job.items[job.items.length - 1].folder : shown;
    uploadJob = null;
    window.removeEventListener('beforeunload', keepPage);
    if (refreshAfterUpload) refreshAfterUpload(message, openFolder == null ? 'inbox' : openFolder);
    else if (say) say(message);
  }

  function nextUpload() {
    var job = uploadJob;
    if (!job) return;
    if (job.left) {
      finishUpload('Upload stopped because the page was left. ' + job.ok + ' of ' + job.items.length + ' finished.');
      return;
    }
    if (job.index >= job.items.length) {
      var total = job.items.length;
      var ok = job.ok;
      var place = landed(jobFolder(job));
      var message = ok === total
        ? (total === 1 ? 'Uploaded 1 file to ' + place + '.' : 'Uploaded ' + total + ' files to ' + place + '.')
        : ('Uploaded ' + ok + ' of ' + total + ' files to ' + place + '.');
      finishUpload(message);
      return;
    }
    var item = job.items[job.index];
    var file = item.file;
    job.say('Uploading ' + (job.index + 1) + ' of ' + job.items.length + ' · ' + (file.name || 'file') + '.');
    send(job.client, file, item.folder, function (ok) {
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
    picker.className = 'studio-files-picker';
    picker.tabIndex = -1;
    picker.setAttribute('aria-hidden', 'true');
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
      ? 'Choose a photo. Drop a new one here and it goes to the private inbox, off the live site.'
      : 'Website folders are the photos already on the site. Drop new files here to put them in the private inbox. They stay off the live site.';

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
    var dragDepth = 0;
    uploadFolder = function () {
      if (view.kind === 'store' && view.bucket === 'lesson-inbox') return view.parts.join('/');
      if (view.area === 'lessons' && view.lesson && view.lesson.unit) return unitPrefix(view.lesson) || 'inbox';
      return 'inbox';
    };
    function status(text) {
      if (uploadJob || pinned) return;
      say(text);
    }

    function paintNote() {
      if (movingFile) {
        note.textContent = 'Moving ' + movingFile.name + '. Open Private inbox or Public uploads, then press Move here. Or drop the file on a folder.';
        return;
      }
      if (view.kind === 'store' && view.bucket === 'lesson-inbox') {
        note.textContent = 'Drop files here to add them to this folder. They stay off the live site. Drag a stored file onto a folder to move it.';
        return;
      }
      if (view.area === 'lessons' && view.lesson && view.lesson.unit) {
        note.textContent = 'Drop files here to add them to this unit. They stay off the live site until you publish.';
        return;
      }
      note.textContent = picking
        ? 'Choose a photo. Drop a new one here and it goes to the private inbox, off the live site.'
        : 'Website folders are the photos already on the site. Drop new files here to put them in the private inbox. They stay off the live site.';
    }

    function clearMoveOver() {
      var overs = root.querySelectorAll('.is-move-over');
      Array.prototype.forEach.call(overs, function (node) { node.classList.remove('is-move-over'); });
    }

    function keepInUnit(item, done) {
      var prefix = unitPrefix(hooks && hooks.place);
      if (!prefix || !item || !item.storagePath || !item.bucket || !client || !client.storage) {
        done();
        return;
      }
      var dest = prefix + '/' + item.name;
      if (item.bucket === 'lesson-inbox' && (item.storagePath === dest || item.storagePath.indexOf(prefix + '/') === 0)) {
        done();
        return;
      }
      say('Adding it to this unit…');
      var options = item.bucket === 'lesson-inbox' ? undefined : { destinationBucket: 'lesson-inbox' };
      client.storage.from(item.bucket).copy(item.storagePath, dest, options).then(function (result) {
        if (!result || !result.error) {
          done();
          return;
        }
        return client.storage.from(item.bucket).download(item.storagePath).then(function (downloaded) {
          if (downloaded.error || !downloaded.data) {
            done();
            return;
          }
          return client.storage.from('lesson-inbox').upload(dest, downloaded.data, { upsert: false }).then(function () {
            done();
          });
        });
      }).catch(function () {
        done();
      });
    }

    function placeFile(item, bucket, prefix) {
      if (!item || !client || !client.storage) { say('Sign in before moving a file.'); return; }
      var destPrefix = String(prefix || '').replace(/^\/+|\/+$/g, '');
      var destPath = destPrefix ? destPrefix + '/' + item.name : item.name;
      if (item.bucket === bucket && item.path === destPath) {
        say(item.name + ' is already in this folder.');
        return;
      }
      if (bucket === 'lesson-media' && item.bucket !== 'lesson-media') {
        if (!window.confirm('Move ' + item.name + ' to public uploads? Anyone with the link can open it. It stays off the lesson pages until you use it there.')) return;
      } else if (item.bucket === 'lesson-media') {
        if (!window.confirm('Move ' + item.name + '? A lesson that already uses this public file will lose the picture.')) return;
      }
      say('Moving ' + item.name + '…');
      client.storage.from(bucket).list(destPrefix, { limit: 100, search: item.name }).then(function (listed) {
        if (!dialog) {
          return;
        }
        if (listed.error) { say(listed.error.message); return; }
        var taken = (listed.data || []).some(function (row) { return row.name === item.name && row.id; });
        if (taken) { say('A file named ' + item.name + ' is already in that folder.'); return; }
        var options = bucket === item.bucket ? undefined : { destinationBucket: bucket };
        return client.storage.from(item.bucket).move(item.path, destPath, options).then(function (result) {
          if ((!result || result.error) && bucket !== item.bucket) {
            return client.storage.from(item.bucket).download(item.path).then(function (downloaded) {
              if (downloaded.error || !downloaded.data) return result || { error: { message: 'The file could not be moved.' } };
              return client.storage.from(bucket).upload(destPath, downloaded.data, { upsert: false }).then(function (uploaded) {
                if (uploaded.error) return uploaded;
                return client.storage.from(item.bucket).remove([item.path]).then(function (removed) {
                  if (removed.error) return { error: { message: 'The copy was made, but the original is still there.' } };
                  return { error: null };
                });
              });
            });
          }
          return result || { error: { message: 'The file could not be moved.' } };
        }).then(function (result) {
          if (!dialog) {
            return;
          }
          if (!result || result.error) { say((result && result.error && result.error.message) || 'The file could not be moved.'); return; }
          if (movingFile && movingFile.bucket === item.bucket && movingFile.path === item.path) movingFile = null;
          chosen = true;
          view = { kind: 'store', area: 'store', lesson: null, folder: '', bucket: bucket, parts: destPrefix ? destPrefix.split('/').filter(Boolean) : [] };
          pinned = 'Moved ' + item.name + '.';
          paint();
          pinned = '';
        });
      }).catch(function () {
        say('The file could not be moved.');
      });
    }

    function watchFolder(node, bucket, prefix, allowUpload) {
      node.addEventListener('dragover', function (event) {
        var incoming = !draggingFile;
        if (incoming && !allowUpload) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = incoming ? 'copy' : 'move';
        node.classList.add('is-move-over');
      });
      node.addEventListener('dragleave', function (event) {
        if (event.target !== node) return;
        node.classList.remove('is-move-over');
      });
      node.addEventListener('drop', function (event) {
        var incoming = !draggingFile;
        if (incoming && !allowUpload) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth = 0;
        root.classList.remove('is-dropping');
        node.classList.remove('is-move-over');
        if (incoming) {
          uploadFiles(client, event.dataTransfer && event.dataTransfer.files, say, prefix);
          return;
        }
        var item = draggingFile;
        draggingFile = null;
        placeFile(item, bucket, prefix);
      });
    }

    function moveBar() {
      if (!movingFile) return null;
      var bar = document.createElement('div');
      bar.className = 'studio-files-move';
      var label = document.createElement('p');
      label.textContent = 'Moving ' + movingFile.name + '.';
      bar.appendChild(label);
      if (view.kind === 'store') {
        var here = document.createElement('button');
        here.type = 'button';
        here.textContent = 'Move here';
        here.addEventListener('click', function () {
          placeFile(movingFile, view.bucket, view.parts.join('/'));
        });
        bar.appendChild(here);
      }
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', function () {
        movingFile = null;
        paint();
      });
      bar.appendChild(cancel);
      return bar;
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
                var unitLesson = { book: bookId, series: seriesId, term: term.id, level: levelId, unit: unitId };
                var unitButton = navButton('Unit ' + unitId.replace('unit', ''), view.lesson.unit === unitId, function () {
                  chooseLesson(unitLesson);
                }, 4);
                var prefix = unitPrefix(unitLesson);
                if (prefix) watchFolder(unitButton, 'lesson-inbox', prefix, true);
                nav.appendChild(unitButton);
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
      var publicNav = navButton('Public uploads', view.kind === 'store' && view.bucket === 'lesson-media', function () {
        chosen = true;
        view = { kind: 'store', area: 'store', lesson: null, folder: '', bucket: 'lesson-media', parts: [] };
        paint();
      }, 0);
      watchFolder(publicNav, 'lesson-media', '', false);
      nav.appendChild(publicNav);
      var privateNav = navButton('Private inbox', view.kind === 'store' && view.bucket === 'lesson-inbox', function () {
        chosen = true;
        view = { kind: 'store', area: 'store', lesson: null, folder: '', bucket: 'lesson-inbox', parts: [] };
        paint();
      }, 0);
      watchFolder(privateNav, 'lesson-inbox', '', true);
      nav.appendChild(privateNav);
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
        pdfImg.draggable = false;
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
        img.draggable = false;
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
          keepInUnit(item, function () {
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
        box.draggable = true;
        box.addEventListener('dragstart', function (event) {
          var target = event.target;
          if (target && target.closest && target.closest('button')) {
            event.preventDefault();
            return;
          }
          draggingFile = { bucket: item.bucket, path: item.storagePath, name: item.name };
          if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', item.name);
            event.dataTransfer.effectAllowed = 'move';
          }
          root.classList.remove('is-dropping');
        });
        box.addEventListener('dragend', function () {
          setTimeout(function () {
            draggingFile = null;
            if (root) root.classList.remove('is-dropping');
            clearMoveOver();
          }, 0);
        });
        var move = document.createElement('button');
        move.type = 'button';
        move.textContent = 'Move';
        move.addEventListener('click', function () {
          movingFile = { bucket: item.bucket, path: item.storagePath, name: item.name };
          paint();
        });
        box.appendChild(move);
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
        if (item.drop) watchFolder(button, 'lesson-inbox', item.drop, true);
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

    function paintUnit(lesson) {
      var stamp = {};
      view.unitStamp = stamp;
      var folder = lessonFiles(lesson);
      var prefix = unitPrefix(lesson);
      var grid = document.createElement('div');
      grid.className = 'studio-files-grid';
      var count = 0;
      if (folder && folder.files) {
        folder.files.forEach(function (file) {
          grid.appendChild(fileBox({ name: file.name, path: file.path, src: file.path }));
          count += 1;
        });
      }
      if (count) main.appendChild(grid);
      var keep = pinned;
      function report() {
        if (!count) {
          var empty = document.createElement('p');
          empty.textContent = 'This folder is empty.';
          main.appendChild(empty);
          if (keep) say(keep);
          else status('This folder is empty.');
          return;
        }
        if (!grid.parentNode) main.appendChild(grid);
        if (keep) say(keep);
        else status(count + (count === 1 ? ' file in this unit.' : ' files in this unit.'));
      }
      if (!prefix || !client || !client.storage) {
        report();
        return;
      }
      if (keep) say(keep);
      else status('Loading files…');
      client.storage.from('lesson-inbox').list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } }).then(function (result) {
        if (view.unitStamp !== stamp || !dialog || view.area !== 'lessons' || !view.lesson || unitPrefix(view.lesson) !== prefix) {
          return;
        }
        if (result.error) { say(result.error.message); return; }
        (result.data || []).forEach(function (item) {
          if (!item.id) return;
          var path = prefix + '/' + item.name;
          grid.appendChild(fileBox({
            name: item.name,
            path: path,
            bucket: 'lesson-inbox',
            storagePath: path,
            privateImage: isImage(item.name),
            signed: function (done) {
              client.storage.from('lesson-inbox').createSignedUrl(path, 120).then(function (signed) {
                done(signed.data && signed.data.signedUrl);
              });
            }
          }));
          count += 1;
        });
        report();
      }).catch(function () {
        if (view.unitStamp !== stamp) return;
        report();
      });
    }

    function paintSite() {
      paintNav();
      main.replaceChildren();
      var moving = moveBar();
      if (moving) main.appendChild(moving);
      if (view.area === 'lessons') {
        var lesson = view.lesson || {};
        var steps = lessonSteps(lesson);
        main.appendChild(crumbBar(steps, !!(lesson.book || lesson.series || lesson.term || lesson.level || lesson.unit)));
        if (lesson.unit) {
          paintUnit(lesson);
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
            var unitLesson = { book: lesson.book, series: lesson.series, term: lesson.term, level: lesson.level, unit: unitId };
            items.push({
              label: 'Unit ' + unitId.replace('unit', ''),
              drop: unitPrefix(unitLesson),
              go: function () { chooseLesson(unitLesson); }
            });
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
      var moving = moveBar();
      if (moving) main.appendChild(moving);
      var crumbs = document.createElement('p');
      crumbs.className = 'studio-files-crumbs';
      var rootName = view.bucket === 'lesson-inbox' ? 'Private inbox' : 'Public uploads';
      var allowUpload = view.bucket === 'lesson-inbox';
      var rootJump = document.createElement('button');
      rootJump.type = 'button';
      rootJump.textContent = rootName;
      rootJump.addEventListener('click', function () {
        view.parts = [];
        paint();
      });
      watchFolder(rootJump, view.bucket, '', allowUpload);
      crumbs.appendChild(rootJump);
      view.parts.forEach(function (part, index) {
        crumbs.appendChild(document.createTextNode(' / '));
        var jump = document.createElement('button');
        jump.type = 'button';
        jump.textContent = part;
        var jumpPrefix = view.parts.slice(0, index + 1).join('/');
        jump.addEventListener('click', function () {
          view.parts = view.parts.slice(0, index + 1);
          paint();
        });
        watchFolder(jump, view.bucket, jumpPrefix, allowUpload);
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
              watchFolder(folder, bucket, path, bucket === 'lesson-inbox');
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
      paintNote();
      if (view.kind === 'store') paintStore();
      else paintSite();
    }

    refreshAfterUpload = function (message, folder) {
      pinned = message || '';
      if (!dialog) {
        if (pinned) say(pinned);
        pinned = '';
        return;
      }
      var lesson = lessonFromFolder(folder);
      if (lesson) {
        chosen = true;
        view = { kind: 'site', area: 'lessons', lesson: lesson, folder: '', bucket: '', parts: [] };
      } else {
        var parts = String(folder == null ? 'inbox' : folder).split('/').filter(Boolean);
        view = { kind: 'store', area: 'store', lesson: null, folder: '', bucket: 'lesson-inbox', parts: parts };
      }
      paint();
      pinned = '';
    };

    picker.addEventListener('change', function () {
      var files = Array.prototype.slice.call(picker.files || []);
      picker.value = '';
      uploadFiles(client, files, say);
    });

    root.addEventListener('dragenter', function (event) {
      event.preventDefault();
      dragDepth += 1;
      if (!draggingFile) root.classList.add('is-dropping');
    });
    root.addEventListener('dragover', function (event) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = draggingFile ? 'move' : 'copy';
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
      if (draggingFile) {
        var item = draggingFile;
        draggingFile = null;
        if (view.kind === 'store') placeFile(item, view.bucket, view.parts.join('/'));
        return;
      }
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

  function send(client, file, folder, done) {
    if (!client || !client.storage) { if (done) done(false); return; }
    var safe = String(file.name || 'file').replace(/[^\w.\-]+/g, '-').replace(/^\.+/, '');
    uploadSerial += 1;
    var prefix = String(folder || '').replace(/^\/+|\/+$/g, '');
    var path = (prefix ? prefix + '/' : '') + Date.now() + '-' + uploadSerial + '-' + (safe || 'file');
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
