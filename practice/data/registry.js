/**
 * Practice unit registry. Load unit*.js first, then this.
 * getUnit(id) returns the pack or null.
 */
window.PracticeRegistry = (function () {
  const map = {
    unit1: () => window.PRACTICE_UNIT1,
    unit2: () => window.PRACTICE_UNIT2,
    unit3: () => window.PRACTICE_UNIT3,
    unit4: () => window.PRACTICE_UNIT4,
    unit5: () => window.PRACTICE_UNIT5,
    unit6: () => window.PRACTICE_UNIT6
  };

  const meta = [
    { id: 'unit1', label: 'Unit 1', tone: 'sunny', ready: true },
    { id: 'unit2', label: 'Unit 2', tone: 'green', ready: true },
    { id: 'unit3', label: 'Unit 3', tone: 'sky', ready: true },
    { id: 'unit4', label: 'Unit 4', tone: 'coral', ready: true },
    { id: 'unit5', label: 'Unit 5', tone: 'coral', ready: true },
    { id: 'unit6', label: 'Unit 6', tone: 'pink', ready: true }
  ];

  function getUnit(id) {
    if (id === 'mixed') return window.PRACTICE_MIXED || null;
    const fn = map[id];
    return fn ? fn() || null : null;
  }

  function listUnits() {
    return meta.map(m => {
      const u = getUnit(m.id);
      const has = u && ((u.fillIn && u.fillIn.length) || (u.matching && u.matching.length) || (u.missingLetters && u.missingLetters.length));
      return Object.assign({}, m, { ready: !!has, title: (u && u.title) || m.label });
    });
  }

  function practiceChoices() {
    return listUnits().concat([{
      id: 'mixed',
      label: 'Mixed topic',
      tone: 'navy',
      ready: true,
      title: 'Mixed topic'
    }]);
  }

  function qsUnit() {
    const q = new URLSearchParams(location.search);
    return q.get('unit') || 'unit1';
  }

  return { getUnit, listUnits, practiceChoices, qsUnit, meta };
})();
