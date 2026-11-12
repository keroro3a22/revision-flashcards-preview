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
    var view = { kind: 'site', index: 0, bucket: '', parts: [] };
    var pinned = '';
    function status(text) {
      if (uploadJob || pinned) return;
      say(text);
    }

    function navButton(label, on, pick) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-files-nav' + (on ? ' is-on' : '');
      button.textContent = label;
      button.addEventListener('click', pick);
      return button;
    }

    function paintNav() {
      nav.replaceChildren();
      var siteLabel = document.createElement('p');
      siteLabel.className = 'studio-files-group';
      siteLabel.textContent = 'Website';
      nav.appendChild(siteLabel);
      siteFolders.forEach(function (folder, index) {
        nav.appendChild(navButton(folder.name, view.kind === 'site' && view.index === index, function () {
          view = { kind: 'site', index: index, bucket: '', parts: [] };
          paint();
        }));
      });
      var storeLabel = document.createElement('p');
      storeLabel.className = 'studio-files-group';
      storeLabel.textContent = 'Storage';
      nav.appendChild(storeLabel);
      nav.appendChild(navButton('Public uploads', view.bucket === 'lesson-media', function () {
        view = { kind: 'store', index: 0, bucket: 'lesson-media', parts: [] };
        paint();
      }));
      nav.appendChild(navButton('Private inbox', view.bucket === 'lesson-inbox', function () {
        view = { kind: 'store', index: 0, bucket: 'lesson-inbox', parts: [] };
        paint();
      }));
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
      var previewable = isImage(item.name) || /\.pdf$/i.test(item.name);
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
      if (picking && isImage(item.name)) {
        var use = document.createElement('button');
        use.type = 'button';
        use.textContent = 'Use this photo';
        use.addEventListener('click', function () {
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

    function paintSite() {
      paintNav();
      main.replaceChildren();
      var folder = siteFolders[view.index];
      if (!folder) {
        main.textContent = 'No website files were found.';
        return;
      }
      var grid = document.createElement('div');
      grid.className = 'studio-files-grid';
      folder.files.forEach(function (file) {
        grid.appendChild(fileBox({ name: file.name, path: file.path, src: file.path }));
      });
      main.appendChild(grid);
      status(folder.files.length + (folder.files.length === 1 ? ' file in ' : ' files in ') + folder.name + '.');
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
            if (isImage(item.name) && view.bucket === 'lesson-media') {
              var pub = client.storage.from(view.bucket).getPublicUrl(path);
              src = pub && pub.data && pub.data.publicUrl;
            }
            var privateFile = view.bucket === 'lesson-inbox';
            var box = fileBox({
              name: item.name,
              path: view.bucket === 'lesson-media' ? (src || path) : path,
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
      view = { kind: 'store', index: 0, bucket: 'lesson-inbox', parts: ['inbox'] };
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
      var start = -1;
      siteFolders.forEach(function (folder, index) {
        if (folder.name === preferred) start = index;
      });
      if (start >= 0) view.index = start;
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
