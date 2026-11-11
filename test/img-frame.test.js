const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const frame = require('../assets/img-frame.js');

test('the photo preview zooms with a slider', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  assert.match(js, /type="range"/);
  assert.doesNotMatch(js, /Zoom in|Zoom out/);
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

test('zoom stays between the original size and three times', () => {
  assert.equal(frame.zoom({ z: 1 }, 1).z, 2);
  assert.equal(frame.zoom({ z: 3 }, 1).z, 3);
  assert.equal(frame.zoom({ z: 1 }, -1).z, 1);
});
