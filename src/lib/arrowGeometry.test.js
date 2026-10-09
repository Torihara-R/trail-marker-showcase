import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  arrowHead,
  arrowToPixels,
  controlThrough,
  distanceToCurve,
  findArrowNear,
  isStraight,
  midpoint,
  pixelsToArrow,
  pointOnCurve,
} from './arrowGeometry.js';

const EPSILON = 1e-9;

function assertPointClose(actual, expected) {
  assert.ok(Math.abs(actual.x - expected.x) < EPSILON, `x: ${actual.x} != ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < EPSILON, `y: ${actual.y} != ${expected.y}`);
}

test('pointOnCurve: 両端では始点と終点に一致する', () => {
  const start = { x: 0, y: 0 };
  const control = { x: 50, y: 100 };
  const end = { x: 100, y: 0 };
  assertPointClose(pointOnCurve(start, control, end, 0), start);
  assertPointClose(pointOnCurve(start, control, end, 1), end);
  assertPointClose(pointOnCurve(start, control, end, 0.5), { x: 50, y: 50 });
});

test('controlThrough: 求めた制御点で曲線の真ん中が指定の点を通る', () => {
  const start = { x: 10, y: 20 };
  const end = { x: 110, y: 40 };
  const middle = { x: 70, y: 90 };
  const control = controlThrough(start, end, middle);
  assertPointClose(pointOnCurve(start, control, end, 0.5), middle);
});

test('isStraight: 制御点が両端の真ん中なら直線', () => {
  const start = { x: 0, y: 0 };
  const end = { x: 100, y: 40 };
  assert.equal(isStraight(start, midpoint(start, end), end), true);
  assert.equal(isStraight(start, { x: 50, y: 60 }, end), false);
});

test('arrowHead: 右向きの直線では先端が終点、根元が左側に来る', () => {
  const start = { x: 0, y: 0 };
  const end = { x: 100, y: 0 };
  const [tip, left, right] = arrowHead(start, midpoint(start, end), end, 10);
  assertPointClose(tip, end);
  assertPointClose(left, { x: 90, y: 6 });
  assertPointClose(right, { x: 90, y: -6 });
});

test('arrowHead: 曲線では終点での進む向きに合わせる', () => {
  // 制御点が終点の真上にあるので、終点では真下へ進む。
  const [tip, a, b] = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, 10);
  assertPointClose(tip, { x: 100, y: 100 });
  assert.ok(Math.abs(a.y - 90) < EPSILON && Math.abs(b.y - 90) < EPSILON);
});

test('arrowHead: 制御点が終点と重なるときは始点からの向きを使い、長さが無ければ null', () => {
  const head = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 0 }, 10);
  assertPointClose(head[0], { x: 100, y: 0 });
  assert.equal(arrowHead({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, 10), null);
});

test('distanceToCurve: 直線までの距離を返す', () => {
  const start = { x: 0, y: 0 };
  const end = { x: 100, y: 0 };
  const control = midpoint(start, end);
  assert.ok(Math.abs(distanceToCurve({ x: 50, y: 12 }, start, control, end) - 12) < 1e-6);
  assert.ok(Math.abs(distanceToCurve({ x: 130, y: 0 }, start, control, end) - 30) < 1e-6);
});

test('arrowToPixels と pixelsToArrow: 行って戻ると元の値になる', () => {
  const frame = { width: 400, height: 200 };
  const arrow = { id: 7, color: '#E53935', x1: 0.1, y1: 0.2, x2: 0.9, y2: 0.8, cx: 0.5, cy: 1.2 };
  const pixels = arrowToPixels(arrow, frame);
  assertPointClose(pixels.start, { x: 40, y: 40 });
  assertPointClose(pixels.control, { x: 200, y: 240 });
  const back = pixelsToArrow(pixels, frame);
  for (const key of ['x1', 'y1', 'x2', 'y2', 'cx', 'cy']) {
    assert.ok(Math.abs(back[key] - arrow[key]) < EPSILON, key);
  }
});

test('pixelsToArrow: 両端を画像の中に収める', () => {
  const frame = { width: 100, height: 100 };
  const result = pixelsToArrow(
    { start: { x: -20, y: 50 }, control: { x: 50, y: 50 }, end: { x: 140, y: 50 } },
    frame
  );
  assert.equal(result.x1, 0);
  assert.equal(result.x2, 1);
});

test('findArrowNear: 近い矢印の id を返し、遠ければ null', () => {
  const arrows = [
    { id: 1, start: { x: 0, y: 0 }, control: { x: 50, y: 0 }, end: { x: 100, y: 0 } },
    { id: 2, start: { x: 0, y: 100 }, control: { x: 50, y: 100 }, end: { x: 100, y: 100 } },
  ];
  assert.equal(findArrowNear({ x: 50, y: 8 }, arrows, 20), 1);
  assert.equal(findArrowNear({ x: 50, y: 95 }, arrows, 20), 2);
  assert.equal(findArrowNear({ x: 50, y: 50 }, arrows, 20), null);
});
