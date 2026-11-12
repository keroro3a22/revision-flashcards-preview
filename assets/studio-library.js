/* Admin file inbox. New uploads stay private until a photo is copied to the public library. */
(function () {
  var FOLDER = 'inbox';

  function $(id) { return document.getElementById(id); }

  function load(client, hooks) {
    var say = hooks.say || function () {};
    var host = $('studio-library');
    if (!host) return;
    host.replaceChildren();
    var bar = document.createElement('div');
    bar.className = 'studio-inbox-bar';
    var upload = document.createElement('button');
    upload.type = 'button';
    upload.textContent = 'Upload';
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.hidden = true;
    upload.addEventListener('click', function () { picker.click(); });
    picker.addEventListener('change', function () {
      var file = picker.files && picker.files[0];
      picker.value = '';
      if (file) send(client, file, say, function () { load(client, hooks); });
    });
    var note = document.createElement('p');
    note.textContent = 'New files stay in the private inbox. Only an admin can open them.';
    bar.appendChild(upload);
    bar.appendChild(picker);
    host.appendChild(bar);
    host.appendChild(note);
    var grid = document.createElement('div');
    grid.className = 'studio-inbox-grid';
    host.appendChild(grid);
    say('Loading files…');
    client.storage.from('lesson-inbox').list(FOLDER, { limit: 100, sortBy: { column: 'name', order: 'desc' } })
      .then(function (result) {
        if (result.error) { say(result.error.message); return; }
        var files = (result.data || []).filter(function (item) { return item.id; });
        if (!files.length) {
          grid.textContent = 'No files yet.';
          say('The private inbox is empty.');
          return;
        }
        files.forEach(function (item) { grid.appendChild(card(client, item, say)); });
        say(files.length + (files.length === 1 ? ' file in the private inbox.' : ' files in the private inbox.'));
      });
  }

  function card(client, item, say) {
    var path = FOLDER + '/' + item.name;
    var box = document.createElement('article');
    box.className = 'studio-inbox-file';
    var name = document.createElement('p');
    name.textContent = item.name;
    box.appendChild(name);
    if (/\.(png|jpe?g|gif|webp)$/i.test(item.name)) {
      var img = document.createElement('img');
      img.alt = '';
      client.storage.from('lesson-inbox').createSignedUrl(path, 120).then(function (result) {
        if (result.data && result.data.signedUrl) img.src = result.data.signedUrl;
      });
      box.insertBefore(img, name);
      var publish = document.createElement('button');
      publish.type = 'button';
      publish.textContent = 'Copy to public library';
      publish.addEventListener('click', function () { copyPublic(client, path, item.name, say); });
      box.appendChild(publish);
    }
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy path';
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy path'; }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(path).then(done, done);
      else done();
    });
    box.appendChild(copy);
    return box;
  }

  function send(client, file, say, done) {
    var safe = String(file.name || 'file').replace(/[^\w.\-]+/g, '-').replace(/^\.+/, '');
    var path = FOLDER + '/' + Date.now() + '-' + (safe || 'file');
    say('Uploading…');
    client.storage.from('lesson-inbox').upload(path, file, { upsert: false }).then(function (result) {
      if (result.error) { say(result.error.message); return; }
      say('Uploaded to the private inbox.');
      done();
    });
  }

  function copyPublic(client, path, name, say) {
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

  window.RevisionStudioLibrary = { load: load };
})();
