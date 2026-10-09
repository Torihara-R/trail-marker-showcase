// 矢印の形の計算。
// 矢印は「始点・制御点・終点」の3点で決まる曲線（2次ベジェ曲線）で表す。制御点が両端の真ん中にあれば直線になる。
//
// 計算は画面上の px で行う。保存している位置は画像に対する割合（0〜1）だが、
// 割合は縦と横で縮尺が違うので、そのままでは距離や角度を正しく計算できない。

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 曲線上の点を返す。t は 0（始点）〜 1（終点）。
export function pointOnCurve(start, control, end, t) {
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  };
}

// 曲線の真ん中が middle を通るような制御点を返す。真ん中のつまみを動かしたときに使う。
export function controlThrough(start, end, middle) {
  return {
    x: 2 * middle.x - (start.x + end.x) / 2,
    y: 2 * middle.y - (start.y + end.y) / 2,
  };
}

export function isStraight(start, control, end, tolerance = 1) {
  return distance(control, midpoint(start, end)) <= tolerance;
}

// 矢じり（三角形）の頂点を [先端, 根元の片側, 根元の反対側] の順で返す。
// 向きは、終点での曲線の進む向きに合わせる。矢印が短すぎて向きが決まらないときは null を返す。
export function arrowHead(start, control, end, size) {
  let direction = { x: end.x - control.x, y: end.y - control.y };
  let length = Math.hypot(direction.x, direction.y);
  if (length < 0.001) {
    // 制御点が終点と重なっているときは、始点から終点への向きを使う。
    direction = { x: end.x - start.x, y: end.y - start.y };
    length = Math.hypot(direction.x, direction.y);
  }
  if (length < 0.001) return null;

  const unit = { x: direction.x / length, y: direction.y / length };
  const base = { x: end.x - unit.x * size, y: end.y - unit.y * size };
  const halfWidth = size * 0.6;
  return [
    { x: end.x, y: end.y },
    { x: base.x - unit.y * halfWidth, y: base.y + unit.x * halfWidth },
    { x: base.x + unit.y * halfWidth, y: base.y - unit.x * halfWidth },
  ];
}

function distanceToSegment(point, a, b) {
  const lengthSquared = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (lengthSquared === 0) return distance(point, a);
  const t = ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / lengthSquared;
  const clamped = Math.min(1, Math.max(0, t));
  return distance(point, { x: a.x + clamped * (b.x - a.x), y: a.y + clamped * (b.y - a.y) });
}

// 点から曲線までのおおよその距離。曲線を短い直線に分けて、いちばん近いものまでの距離を返す。
// タップした場所の近くに矢印があるかを調べるのに使う。
export function distanceToCurve(point, start, control, end, segments = 16) {
  let nearest = Infinity;
  let previous = start;
  for (let index = 1; index <= segments; index += 1) {
    const current = pointOnCurve(start, control, end, index / segments);
    nearest = Math.min(nearest, distanceToSegment(point, previous, current));
    previous = current;
  }
  return nearest;
}

// 保存用の形（割合）から、表示用の形（px）へ。frame は表示している画像の大きさ。
export function arrowToPixels(arrow, frame) {
  return {
    id: arrow.id,
    color: arrow.color,
    scale: arrow.scale ?? 1,
    start: { x: arrow.x1 * frame.width, y: arrow.y1 * frame.height },
    control: { x: arrow.cx * frame.width, y: arrow.cy * frame.height },
    end: { x: arrow.x2 * frame.width, y: arrow.y2 * frame.height },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// 表示用の形（px）から、保存用の形（割合）へ。
// 両端は画像の中に収める。制御点は画像の外に出てもよい（大きく曲げたとき）が、極端な値にはしない。
export function pixelsToArrow({ start, control, end }, frame) {
  return {
    x1: clamp(start.x / frame.width, 0, 1),
    y1: clamp(start.y / frame.height, 0, 1),
    x2: clamp(end.x / frame.width, 0, 1),
    y2: clamp(end.y / frame.height, 0, 1),
    cx: clamp(control.x / frame.width, -1, 2),
    cy: clamp(control.y / frame.height, -1, 2),
  };
}

// id が見つからなければ null。距離が maxDistance 以内で、いちばん近い矢印の id を返す。
export function findArrowNear(point, pixelArrows, maxDistance) {
  let nearestId = null;
  let nearestDistance = maxDistance;
  for (const arrow of pixelArrows) {
    const current = distanceToCurve(point, arrow.start, arrow.control, arrow.end);
    if (current <= nearestDistance) {
      nearestDistance = current;
      nearestId = arrow.id;
    }
  }
  return nearestId;
}
