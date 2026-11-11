/* Crop window for a photo. The whole picture stays intact.
   The frame ratio decides which part is shown. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ImgFrame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var MIN_Z = 0.05;
  var MAX_Z = 3;
  var MAX_BLEED = 2;

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
      x: Math.round(clamp(x, -250, 350) * 10) / 10,
      y: Math.round(clamp(y, -250, 350) * 10) / 10,
      z: Math.round(clamp(z, MIN_Z, MAX_Z) * 1000) / 1000,
      bg: hexColor(src.bg)
    };
  }

  function hexColor(value) {
    var text = String(value || '').trim();
    var full = text.match(/^#([0-9a-fA-F]{6})$/);
    if (full) return '#' + full[1].toLowerCase();
    var short = text.match(/^#([0-9a-fA-F]{3})$/);
    if (!short) return '#ffffff';
    return '#' + short[1].split('').map(function (ch) { return ch + ch; }).join('').toLowerCase();
  }

  function maxCrop(imageWidth, imageHeight, ratio) {
    var width = imageWidth > 0 ? imageWidth : 1;
    var height = imageHeight > 0 ? imageHeight : 1;
    var aspect = ratio > 0 ? ratio : 1;
    if (width / height > aspect) return { width: height * aspect, height: height };
    return { width: width, height: width / aspect };
  }

  function containCrop(imageWidth, imageHeight, ratio) {
    var width = imageWidth > 0 ? imageWidth : 1;
    var height = imageHeight > 0 ? imageHeight : 1;
    var aspect = ratio > 0 ? ratio : 1;
    if (width / height > aspect) return { width: width, height: width / aspect };
    return { width: height * aspect, height: height };
  }

  function rect(frame, imageWidth, imageHeight, ratio) {
    var next = normalize(frame);
    var imageW = imageWidth > 0 ? imageWidth : 1;
    var imageH = imageHeight > 0 ? imageHeight : 1;
    var max = maxCrop(imageW, imageH, ratio);
    var width = max.width / next.z;
    var height = max.height / next.z;
    return {
      left: next.x / 100 * imageW - width / 2,
      top: next.y / 100 * imageH - height / 2,
      width: width,
      height: height
    };
  }

  function keepOverlap(left, top, width, height, imageW, imageH) {
    var overlap = Math.max(8, Math.min(width, height, imageW, imageH) * 0.2);
    if (left + width < overlap) left = overlap - width;
    if (top + height < overlap) top = overlap - height;
    if (left > imageW - overlap) left = imageW - overlap;
    if (top > imageH - overlap) top = imageH - overlap;
    return { left: left, top: top, width: width, height: height };
  }

  function frameFromRect(box, imageWidth, imageHeight, ratio, bg) {
    var imageW = imageWidth > 0 ? imageWidth : 1;
    var imageH = imageHeight > 0 ? imageHeight : 1;
    var max = maxCrop(imageW, imageH, ratio);
    return normalize({
      x: (box.left + box.width / 2) / imageW * 100,
      y: (box.top + box.height / 2) / imageH * 100,
      z: max.width / box.width,
      bg: bg
    });
  }

  function viewRect(frame, imageWidth, imageHeight, viewWidth, viewHeight, ratio) {
    var box = rect(frame, imageWidth, imageHeight, ratio);
    var imageW = imageWidth > 0 ? imageWidth : 1;
    var imageH = imageHeight > 0 ? imageHeight : 1;
    return {
      left: box.left / imageW * viewWidth,
      top: box.top / imageH * viewHeight,
      width: box.width / imageW * viewWidth,
      height: box.height / imageH * viewHeight
    };
  }

  function move(frame, dx, dy, imageWidth, imageHeight, viewWidth, viewHeight, ratio) {
    var box = rect(frame, imageWidth, imageHeight, ratio);
    var imageW = imageWidth > 0 ? imageWidth : 1;
    var imageH = imageHeight > 0 ? imageHeight : 1;
    var left = box.left + dx * imageW / viewWidth;
    var top = box.top + dy * imageH / viewHeight;
    var kept = keepOverlap(left, top, box.width, box.height, imageW, imageH);
    return frameFromRect(kept, imageW, imageH, ratio, normalize(frame).bg);
  }

  function resize(frame, corner, dx, dy, imageWidth, imageHeight, viewWidth, viewHeight, ratio) {
    var box = rect(frame, imageWidth, imageHeight, ratio);
    var imageW = imageWidth > 0 ? imageWidth : 1;
    var imageH = imageHeight > 0 ? imageHeight : 1;
    var aspect = ratio > 0 ? ratio : 1;
    var ix = dx * imageW / viewWidth;
    var iy = dy * imageH / viewHeight;
    var left = box.left;
    var top = box.top;
    var right = left + box.width;
    var bottom = top + box.height;
    var ax = corner === 'se' || corner === 'ne' ? left : right;
    var ay = corner === 'se' || corner === 'sw' ? top : bottom;
    var px = (corner === 'se' || corner === 'ne' ? right : left) + ix;
    var py = (corner === 'se' || corner === 'sw' ? bottom : top) + iy;
    var rawW = Math.abs(px - ax);
    var rawH = Math.abs(py - ay);
    var width = rawW;
    var height = width / aspect;
    if (rawH > height) {
      height = rawH;
      width = height * aspect;
    }
    var max = maxCrop(imageW, imageH, aspect);
    var contain = containCrop(imageW, imageH, aspect);
    var minW = max.width / MAX_Z;
    var maxW = contain.width * MAX_BLEED;
    if (width < minW) {
      width = minW;
      height = width / aspect;
    }
    if (width > maxW) {
      width = maxW;
      height = width / aspect;
    }
    var nextLeft = corner === 'se' || corner === 'ne' ? ax : ax - width;
    var nextTop = corner === 'se' || corner === 'sw' ? ay : ay - height;
    var kept = keepOverlap(nextLeft, nextTop, width, height, imageW, imageH);
    return frameFromRect(kept, imageW, imageH, aspect, normalize(frame).bg);
  }

  function placement(frame, imageWidth, imageHeight, ratio) {
    var box = rect(frame, imageWidth, imageHeight, ratio);
    return {
      left: -box.left / box.width * 100,
      top: -box.top / box.height * 100,
      width: imageWidth / box.width * 100,
      height: imageHeight / box.height * 100
    };
  }

  function ensureCss() {
    if (typeof document === 'undefined' || document.getElementById('img-frame-css')) return;
    var style = document.createElement('style');
    style.id = 'img-frame-css';
    style.textContent = [
      '.img-crop{position:relative;display:block;width:100%;max-width:100%;overflow:hidden;aspect-ratio:var(--img-crop-ratio,1);}',
      '.lightbox .img-crop{width:min(70vh,920px);background:#fffaf3;border-radius:16px;}',
      '.mcard-photo{height:48%;flex:1 1 auto;border-radius:12px;}',
      '.illust img.is-cropped,.img-crop img.is-cropped,.story-panel-art img.is-cropped,.illust.chat-hero img.is-cropped,.mcard-photo img.is-cropped,.studio-thumb-preview img.is-cropped{',
      'position:absolute !important;inset:auto !important;left:var(--crop-left) !important;top:var(--crop-top) !important;',
      'width:var(--crop-width) !important;height:var(--crop-height) !important;max-width:none !important;max-height:none !important;',
      'object-fit:fill !important;object-position:center !important;transform:none !important;} '
    ].join('');
    document.head.appendChild(style);
  }

  function hostFor(img, ratio) {
    var parent = img.parentElement;
    var aspect = ratio > 0 ? ratio : 1;
    if (!parent) return { box: null, ratio: aspect };
    if (parent.classList.contains('img-crop') || parent.classList.contains('mcard-photo') || parent.classList.contains('studio-thumb-preview')) {
      return { box: parent, ratio: aspect };
    }
    if (parent.classList.contains('illust') && parent.closest && parent.closest('.card')) {
      return { box: parent, ratio: 1 };
    }
    if (parent.classList.contains('lightbox')) {
      var box = document.createElement('div');
      box.className = 'img-crop';
      box.style.setProperty('--img-crop-ratio', '1');
      parent.insertBefore(box, img);
      box.appendChild(img);
      return { box: box, ratio: 1 };
    }
    parent.style.setProperty('position', 'relative', 'important');
    parent.style.setProperty('overflow', 'hidden', 'important');
    parent.style.setProperty('width', 'min(100%, 640px)', 'important');
    parent.style.setProperty('aspect-ratio', String(aspect), 'important');
    return { box: parent, ratio: aspect };
  }

  function paint(img, frame, ratio) {
    var host = hostFor(img, ratio);
    var useRatio = host.ratio;
    var plain = normalize(frame);
    if (host.box) host.box.style.background = plain.bg;
    if (host.box && host.box.classList.contains('cutout')) {
      if (plain.x === 50 && plain.y === 50 && plain.z === 1 && plain.bg === '#ffffff') return;
    }
    function place() {
      var iw = img.naturalWidth;
      var ih = img.naturalHeight;
      if (!iw || !ih) return;
      var spot = placement(frame, iw, ih, useRatio);
      img.classList.add('is-cropped');
      img.style.setProperty('--crop-left', spot.left + '%');
      img.style.setProperty('--crop-top', spot.top + '%');
      img.style.setProperty('--crop-width', spot.width + '%');
      img.style.setProperty('--crop-height', spot.height + '%');
    }
    if (img.naturalWidth) place();
    else img.addEventListener('load', place, { once: true });
  }

  function apply(img, frame, ratio) {
    if (!img) return;
    var parent = img.parentElement;
    if (!(ratio > 0)) {
      if (parent && (parent.classList.contains('lightbox') || (parent.classList.contains('illust') && parent.closest && parent.closest('.card')))) ratio = 1;
      else if (parent && parent.classList.contains('mcard-photo')) ratio = 180 / 140;
      else ratio = 320 / 220;
    }
    ensureCss();
    paint(img, frame, ratio);
  }

  return {
    normalize: normalize,
    rect: rect,
    frameFromRect: frameFromRect,
    viewRect: viewRect,
    move: move,
    resize: resize,
    placement: placement,
    apply: apply
  };
});
