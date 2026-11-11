const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const frame = require('../assets/img-frame.js');

test('the photo preview zooms with a slider', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  assert.match(js, /type="range"[^>]*step="0.005"/);
  assert.doesNotMatch(js, /Zoom in|Zoom out/);
});

test('zoom can move by half a percent', () => {
  assert.equal(frame.normalize({ z: 1.005 }).z, 1.005);
  assert.equal(frame.zoom({ z: 1 }, 0.005).z, 1.005);
});

test('a missing frame stays centered at the original size', () => {
  assert.deepEqual(frame.normalize(null), { x: 50, y: 50, z: 1 });
  assert.equal(frame.style(null), 'object-position:50% 50%;');
});

test('dragging the preview pans the picture inside the frame', () => {
  const next = frame.pan({ x: 50, y: 50, z: 1 }, 25, -10, { width: 100, height: 100 });
  assert.equal(next.x, 25);
  assert.equal(next.y, 60);
  assert.equal(next.z, 1);
});

test('zoom stays centered so a drag adjusts the crop instead of pulling the picture out', () => {
  const shrunk = frame.style({ x: 20, y: 80, z: 0.5 });
  assert.match(shrunk, /object-position:20% 80%/);
  assert.match(shrunk, /transform:translate\(15%,-15%\) scale\(0\.5\)/);
  assert.match(shrunk, /transform-origin:center center/);
  assert.doesNotMatch(shrunk, /transform-origin:20%/);
  const enlarged = frame.style({ x: 20, y: 80, z: 2 });
  assert.match(enlarged, /transform:translate\(30%,-30%\) scale\(2\)/);
  assert.match(enlarged, /transform-origin:center center/);
  const dragged = frame.pan({ x: 50, y: 50, z: 0.5 }, 10, 0, { width: 100, height: 100 });
  assert.equal(dragged.x, 30);
  assert.equal(frame.pan({ x: 50, y: 50, z: 0.5 }, 40, 0, { width: 100, height: 100 }).x, 0);
});

test('the preview image cannot be dragged out as a browser copy', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  const css = fs.readFileSync('assets/studio.css', 'utf8');
  assert.match(js, /<img alt="" draggable="false">/);
  assert.match(js, /dragstart/);
  assert.match(js, /preventDefault\(\)/);
  assert.match(css, /-webkit-user-drag:\s*none/);
});

test('zoom stays between half size and three times, and starts at full size', () => {
  assert.equal(frame.normalize(null).z, 1);
  assert.equal(frame.zoom({ z: 1 }, 1).z, 2);
  assert.equal(frame.zoom({ z: 3 }, 1).z, 3);
  assert.equal(frame.zoom({ z: 1 }, -1).z, 0.5);
  assert.equal(frame.normalize({ z: 0.1 }).z, 0.5);
  const js = require('node:fs').readFileSync('assets/studio.js', 'utf8');
  assert.match(js, /min="0.5" max="3" step="0.005"/);
});
