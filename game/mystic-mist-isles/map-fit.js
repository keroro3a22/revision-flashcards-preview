/* How the campus painting sits in the area under the header.
   The safe rectangle is every painted label, including the title.
   Scale up until that rectangle fills the stage, and let the rest of
   the painting crop. If a tall phone cannot cover without cutting a
   label, stop there and allow a cream band. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MMIMapFit = api;
})(typeof window !== 'undefined' ? window : this, function () {
  var IMG_W = 2752;
  var IMG_H = 1536;
  var SAFE = { x: 0.10, y: 0.125, w: 0.885, h: 0.875 };

  function place(stage, board, origin, end) {
    if (!(stage > 0) || !(board > 0)) return 0;
    if (board + 0.5 >= stage) {
      var minL = Math.max(-origin * board, stage - board);
      var maxL = Math.min(stage - end * board, 0);
      if (minL > maxL) {
        minL = -origin * board;
        maxL = stage - end * board;
      }
      var safeSize = (end - origin) * board;
      var ideal = (stage - safeSize) / 2 - origin * board;
      if (ideal < minL) return minL;
      if (ideal > maxL) return maxL;
      return ideal;
    }
    return (stage - board) / 2;
  }

  function fit(stageW, stageH) {
    var scale = Math.min(stageW / (SAFE.w * IMG_W), stageH / (SAFE.h * IMG_H));
    if (!isFinite(scale) || scale < 0) scale = 0;
    var width = scale * IMG_W;
    var height = scale * IMG_H;
    return {
      width: width,
      height: height,
      left: place(stageW, width, SAFE.x, SAFE.x + SAFE.w),
      top: place(stageH, height, SAFE.y, SAFE.y + SAFE.h)
    };
  }

  return { IMG_W: IMG_W, IMG_H: IMG_H, SAFE: SAFE, fit: fit };
});
