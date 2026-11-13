/* Username sign-in for the static site.
   Logged-out practice stays in localStorage.
   After sign-in, badges and progress save to that account.
   A new sign-in closes a learner account on the other device.
   Lesson editors can stay signed in on more than one device. */
(function () {
  if (window.__p6Account) return;
  window.__p6Account = true;

  var P = window.ProgressSync;
  var cfg = window.SUPABASE_PUBLIC || {};
  var scriptEl = document.currentScript;
  var AUTH_KEY = 'p6-sb-auth';
  var NOTICE_KEY = 'p6-account-notice';
  var RELOAD_KEY = 'p6-hydrate-reloads';
  var quiet = false;
  var client = null;
  var hydrated = false;
  var userId = '';
  var displayName = '';
  var settingsPainted = false;
  var settingsAvatar = '';
  var pushTimer = 0;
  var pushing = false;
  var pushAgain = false;
  var watching = false;

  try {
    var savedSession = localStorage.getItem(AUTH_KEY) || '';
    if (savedSession) document.documentElement.classList.add('account-booting');
    if (savedSession.indexOf('access_token') !== -1) {
      document.documentElement.setAttribute('data-signed-in', 'yes');
    }
  } catch (e) { /* private mode */ }

  setTimeout(function () {
    document.documentElement.classList.remove('account-booting');
  }, 5000);

  var watched = {};
  if (P) {
    watched[P.KEYS.badges] = true;
    watched[P.KEYS.profile] = true;
    watched[P.KEYS.mastery] = true;
    watched[P.KEYS.matchBest] = true;
    watched[P.KEYS.timedBest] = true;
    watched[P.KEYS.lastPlace] = true;
  }

  try {
    var originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      originalSet.call(this, key, value);
      if (quiet || this !== localStorage || !P) return;
      if (key === P.KEYS.profile) originalSet.call(this, P.PROFILE_AT, String(Date.now()));
      if (key === P.KEYS.lastPlace) originalSet.call(this, P.LAST_AT, String(Date.now()));
      if (watched[key]) schedulePush();
    };
  } catch (e2) { /* storage locked */ }

  function unhide() {
    document.documentElement.classList.remove('account-booting');
  }

  function siteRoot() {
    var src = (scriptEl && scriptEl.src) || '';
    var cut = src.indexOf('assets/account.js');
    return cut === -1 ? '' : src.slice(0, cut);
  }

  function vendorSrc() {
    var src = (scriptEl && scriptEl.src) || '';
    if (src.indexOf('account.js') === -1) return 'assets/vendor/supabase.js';
    return src.replace(/account\.js(?:\?.*)?$/, 'vendor/supabase.js');
  }

  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) {
        resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = vendorSrc();
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Sign-in could not load. Check the connection and try again.')); };
      document.head.appendChild(script);
    });
  }

  function ensureClient() {
    if (!cfg.url || !cfg.key) return Promise.reject(new Error('Sign-in is not configured on this copy of the site.'));
    return loadSdk().then(function () {
      if (!client) {
        client = window.supabase.createClient(cfg.url, cfg.key, {
          auth: {
            storageKey: AUTH_KEY,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        });
      }
      return client;
    });
  }

  function labelFromUser(user) {
    var email = (user && user.email) || '';
    var name = email.split('@')[0] || '';
    if (name && P.usernameOk(name)) return name;
    return name || 'Account';
  }

  function pageHref(file) {
    var root = siteRoot();
    return (root || '') + file;
  }

  function cleanPlace(rel) {
    rel = String(rel || '').replace(/^\//, '');
    rel = rel.replace(/(^|\/)index\.html(?=[#?]|$)/, '$1');
    rel = rel.replace(/\.html(?=[#?]|$)/, '/');
    return rel;
  }

  function currentPlace() {
    try {
      var root = siteRoot();
      var rootPath = new URL(root || window.location.href).pathname;
      var path = window.location.pathname || '';
      var rel = path.indexOf(rootPath) === 0 ? path.slice(rootPath.length) : '';
      rel = cleanPlace(rel);
      var tail = (window.location.search || '') + (window.location.hash || '');
      return (rel || './') + tail;
    } catch (e) {
      return './';
    }
  }

  function accountHref() {
    var root = siteRoot();
    var account = (root || '') + 'account/';
    if (!root) return 'account/';
    try {
      var rootPath = new URL(root).pathname;
      var rel = window.location.pathname.indexOf(rootPath) === 0
        ? window.location.pathname.slice(rootPath.length)
        : '';
      if (window.location.hash) rel += window.location.hash;
      rel = cleanPlace(rel);
      if (!rel || rel === './' || rel === 'account' || rel === 'account/' || rel.indexOf('account/') === 0) return account;
      var safe = P.safeNext(rel);
      return safe ? account + '?next=' + encodeURIComponent(safe) : account;
    } catch (e) {
      return account;
    }
  }

  function nextHref() {
    var root = siteRoot();
    if (!root) root = new URL('./', window.location.href).href;
    var safe = '';
    try { safe = P.safeNext(new URLSearchParams(window.location.search).get('next') || ''); } catch (e) {}
    safe = cleanPlace(safe);
    if (!safe || safe === './') return root;
    return new URL(safe, root).href;
  }

  function paintSettings() {
    if (settingsPainted || !userId) return;
    var nameInput = document.getElementById('settings-name');
    var userInput = document.getElementById('settings-username');
    var grid = document.getElementById('settings-avatars');
    if (!nameInput || !userInput || !grid || !window.Profile) return;
    settingsPainted = true;
    var profile = window.Profile.load();
    settingsAvatar = profile.avatar;
    nameInput.value = profile.nickname || '';
    userInput.value = displayName && displayName !== 'Account' ? displayName : '';
    grid.replaceChildren();
    window.Profile.list().forEach(function (item) {
      var choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'profile-choice' + (item.unlocked ? '' : ' is-locked') + (item.filtered ? ' is-filtered' : '') + (item.id === settingsAvatar ? ' is-on' : '');
      choice.disabled = !item.unlocked;
      choice.setAttribute('aria-pressed', item.id === settingsAvatar ? 'true' : 'false');
      choice.setAttribute('aria-label', item.unlocked ? item.label : item.lockLabel);
      var img = document.createElement('img');
      img.src = item.src.indexOf('../') === 0 ? item.src : item.src;
      img.alt = '';
      img.width = 72;
      img.height = 72;
      var label = document.createElement('span');
      label.className = 'settings-avatar-name';
      label.textContent = item.label;
      var note = document.createElement('span');
      note.className = 'settings-avatar-note';
      note.textContent = item.unlocked ? (item.zh || 'Free picture') : item.lockLabel;
      choice.appendChild(img);
      choice.appendChild(label);
      choice.appendChild(note);
      if (item.unlocked) {
        choice.addEventListener('click', function () {
          settingsAvatar = item.id;
          var buttons = grid.querySelectorAll('button');
          for (var i = 0; i < buttons.length; i++) {
            var on = buttons[i] === choice;
            buttons[i].classList.toggle('is-on', on);
            buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
          }
        });
      }
      grid.appendChild(choice);
    });
  }

  function paintLink() {
    document.documentElement.setAttribute('data-signed-in', userId ? 'yes' : 'no');
    var link = document.getElementById('account-link');
    if (link) {
      if (link.classList.contains('account-link-fab')) link.textContent = 'Sign in';
      else link.textContent = 'Sign in / Sign up';
      link.setAttribute('href', accountHref());
    }
    if (window.Profile && window.Profile.labelChip) window.Profile.labelChip(displayName);
    paintBadges();
    paintLessons();
    var form = document.getElementById('account-form');
    var panel = document.getElementById('account-settings');
    var pending = document.getElementById('account-pending');
    if (!form && !panel) return;
    if (pending) pending.hidden = true;
    if (displayName && userId) {
      if (form) form.hidden = true;
      if (panel && !document.getElementById('profile-form')) panel.hidden = false;
      paintSettings();
    } else {
      settingsPainted = false;
      if (panel) panel.hidden = true;
      if (form) form.hidden = false;
    }
  }

  function paintBadges() {
    var slot = document.getElementById('profile-slot');
    var link = document.getElementById('badges-link');
    if (!slot || !userId) {
      if (link) link.remove();
      return;
    }
    if (!link) {
      link = document.createElement('a');
      link.id = 'badges-link';
      link.className = 'edit-lessons';
      link.textContent = 'Badges';
    }
    link.href = pageHref('badges/');
    slot.insertBefore(link, slot.firstChild);
  }

  function paintLessons() {
    var current = document.getElementById('edit-lessons');
    if (!userId || !client) {
      if (current) current.remove();
      return;
    }
    var askedFor = userId;
    client.rpc('is_content_editor').then(function (check) {
      if (askedFor !== userId) return;
      var link = document.getElementById('edit-lessons');
      var allowed = check && !check.error && check.data === true;
      if (!allowed) {
        if (link) link.remove();
        return;
      }
      var slot = document.getElementById('profile-slot');
      if (!slot) return;
      if (!link) {
        link = document.createElement('a');
        link.id = 'edit-lessons';
        link.className = 'edit-lessons';
        link.textContent = 'Edit lessons';
        link.addEventListener('pointerdown', function () {
          try { sessionStorage.setItem('revision-studio-from', currentPlace()); } catch (e) {}
        });
      }
      link.href = pageHref('studio/');
      var badges = document.getElementById('badges-link');
      if (badges && badges.parentNode === slot) slot.insertBefore(link, badges.nextSibling);
      else {
        var chip = slot.querySelector('.profile-chip');
        if (chip) slot.insertBefore(link, chip);
        else slot.appendChild(link);
      }
    });
  }

  function mountLink() {
    if (document.getElementById('account-link')) {
      paintLink();
      return;
    }
    var link = document.createElement('a');
    link.id = 'account-link';
    link.href = accountHref();
    var nav = document.querySelector('.nav-plain');
    if (nav) {
      link.className = 'nav-jump';
      link.textContent = 'Sign in / Sign up';
      nav.appendChild(link);
      return;
    }
    link.textContent = 'Sign in';
    link.className = 'account-link-fab';
    document.body.appendChild(link);
  }

  function showNotice() {
    var text = '';
    try { text = sessionStorage.getItem(NOTICE_KEY) || ''; } catch (e) {}
    if (!text || document.getElementById('account-notice')) return;
    try { sessionStorage.removeItem(NOTICE_KEY); } catch (e2) {}
    var note = document.createElement('p');
    note.id = 'account-notice';
    note.className = 'account-notice';
    note.setAttribute('role', 'status');
    note.textContent = text;
    var header = document.querySelector('header');
    if (header && header.parentNode) header.parentNode.insertBefore(note, header.nextSibling);
    else document.body.insertBefore(note, document.body.firstChild);
  }

  function readChoice(id) {
    var raw = '';
    try { raw = localStorage.getItem(P.CHOICE_KEY) || ''; } catch (e) {}
    var prefix = id + ':';
    return raw.indexOf(prefix) === 0 ? raw.slice(prefix.length) : '';
  }

  function schedulePush() {
    if (!hydrated || !userId) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushNow(); }, 500);
  }

  function sessionIsCurrent() {
    return client.rpc('session_is_current').then(function (result) {
      if (result.error) return true;
      return result.data === true;
    }).catch(function () { return true; });
  }

  function fetchRemote() {
    return client.from('learner_progress')
      .select('badges,profile,mastery,match_best,timed_best,last_place,updated_at')
      .eq('user_id', userId)
      .maybeSingle()
      .then(function (result) {
        if (result.error) throw result.error;
        if (!result.data) return { snapshot: P.emptySnapshot(), remoteAt: 0 };
        var row = result.data;
        var remoteAt = row.updated_at ? Date.parse(row.updated_at) : 0;
        return {
          snapshot: {
            badges: row.badges || {},
            profile: row.profile || {},
            mastery: row.mastery || {},
            matchBest: row.match_best || {},
            timedBest: row.timed_best || {},
            lastPlace: row.last_place || {}
          },
          remoteAt: isFinite(remoteAt) ? remoteAt : 0
        };
      });
  }

  function upsert(snapshot) {
    return client.from('learner_progress').upsert({
      user_id: userId,
      badges: snapshot.badges || {},
      profile: snapshot.profile || {},
      mastery: snapshot.mastery || {},
      match_best: snapshot.matchBest || {},
      timed_best: snapshot.timedBest || {},
      last_place: snapshot.lastPlace || {}
    }, { onConflict: 'user_id' }).select('user_id').then(function (result) {
      if (result.error) throw result.error;
      if (!result.data || !result.data.length) return kicked();
    });
  }

  function applyPlan(plan, before) {
    if (plan.stashLocalAs) {
      P.stash(localStorage, plan.stashLocalAs, before, {
        profileAt: Number(localStorage.getItem(P.PROFILE_AT)) || 0,
        lastAt: Number(localStorage.getItem(P.LAST_AT)) || 0
      });
    }
    quiet = true;
    try {
      P.write(localStorage, plan.snapshot);
      localStorage.setItem(P.OWNER_KEY, plan.owner || '');
      localStorage.setItem(P.PROFILE_AT, String(plan.profileAt || 0));
      localStorage.setItem(P.LAST_AT, String(plan.lastAt || 0));
      if (plan.holdAnon) localStorage.setItem(P.HELD_KEY, '1');
      else localStorage.removeItem(P.HELD_KEY);
    } finally {
      quiet = false;
    }
  }

  function signOutLocal(message) {
    var job = client ? client.auth.signOut({ scope: 'local' }) : Promise.resolve();
    return job.catch(function () {}).then(function () {
      userId = '';
      displayName = '';
      hydrated = false;
      try { P.clearDevice(localStorage); } catch (e4) {}
      if (message) {
        try { sessionStorage.setItem(NOTICE_KEY, message); } catch (e2) {}
      }
      try { sessionStorage.removeItem(RELOAD_KEY); } catch (e3) {}
      window.location.reload();
    });
  }

  function kicked() {
    return signOutLocal('This account is signed in on another device, so this one was signed out.');
  }

  function askSave(username, freshAccount) {
    return new Promise(function (resolve) {
      unhide();
      var wrap = document.createElement('div');
      wrap.className = 'account-ask';
      var panel = document.createElement('div');
      panel.className = 'account-ask-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'account-ask-title');
      var title = document.createElement('h2');
      title.id = 'account-ask-title';
      title.textContent = freshAccount ? 'Keep this device’s practice?' : 'Save this device’s progress?';
      var copy = document.createElement('p');
      copy.textContent = freshAccount
        ? 'This device already has badges and practice. Save them to ' + username + ', or start the new account empty.'
        : 'Badges and practice already on this device can be saved to ' + username + '. You can also keep them on this device only.';
      var zh = document.createElement('p');
      zh.lang = 'zh-Hant';
      zh.textContent = freshAccount
        ? '這部裝置已有進度和徽章。可以存入新帳號，也可以讓新帳號從空白開始。'
        : '這部裝置上的進度和徽章可以存入這個帳號，也可以只留在這部裝置。';
      var actions = document.createElement('div');
      actions.className = 'account-ask-actions';
      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Save to this account';
      var keepBtn = document.createElement('button');
      keepBtn.type = 'button';
      keepBtn.className = 'btn btn-ink';
      keepBtn.textContent = 'Keep them separate';
      function choose(choice) {
        wrap.remove();
        resolve(choice);
      }
      saveBtn.addEventListener('click', function () { choose('save'); });
      keepBtn.addEventListener('click', function () { choose('separate'); });
      actions.appendChild(saveBtn);
      actions.appendChild(keepBtn);
      panel.appendChild(title);
      panel.appendChild(copy);
      panel.appendChild(zh);
      panel.appendChild(actions);
      wrap.appendChild(panel);
      document.body.appendChild(wrap);
      saveBtn.focus();
    });
  }

  function maybeReload(before, after) {
    if (P.same(before, after)) {
      try { sessionStorage.removeItem(RELOAD_KEY); } catch (e) {}
      unhide();
      return;
    }
    var count = 0;
    try { count = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch (e2) {}
    if (count >= 1) {
      try { sessionStorage.removeItem(RELOAD_KEY); } catch (e3) {}
      unhide();
      return;
    }
    try { sessionStorage.setItem(RELOAD_KEY, '1'); } catch (e4) {}
    window.location.reload();
  }

  function pushNow() {
    if (!hydrated || !userId || !client) return Promise.resolve();
    if (pushing) {
      pushAgain = true;
      return Promise.resolve();
    }
    pushing = true;
    return sessionIsCurrent().then(function (ok) {
      if (!ok) return null;
      return fetchRemote();
    }).then(function (remote) {
      if (!remote || !userId) return;
      var local = P.read(localStorage);
      var merged = P.merge(local, remote.snapshot, {
        remoteAt: remote.remoteAt,
        profileAt: Number(localStorage.getItem(P.PROFILE_AT)) || 0,
        lastAt: Number(localStorage.getItem(P.LAST_AT)) || 0
      });
      if (!P.same(local, merged)) {
        quiet = true;
        try { P.write(localStorage, merged); } finally { quiet = false; }
      }
      if (!P.same(merged, remote.snapshot)) return upsert(merged);
    }).catch(function () {}).then(function () {
      pushing = false;
      if (pushAgain) {
        pushAgain = false;
        schedulePush();
      }
    });
  }

  function startWatch() {
    if (watching) return;
    watching = true;
    setInterval(function () {
      if (!userId || !client || document.visibilityState === 'hidden') return;
      sessionIsCurrent().then(function (ok) { if (!ok && userId) kicked(); });
    }, 20000);
    document.addEventListener('visibilitychange', function () {
      if (!userId || !client || document.visibilityState !== 'hidden') return;
      pushNow();
    });
  }

  function hydrate(opts) {
    opts = opts || {};
    var hadToken = false;
    try { hadToken = !!localStorage.getItem(AUTH_KEY); } catch (e) {}
    if (!hadToken && !opts.afterLogin) {
      unhide();
      paintLink();
      return Promise.resolve();
    }
    return ensureClient().then(function () {
      return client.auth.getSession();
    }).then(function (sessionResult) {
      var session = sessionResult.data && sessionResult.data.session;
      if (!session || !session.user) {
        userId = '';
        displayName = '';
        hydrated = false;
        if (hadToken && !opts.afterLogin) {
          try {
            sessionStorage.setItem(NOTICE_KEY, 'You were signed out. If this account was opened on another device, sign in again here.');
          } catch (e) {}
          showNotice();
        }
        paintLink();
        unhide();
        if (document.getElementById('account-settings')) window.location.replace(pageHref('account/'));
        return null;
      }
      userId = session.user.id;
      displayName = labelFromUser(session.user);
      if (!opts.afterLogin && document.getElementById('account-form') && !document.getElementById('account-settings')) {
        window.location.replace(pageHref('profile/'));
        return null;
      }
      return sessionIsCurrent().then(function (ok) {
        if (ok) return fetchRemote();
        return client.rpc('claim_session').then(function (claimed) {
          if (claimed && claimed.data === true) return fetchRemote();
          kicked();
          return null;
        });
      });
    }).then(function (remote) {
      if (!remote) return;
      var before = P.read(localStorage);
      var owner = '';
      try { owner = localStorage.getItem(P.OWNER_KEY) || ''; } catch (e) {}
      var stash = owner && owner !== userId ? P.readStash(localStorage, userId) : { snapshot: null, found: false, profileAt: 0, lastAt: 0 };
      var plan = P.planHydration({
        local: before,
        remote: remote.snapshot,
        remoteAt: remote.remoteAt,
        localOwner: owner,
        userId: userId,
        freshAccount: !!opts.freshAccount,
        choice: readChoice(userId),
        profileAt: Number(localStorage.getItem(P.PROFILE_AT)) || 0,
        lastAt: Number(localStorage.getItem(P.LAST_AT)) || 0,
        stashed: stash.found ? stash.snapshot : P.emptySnapshot(),
        stashProfileAt: stash.profileAt,
        stashLastAt: stash.lastAt
      });
      if (plan.action === 'ask') {
        return askSave(displayName || 'this account', !!opts.freshAccount).then(function (choice) {
          localStorage.setItem(P.CHOICE_KEY, userId + ':' + choice);
          return hydrate(opts);
        });
      }
      applyPlan(plan, before);
      paintLink();
      var saved = plan.upload ? upsert(plan.snapshot) : Promise.resolve();
      return saved.then(function () {
        if (opts.afterLogin) {
          window.location.href = nextHref();
          return;
        }
        hydrated = true;
        startWatch();
        maybeReload(before, plan.snapshot);
      });
    }).catch(function () {
      paintLink();
      unhide();
    });
  }

  function readInvokeError(error) {
    var response = error && error.context;
    if (response && typeof response.json === 'function') {
      return response.json().then(function (body) {
        return (body && body.error) || 'Could not create the account.';
      }).catch(function () {
        return 'Could not create the account.';
      });
    }
    return Promise.resolve((error && error.message) || 'Could not create the account.');
  }

  function signIn(name, pass, created) {
    return client.auth.signInWithPassword({
      email: P.emailForUsername(name),
      password: pass
    }).then(function (result) {
      if (result.error || !result.data || !result.data.session) {
        throw new Error(created
          ? 'The account was created, but sign-in failed. Try signing in.'
          : 'That username and password do not match.');
      }
      userId = result.data.session.user.id;
      displayName = labelFromUser(result.data.session.user);
      return result.data.session;
    });
  }

  function signup(name, pass) {
    return client.functions.invoke('username-signup', {
      body: { username: name, password: pass }
    }).then(function (result) {
      if (result.error) {
        return readInvokeError(result.error).then(function (message) {
          throw new Error(message);
        });
      }
      if (result.data && result.data.error) throw new Error(result.data.error);
      return signIn(name, pass, true);
    });
  }

  function showError(message) {
    var error = document.getElementById('account-error');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function showSignupPause() {
    if (document.getElementById('signup-pause')) return;
    var wrap = document.createElement('div');
    wrap.id = 'signup-pause';
    wrap.className = 'account-ask';
    var panel = document.createElement('div');
    panel.className = 'account-ask-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'signup-pause-copy');
    var copy = document.createElement('p');
    copy.id = 'signup-pause-copy';
    copy.textContent = 'Sign-up is closed for now. The website is still under development.';
    var actions = document.createElement('div');
    actions.className = 'account-ask-actions';
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn btn-primary';
    ok.textContent = 'OK';
    function close() { wrap.remove(); }
    ok.addEventListener('click', close);
    wrap.addEventListener('click', function (event) {
      if (event.target === wrap) close();
    });
    actions.appendChild(ok);
    panel.appendChild(copy);
    panel.appendChild(actions);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);
    ok.focus();
  }

  function wireForm() {
    wireSettings();
    var form = document.getElementById('account-form');
    if (!form) return;
    var mode = 'signin';
    var username = document.getElementById('account-username-input');
    var password = document.getElementById('account-password');
    var submit = document.getElementById('account-submit');
    var toggle = document.getElementById('account-toggle');
    var title = document.getElementById('account-mode-title');
    var signOutBtn = document.getElementById('account-signout');
    try {
      if (localStorage.getItem(AUTH_KEY)) {
        form.hidden = true;
        var pending = document.getElementById('account-pending');
        if (pending) pending.hidden = false;
      }
    } catch (e) {}
    function setMode(next) {
      mode = next;
      var signingUp = mode === 'signup';
      var screen = document.getElementById('account-screen');
      var kicker = document.getElementById('account-kicker');
      var lead = document.getElementById('account-lead');
      var zh = document.getElementById('account-zh');
      var note = document.getElementById('account-aside-note');
      var formKicker = document.getElementById('account-form-kicker');
      if (screen) screen.setAttribute('data-mode', signingUp ? 'signup' : 'signin');
      if (kicker) kicker.textContent = signingUp ? 'New account' : 'Welcome back';
      if (title) title.textContent = signingUp ? 'Create account' : 'Sign in';
      if (lead) {
        lead.textContent = signingUp
          ? 'Choose a username and a password. No email, and nothing to confirm.'
          : 'Units work with no account. Sign in to save progress and badges.';
      }
      if (zh) {
        zh.textContent = signingUp
          ? '用使用者名稱和密碼註冊。不用電郵，也不用確認。'
          : '單元和默書不用登入。登入後，進度和徽章會存在這個帳號。';
      }
      if (note) {
        note.textContent = signingUp
          ? 'One device at a time. A new sign-in closes the other device.'
          : 'A new sign-in closes the other device. Lesson editors can stay signed in on more than one.';
      }
      if (formKicker) formKicker.textContent = signingUp ? 'Create a new username' : 'Sign in with your username';
      if (submit) submit.textContent = signingUp ? 'Create account' : 'Sign in';
      if (toggle) {
        toggle.textContent = signingUp
          ? 'Already have an account? Sign in here.'
          : "Don't have an account? Create one here.";
      }
      if (password) password.autocomplete = signingUp ? 'new-password' : 'current-password';
    }
    if (toggle) {
      toggle.addEventListener('click', function () {
        showSignupPause();
      });
    }
  function wireSettings() {
    var profileTab = document.getElementById('tab-profile');
    var accountTab = document.getElementById('tab-account');
    var profileForm = document.getElementById('profile-form');
    var accountPanel = document.getElementById('account-settings');
    function showPanel(which) {
      if (profileForm) profileForm.hidden = which !== 'profile';
      if (accountPanel) accountPanel.hidden = which !== 'account';
      if (profileTab) profileTab.setAttribute('aria-selected', which === 'profile' ? 'true' : 'false');
      if (accountTab) accountTab.setAttribute('aria-selected', which === 'account' ? 'true' : 'false');
    }
    if (profileTab) profileTab.addEventListener('click', function () { showPanel('profile'); });
    if (accountTab) accountTab.addEventListener('click', function () { showPanel('account'); });
    if (profileForm) {
      profileForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var message = document.getElementById('profile-message');
        function showProfile(text, bad) {
          if (!message) return;
          message.textContent = text;
          message.hidden = !text;
          message.classList.toggle('account-error', !!bad);
        }
        if (!window.Profile) return;
        var saved = window.Profile.save({
          nickname: document.getElementById('settings-name').value,
          avatar: settingsAvatar || window.Profile.load().avatar
        });
        if (!saved.ok) {
          showProfile(saved.reason === 'storage' ? 'Could not save on this device.' : 'Type a name to continue.', true);
          return;
        }
        var chipName = document.querySelector('.profile-chip-name');
        if (chipName) chipName.textContent = saved.profile.nickname;
        var chipImg = document.querySelector('.profile-chip-avatar');
        if (chipImg) chipImg.src = window.Profile.display(saved.profile).src;
        showProfile('Saved.', false);
      });
    }
    var signOutBtn = document.getElementById('account-signout');
    if (signOutBtn) signOutBtn.addEventListener('click', function () { signOutLocal(''); });
    var settingsForm = document.getElementById('account-settings');
    if (settingsForm) {
      settingsForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var message = document.getElementById('settings-message');
        var name = document.getElementById('settings-name').value;
        var username = window.ProgressSync.normalizeUsername(document.getElementById('settings-username').value);
        var password = document.getElementById('settings-password').value;
        var repeat = document.getElementById('settings-password-2').value;
        function showSettings(text, bad) {
          if (!message) return;
          message.textContent = text;
          message.hidden = !text;
          message.classList.toggle('account-error', !!bad);
        }
        if (!window.Profile) return;
        var saved = window.Profile.save({ nickname: name, avatar: settingsAvatar || window.Profile.load().avatar });
        if (!saved.ok) {
          showSettings(saved.reason === 'storage' ? 'Could not save on this device.' : 'Type a name to continue.', true);
          return;
        }
        if (window.Profile.labelChip) window.Profile.labelChip(displayName);
        var chipName = document.querySelector('.profile-chip-name');
        if (chipName) chipName.textContent = saved.profile.nickname;
        var chipImg = document.querySelector('.profile-chip-avatar');
        if (chipImg) chipImg.src = window.Profile.display(saved.profile).src;
        if (!username || !window.ProgressSync.usernameOk(username)) {
          showSettings('Use 3–20 letters, numbers, or underscores, and start with a letter.', true);
          return;
        }
        if (password || repeat) {
          if (password !== repeat) {
            showSettings('Type the same password in both boxes.', true);
            return;
          }
          if (password.length < 6 || password.length > 72) {
            showSettings('Use a password with 6 to 72 characters.', true);
            return;
          }
        }
        showSettings('Saving…', false);
        ensureClient().then(function () {
          var job = Promise.resolve();
          if (username !== displayName) {
            job = client.rpc('change_username', { new_username: username }).then(function (result) {
              if (result.error) throw result.error;
              displayName = username;
              return client.auth.refreshSession();
            });
          }
          if (password) {
            job = job.then(function () {
              return client.auth.updateUser({ password: password }).then(function (result) {
                if (result.error) throw result.error;
              });
            });
          }
          return job;
        }).then(function () {
          var passwordInput = document.getElementById('settings-password');
          if (passwordInput) passwordInput.value = '';
          showSettings('Saved.', false);
        }).catch(function (err) {
          var text = (err && err.message) || 'Could not save the account.';
          if (/taken/i.test(text)) text = 'That username is taken.';
          else if (/invalid username/i.test(text)) text = 'Use 3–20 letters, numbers, or underscores, and start with a letter.';
          else if (/password/i.test(text) && text.length < 180) text = text;
          else if (/change_username|function/i.test(text)) text = 'Username changes are not available yet.';
          showSettings(text, true);
        });
      });
    }
  }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (mode === 'signup') {
        showSignupPause();
        return;
      }
      var name = P.normalizeUsername(username.value);
      var pass = password.value;
      if (!P.usernameOk(name)) {
        showError('Use 3–20 letters, numbers, or underscores, and start with a letter.');
        return;
      }
      if (!P.passwordOk(pass)) {
        showError('Use a password with 6 to 72 characters.');
        return;
      }
      if (submit) submit.disabled = true;
      var created = mode === 'signup';
      ensureClient().then(function () {
        return created ? signup(name, pass) : signIn(name, pass, false);
      }).then(function () {
        return client.rpc('claim_session');
      }).then(function (claimed) {
        if (!claimed || claimed.error || claimed.data !== true) {
          throw new Error('Could not keep this device signed in.');
        }
        return hydrate({ afterLogin: true, freshAccount: created });
      }).catch(function (err) {
        if (submit) submit.disabled = false;
        showError((err && err.message) || 'Sign-in failed. Try again.');
        unhide();
      });
    });
  }

  function boot() {
    if (!P) {
      unhide();
      return;
    }
    mountLink();
    showNotice();
    wireForm();
    var hasToken = false;
    try { hasToken = !!localStorage.getItem(AUTH_KEY); } catch (e) {}
    if (!hasToken) {
      unhide();
      return;
    }
    hydrate({ afterLogin: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
