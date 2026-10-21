/* Shuffle-only carousel playback: fixed cover on first load, fair random rounds thereafter. */
(function (root) {
  'use strict';

  function shuffleIndices(indices, random, avoidFirst) {
    const result = [...indices];
    for (let i = result.length - 1; i > 0; i--) {
      const value = Math.max(0, Math.min(0.999999999999, Number(random())));
      const j = Math.floor(value * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    // Avoid showing the same photo back-to-back across two shuffled rounds.
    if (result.length > 1 && result[0] === avoidFirst) {
      [result[0], result[1]] = [result[1], result[0]];
    }
    return result;
  }

  function createPlaybackOrder(count, hasPinnedCover, random = Math.random) {
    if (!Number.isInteger(count) || count < 1) throw new Error('Carousel needs at least one image');
    const eligible = Array.from({ length: count }, (_, i) => i).filter((i) => !(hasPinnedCover && i === 0));
    let pending = shuffleIndices(eligible, random);
    let offset = 0;
    const first = hasPinnedCover ? 0 : pending[offset++];
    let history = [first];
    let cursor = 0;

    function current() { return history[cursor]; }
    function next() {
      if (cursor < history.length - 1) return history[++cursor];
      if (!eligible.length) return current();
      if (offset >= pending.length) {
        pending = shuffleIndices(eligible, random, current());
        offset = 0;
      }
      const result = pending[offset++];
      history.push(result);
      cursor++;
      // Keep a bounded history while preserving backwards navigation.
      if (history.length > 1000) {
        history.shift();
        cursor--;
      }
      return result;
    }
    function previous() { return cursor > 0 ? history[--cursor] : current(); }
    function peekNext() {
      if (cursor < history.length - 1) return history[cursor + 1];
      return offset < pending.length ? pending[offset] : null;
    }
    return { current, next, previous, peekNext };
  }

  const api = { shuffleIndices, createPlaybackOrder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PassionHeroPlayback = api;
})(typeof window !== 'undefined' ? window : undefined);
