/* Turn a published Boss answer into the option string students pick.
   Arrays are joined with " · " (space, middle dot, space). Strings stay as they are. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BossAnswer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SEP = ' · ';

  function answerKey(answer) {
    if (Array.isArray(answer)) return answer.join(SEP);
    return answer;
  }

  function blankValues(answer) {
    if (answer == null) return null;
    return String(answerKey(answer)).split(SEP);
  }

  function matches(opt, answer) {
    return opt === answerKey(answer);
  }

  return {
    answerKey: answerKey,
    blankValues: blankValues,
    matches: matches
  };
});
