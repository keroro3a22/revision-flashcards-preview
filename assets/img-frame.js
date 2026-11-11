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
      z: Math.round(clamp(z, 0.5, 3) * 1000) / 1000
    };
  }

  function pan(frame, dx, dy, box) {
    var next = normalize(frame);
    var width = box && box.width > 0 ? box.width : 1;
    var height = box && box.height > 0 ? box.height : 1;
    var reach = Math.abs(next.z - 1);
    var zoom = reach === 0 ? 1 : reach;
    next.x -= (dx / width) * 100 / zoom;
    next.y -= (dy / height) * 100 / zoom;
    return normalize(next);
  }

  function zoom(frame, step) {
    var next = normalize(frame);
    next.z += step;
    return normalize(next);
  }

  function zoomShift(frame) {
    if (frame.z === 1) return { x: 0, y: 0 };
    var reach = Math.abs(frame.z - 1) * 50;
    return {
      x: Math.round((50 - frame.x) / 50 * reach * 100) / 100,
      y: Math.round((50 - frame.y) / 50 * reach * 100) / 100
    };
  }

  function transformCss(frame) {
    var shift = zoomShift(frame);
    var move = shift.x || shift.y ? 'translate(' + shift.x + '%,' + shift.y + '%) ' : '';
    return move + 'scale(' + frame.z + ')';
  }

  function style(frame) {
    var next = normalize(frame);
    var css = 'object-position:' + next.x + '% ' + next.y + '%;';
    if (next.z !== 1) css += 'transform:' + transformCss(next) + ';transform-origin:center center;';
    return css;
  }

  function apply(img, frame) {
    if (!img) return;
    var next = normalize(frame);
    img.style.objectPosition = next.x + '% ' + next.y + '%';
    img.style.transformOrigin = 'center center';
    img.style.transform = next.z === 1 ? '' : transformCss(next);
  }

  return {
    normalize: normalize,
    pan: pan,
    zoom: zoom,
    style: style,
    apply: apply
  };
});
