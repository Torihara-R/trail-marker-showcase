// 吹き出しを出す位置を決める。計算は画面上の px で行う。
//
// anchor は絵文字の中心。gap は絵文字の中心から吹き出しの端までの距離。margin は地図の端との間に空ける余白。
// 基本は絵文字の真上に出す。上に入りきらず、下なら入るときだけ、真下に出す。
// 左右は、絵文字の真ん中に合わせたうえで、地図からはみ出さないように寄せる。
export function placeBubble({
  anchorX,
  anchorY,
  bubbleWidth,
  bubbleHeight,
  frameWidth,
  frameHeight,
  gap,
  margin,
}) {
  const fitsAbove = anchorY - gap - bubbleHeight >= margin;
  const fitsBelow = anchorY + gap + bubbleHeight <= frameHeight - margin;
  const placement = !fitsAbove && fitsBelow ? 'below' : 'above';
  const top = placement === 'above' ? anchorY - gap - bubbleHeight : anchorY + gap;

  // 吹き出しが地図より広いときは、左端に合わせる。
  const maxLeft = Math.max(margin, frameWidth - margin - bubbleWidth);
  const left = Math.min(maxLeft, Math.max(margin, anchorX - bubbleWidth / 2));

  return { placement, left, top };
}

// 吹き出しのしっぽ（絵文字を指す三角）を、吹き出しの左端から何 px の位置に出すかを返す。
// 絵文字の真上（真下）に来るようにするが、吹き出しの角からは inset だけ内側に収める。
export function tailOffset({ anchorX, bubbleLeft, bubbleWidth, inset }) {
  return Math.min(Math.max(inset, bubbleWidth - inset), Math.max(inset, anchorX - bubbleLeft));
}
