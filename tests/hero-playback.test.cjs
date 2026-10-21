'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlaybackOrder, shuffleIndices } = require('../hero-playback.js');
const rng = () => 0.13;

test('cover first, then 45 photos each once per round', () => {
  const flow = createPlaybackOrder(46, true, rng);
  assert.equal(flow.current(), 0);
  const firstRound = Array.from({ length: 45 }, () => flow.next());
  assert.equal(new Set(firstRound).size, 45);
  assert.deepEqual([...firstRound].sort((a,b)=>a-b), Array.from({ length: 45 }, (_,i)=>i+1));
  const secondRound = Array.from({ length: 45 }, () => flow.next());
  assert.equal(new Set(secondRound).size, 45);
  assert.ok(secondRound.every(i=>i!==0));
  assert.notEqual(firstRound.at(-1), secondRound[0]);
});
test('without cover all photos are randomized every round', () => {
  const flow = createPlaybackOrder(7, false, rng);
  const firstRound = [flow.current(), ...Array.from({length:6},()=>flow.next())];
  assert.equal(new Set(firstRound).size,7);
  const secondRound = Array.from({length:7},()=>flow.next());
  assert.equal(new Set(secondRound).size,7);
  assert.notEqual(firstRound[6],secondRound[0]);
});
test('arrows traverse actual playback history', () => {
  const flow = createPlaybackOrder(8,true,rng);
  const a=flow.next(), b=flow.next();
  assert.equal(flow.previous(),a);
  assert.equal(flow.previous(),0);
  assert.equal(flow.next(),a);
  assert.equal(flow.next(),b);
  assert.notEqual(a,b);
});
test('single slide and cover plus one photo stay valid', () => {
  const one=createPlaybackOrder(1,true,rng);
  assert.equal(one.next(),0);
  assert.equal(one.previous(),0);
  const two=createPlaybackOrder(2,true,rng);
  assert.equal(two.current(),0);
  assert.equal(two.next(),1);
  assert.equal(two.next(),1);
});
test('peekNext does not consume the next photo', () => {
  const flow=createPlaybackOrder(10,true,rng);
  const candidate=flow.peekNext();
  assert.equal(flow.peekNext(),candidate);
  assert.equal(flow.next(),candidate);
});
test('Fisher-Yates produces permutation and avoids boundary repeat', () => {
  const shuffled=shuffleIndices([1,2,3,4],rng);
  assert.deepEqual([...shuffled].sort((a,b)=>a-b),[1,2,3,4]);
  const reshuffled=shuffleIndices([1,2,3,4],rng,shuffled[0]);
  assert.notEqual(reshuffled[0],shuffled[0]);
});
