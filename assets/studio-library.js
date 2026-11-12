/* Standalone file browser. Website folders come from the site catalog.
   New uploads stay in the private inbox until a photo is copied out. */
(function () {
  var SITE = 'assets/site-files.json?v=1';
  var dialog = null;
  var onKey = null;

  function isImage(name) {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
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

  function close() {
    if (onKey) document.removeEventListener('keydown', onKey);
    onKey = null;
    if (dialog) dialog.remove();
    dialog = null;
  }

  function open(client, hooks) {
    var say = (hooks && hooks.say) || function () {};
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

    var note = document.createElement('p');
    note.className = 'studio-files-note';
    note.textContent = 'Website folders are the photos already on the site. New uploads go into the private inbox.';

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
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    closer.focus();

    var siteFolders = [];
    var view = { kind: 'site', index: 0, bucket: '', parts: [] };

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
    }

    function fileBox(item) {
      var box = document.createElement('article');
      box.className = 'studio-files-item';
      if (isImage(item.name) && item.src) {
        var img = document.createElement('img');
        img.alt = '';
        img.src = item.src;
        box.appendChild(img);
      }
      var name = document.createElement('p');
      name.textContent = item.name;
      box.appendChild(name);
      var copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copy path';
      copy.addEventListener('click', function () { copyText(item.path, copy); });
      box.appendChild(copy);
      if (item.privateImage) {
        var publish = document.createElement('button');
        publish.type = 'button';
        publish.textContent = 'Copy to public library';
        publish.addEventListener('click', function () { copyPublic(client, item.path, item.name, say); });
        box.appendChild(publish);
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
      say(folder.files.length + (folder.files.length === 1 ? ' file in ' : ' files in ') + folder.name + '.');
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
        say('Sign in to open stored files.');
        return;
      }
      var bucket = view.bucket;
      var prefix = view.parts.join('/');
      say('Loading files…');
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
            var box = fileBox({
              name: item.name,
              path: view.bucket === 'lesson-media' ? (src || path) : path,
              src: src,
              privateImage: view.bucket === 'lesson-inbox' && isImage(item.name)
            });
            if (view.bucket === 'lesson-inbox' && isImage(item.name)) {
              var img = box.querySelector('img');
              if (!img) {
                img = document.createElement('img');
                img.alt = '';
                box.insertBefore(img, box.firstChild);
              }
              client.storage.from(view.bucket).createSignedUrl(path, 120).then(function (signed) {
                if (signed.data && signed.data.signedUrl) img.src = signed.data.signedUrl;
              });
            }
            grid.appendChild(box);
          });
          if (!items.length) {
            var empty = document.createElement('p');
            empty.textContent = 'This folder is empty.';
            main.appendChild(empty);
            say('This folder is empty.');
            return;
          }
          main.appendChild(grid);
          say(items.length + (items.length === 1 ? ' item here.' : ' items here.'));
        });
    }

    function paint() {
      if (view.kind === 'store') paintStore();
      else paintSite();
    }

    picker.addEventListener('change', function () {
      var file = picker.files && picker.files[0];
      picker.value = '';
      if (!file) return;
      send(client, file, say, function () {
        view = { kind: 'store', index: 0, bucket: 'lesson-inbox', parts: ['inbox'] };
        paint();
      });
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

  function send(client, file, say, done) {
    if (!client || !client.storage) { say('Sign in before uploading.'); return; }
    var safe = String(file.name || 'file').replace(/[^\w.\-]+/g, '-').replace(/^\.+/, '');
    var path = 'inbox/' + Date.now() + '-' + (safe || 'file');
    say('Uploading…');
    client.storage.from('lesson-inbox').upload(path, file, { upsert: false }).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      say('Uploaded to the private inbox.');
      done();
    });
  }

  function copyPublic(client, path, name, say) {
    if (!client || !client.storage) { say('Sign in before copying a file.'); return; }
    say('Copying to the public library…');
    client.storage.from('lesson-inbox').download(path).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      var dest = 'library/' + Date.now() + '-' + name;
      client.storage.from('lesson-media').upload(dest, result.data, { upsert: false }).then(function (uploaded) {
        if (uploaded.error) { say(uploaded.error.message); return; }
        var pub = client.storage.from('lesson-media').getPublicUrl(dest);
        var url = pub && pub.data && pub.data.publicUrl;
        say(url ? 'Public copy: ' + url : 'Copied to the public library.');
      });
    });
  }

  window.RevisionStudioLibrary = { open: open, close: close };
})();
