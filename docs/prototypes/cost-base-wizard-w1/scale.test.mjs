import test from 'node:test';
import assert from 'node:assert/strict';
import { hasContinuousScale, positionOf, valueAt, selectPosition, optionalManual } from './scale.mjs';

const statistics={minimum:10,central:20,maximum:50}; // Geometry fixture, not market evidence.
test('asymmetric average is always the centre',()=>{
  assert.equal(positionOf(10,statistics),0);assert.equal(positionOf(20,statistics),50);assert.equal(positionOf(50,statistics),100);
});
test('MARKSMAN can sit left, centre or right independently',()=>{
  assert.equal(positionOf(15,statistics),25);assert.equal(positionOf(20,statistics),50);assert.equal(positionOf(35,statistics),75);
});
test('positions interpolate both halves, round trip and preserve anchors',()=>{
  for(let p=0;p<=100;p++)assert.ok(Math.abs(positionOf(valueAt(p,statistics),statistics)-p)<1e-10);
  assert.equal(valueAt(25,statistics),15);assert.equal(valueAt(75,statistics),35);
});
test('missing extrema are never inferred',()=>{
  const partial={minimum:null,central:27,maximum:null};
  assert.equal(hasContinuousScale(partial),false);assert.equal(valueAt(25,partial),null);
  assert.equal(positionOf(27,partial),50);assert.equal(positionOf(25,partial),null);
});
test('single missing bound only locates known anchors',()=>{
  const partial={minimum:10,central:20,maximum:null};
  assert.equal(positionOf(10,partial),0);assert.equal(positionOf(15,partial),null);
});
test('invalid or degenerate data cannot create a continuous market range',()=>{
  for(const stats of [{minimum:20,central:20,maximum:50},{minimum:50,central:20,maximum:10},
    {minimum:0,central:NaN,maximum:50},{minimum:0,central:20,maximum:Infinity}])assert.equal(hasContinuousScale(stats),false);
});
test('outside values are not visually clamped into a market position',()=>{
  assert.equal(positionOf(5,statistics),null);assert.equal(positionOf(55,statistics),null);
  for(const position of [-1,101,NaN,Infinity])assert.equal(valueAt(position,statistics),null);
});
test('positions save presets or user estimates without fabricating statistics',()=>{
  const card={statistics,standard:{value:15}};
  assert.equal(selectPosition(0,card).mode,'LOW');assert.equal(selectPosition(50,card).mode,'CENTRAL');
  assert.equal(selectPosition(100,card).mode,'HIGH');assert.equal(selectPosition(25,card).mode,'MARKSMAN');
  assert.deepEqual(selectPosition(75,card),{mode:'MANUAL',value:35,provisionalAccepted:false});
});
test('unavailable scale has no selectable interpolated value',()=>{
  assert.equal(selectPosition(25,{statistics:{minimum:null,central:27,maximum:null},standard:{value:27}}),null);
});
test('blank optional manual field restores exact reference and acceptance',()=>{
  const anchor={mode:'MARKSMAN',value:5.955/3.785411784,provisionalAccepted:true};
  assert.deepEqual(optionalManual('',anchor),anchor);assert.deepEqual(optionalManual('  ',anchor),anchor);
  assert.notEqual(optionalManual('',anchor),anchor);
});
test('manual input does not round the exact amount or mutate its anchor',()=>{
  const anchor={mode:'CENTRAL',value:20,provisionalAccepted:true};
  assert.deepEqual(optionalManual('35.123456789',anchor),{mode:'MANUAL',value:35.123456789,provisionalAccepted:false});
  assert.equal(anchor.value,20);assert.equal(optionalManual('',anchor).mode,'CENTRAL');
});
test('invalid and negative manual data remain invalid for the existing server guard',()=>{
  assert.ok(Number.isNaN(optionalManual('invalid',{value:20}).value));
  assert.equal(optionalManual('-1',{value:20}).value,-1);assert.equal(optionalManual('0',{value:20}).value,0);
});
