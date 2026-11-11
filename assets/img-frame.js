/* Pan and zoom for a photo inside the same frame the live page uses. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ImgFrame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalize(frame) {
    var src = frame;
    if (typeof src === 'string') {
      try { src = JSON.parse(src); } catch (error) { src = null; }
    }
    src = src || {};
    var x = Number(src.x);
    var y = Number(src.y);
    var z = Number(src.z);
    if (!isFinite(x)) x = 50;
    if (!isFinite(y)) y = 50;
    if (!isFinite(z)) z = 1;
    return {
      x: Math.round(clamp(x, 0, 100) * 10) / 10,
      y: Math.round(clamp(y, 0, 100) * 10) / 10,
      z: Math.round(clamp(z, 1, 3) * 1000) / 1000
    };
  }

  function pan(frame, dx, dy, box) {
    var next = normalize(frame);
    var width = box && box.width > 0 ? box.width : 1;
    var height = box && box.height > 0 ? box.height : 1;
    next.x -= (dx / width) * 100 / next.z;
    next.y -= (dy / height) * 100 / next.z;
    return normalize(next);
  }

  function zoom(frame, step) {
    var next = normalize(frame);
    next.z += step;
    return normalize(next);
  }

  function style(frame) {
    var next = normalize(frame);
    var css = 'object-position:' + next.x + '% ' + next.y + '%;';
    if (next.z !== 1) css += 'transform:scale(' + next.z + ');transform-origin:' + next.x + '% ' + next.y + '%;';
    return css;
  }

  function apply(img, frame) {
    if (!img) return;
    var next = normalize(frame);
    img.style.objectPosition = next.x + '% ' + next.y + '%';
    img.style.transform = next.z === 1 ? '' : 'scale(' + next.z + ')';
    img.style.transformOrigin = next.x + '% ' + next.y + '%';
  }

  return {
    normalize: normalize,
    pan: pan,
    zoom: zoom,
    style: style,
    apply: apply
  };
});
