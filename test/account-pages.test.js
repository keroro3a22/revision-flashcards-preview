const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('sign in and profile are different pages', () => {
  const sign = read('account/index.html');
  const profile = read('profile/index.html');
  assert.match(sign, /id="account-form"/);
  assert.match(sign, /id="account-toggle"/);
  assert.doesNotMatch(sign, /id="account-settings"/);
  assert.doesNotMatch(sign, /id="account-signout"/);
  assert.match(profile, /id="account-settings"[^>]*hidden/);
  assert.match(read('assets/account.js'), /profile-form/);
  assert.match(profile, /id="profile-form"/);
  assert.match(profile, /id="tab-account"/);
  assert.match(profile, /id="settings-password-2"/);
  assert.match(profile, /id="account-signout"/);
  assert.match(profile, />Log out</);
  assert.doesNotMatch(profile, /id="account-form"/);
  assert.doesNotMatch(profile, /id="account-toggle"/);
  assert.match(read('assets/profile.js'), /return 'profile\/'/);
});

test('lesson editors stay signed in on more than one device', () => {
  const sql = read('supabase/migrations/20261111200000_editor_multi_device.sql');
  const signIn = read('account/index.html');
  const account = read('assets/account.js');
  assert.match(sql, /username = 'keroroa22'/);
  assert.match(sql, /delete from private\.content_editors/);
  assert.match(sql, /private\.content_editors/);
  const editorCheck = sql.indexOf('private.content_editors as e');
  const dropOthers = sql.indexOf('delete from auth.sessions');
  assert.ok(editorCheck > 0 && dropOthers > editorCheck);
  assert.match(signIn, /Lesson editors can stay signed in on more than one/);
  assert.match(account, /Lesson editors can stay signed in on more than one/);
});
