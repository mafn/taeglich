/** Draw one of twelve tiny, monochrome food icons inside a 40px board cell. */
export function drawFoodIcon(
  ctx: CanvasRenderingContext2D,
  foodType: number,
  gx: number,
  gy: number,
  fg: string,
  bg: string,
) {
  const unit = 2;
  const offset = 4;

  const paint = (px: number, py: number, width = 1, height = 1) => {
    ctx.fillStyle = fg;
    ctx.fillRect(
      gx + offset + px * unit,
      gy + offset + py * unit,
      width * unit,
      height * unit,
    );
  };

  const cutOut = (px: number, py: number, width = 1, height = 1) => {
    ctx.fillStyle = bg;
    ctx.fillRect(
      gx + offset + px * unit,
      gy + offset + py * unit,
      width * unit,
      height * unit,
    );
    ctx.fillStyle = fg;
  };

  ctx.fillStyle = fg;

  switch (foodType) {
    case 0: // Cherry
      paint(2, 10, 6, 6);
      paint(9, 8, 6, 6);
      paint(5, 4, 1, 6);
      paint(12, 4, 1, 4);
      paint(6, 4, 7, 1);
      paint(7, 2, 4, 2);
      break;
    case 1: // Banana
      ctx.save();
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(gx + offset + 10 * unit, gy + offset + unit);
      ctx.quadraticCurveTo(
        gx + offset + 12 * unit,
        gy + offset + 2 * unit,
        gx + offset + 12 * unit,
        gy + offset + 5 * unit,
      );
      ctx.quadraticCurveTo(
        gx + offset + 11 * unit,
        gy + offset + 10 * unit,
        gx + offset + 6 * unit,
        gy + offset + 13 * unit,
      );
      ctx.quadraticCurveTo(
        gx + offset + 2 * unit,
        gy + offset + 14 * unit,
        gx + offset + unit,
        gy + offset + 11 * unit,
      );
      ctx.quadraticCurveTo(
        gx + offset + unit,
        gy + offset + 9 * unit,
        gx + offset + 4 * unit,
        gy + offset + 8 * unit,
      );
      ctx.quadraticCurveTo(
        gx + offset + 7 * unit,
        gy + offset + 7 * unit,
        gx + offset + 8 * unit,
        gy + offset + 3 * unit,
      );
      ctx.quadraticCurveTo(
        gx + offset + 8 * unit,
        gy + offset + unit,
        gx + offset + 10 * unit,
        gy + offset + unit,
      );
      ctx.fill();
      ctx.fillRect(gx + offset + 9 * unit, gy + offset, 2 * unit, 2 * unit);
      ctx.strokeStyle = bg;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(gx + offset + 8 * unit, gy + offset + 4 * unit);
      ctx.quadraticCurveTo(
        gx + offset + 8 * unit,
        gy + offset + 8 * unit,
        gx + offset + 4 * unit,
        gy + offset + 11 * unit,
      );
      ctx.stroke();
      ctx.restore();
      break;
    case 2: // Mushroom
      paint(1, 4, 14, 4);
      paint(2, 8, 12, 2);
      paint(6, 10, 4, 4);
      cutOut(7, 5, 2, 2);
      cutOut(4, 7);
      break;
    case 3: // Apple
      paint(3, 4, 10, 10);
      paint(2, 6, 12, 6);
      paint(7, 1, 2, 3);
      paint(9, 2, 3, 2);
      cutOut(10, 6, 2, 2);
      break;
    case 4: // Pizza
      paint(1, 1, 14, 3);
      paint(2, 4, 12, 2);
      paint(4, 6, 8, 2);
      paint(6, 8, 4, 2);
      paint(7, 10, 2, 2);
      cutOut(4, 4);
      cutOut(10, 5);
      cutOut(7, 7);
      break;
    case 5: // Floppy disk
      paint(1, 1, 14, 14);
      cutOut(3, 2, 10, 6);
      cutOut(4, 10, 8, 4);
      paint(7, 11, 2, 2);
      break;
    case 6: // Spider
      paint(4, 5, 8, 7);
      paint(1, 2, 2, 4);
      paint(13, 2, 2, 4);
      paint(1, 10, 2, 4);
      paint(13, 10, 2, 4);
      paint(3, 4, 2, 2);
      paint(11, 4, 2, 2);
      paint(3, 10, 2, 2);
      paint(11, 10, 2, 2);
      cutOut(6, 7);
      cutOut(9, 7);
      break;
    case 7: // Heart
      paint(3, 3, 4, 3);
      paint(9, 3, 4, 3);
      paint(2, 6, 12, 3);
      paint(4, 9, 8, 3);
      paint(7, 12, 2, 2);
      break;
    case 8: // Coin
      paint(3, 1, 10, 14);
      paint(1, 3, 14, 10);
      cutOut(7, 4, 2, 8);
      break;
    case 9: // Pi
      paint(1, 2, 14, 3);
      paint(4, 5, 2, 10);
      paint(10, 5, 2, 10);
      paint(2, 13, 2, 2);
      break;
    case 10: // Coffee
      paint(2, 5, 10, 9);
      paint(12, 7, 3, 5);
      cutOut(12, 8, 1, 3);
      paint(4, 0, 1, 3);
      paint(7, -1, 1, 4);
      paint(10, 0, 1, 3);
      break;
    case 11: // Ghost
      paint(2, 2, 12, 11);
      paint(2, 13, 3, 2);
      paint(6, 13, 4, 2);
      paint(11, 13, 3, 2);
      cutOut(4, 5, 3, 4);
      cutOut(9, 5, 3, 4);
      break;
  }
}
