// 画像の縦横比を保ったまま、表示領域に収まる最大の大きさを返す。
export function fitContain(containerWidth, containerHeight, imageWidth, imageHeight) {
  if (!(containerWidth > 0 && containerHeight > 0 && imageWidth > 0 && imageHeight > 0)) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  return { width: imageWidth * scale, height: imageHeight * scale };
}

// 位置の割合を 0〜1 に収める。画像の外に絵文字を置けないようにするため。
export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
