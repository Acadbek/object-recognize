import { Detection } from "@mediapipe/tasks-vision";

export const drawRect = (detections: Detection[], ctx: CanvasRenderingContext2D) => {
  detections.forEach((prediction) => {
    if (!prediction.boundingBox) return;

    const { originX, originY, width, height } = prediction.boundingBox;
    const category = prediction.categories[0];
    let label = category ? category.categoryName.toLowerCase() : "noma'lum";
    let score = category ? Math.round(category.score * 100) : 0;

    // Kategoriyalarni tarjima qilish
    const mapping: { [key: string]: string } = {
      'surfboard': 'Suv idishi',
      'handbag': 'Suv idishi',
      'suitcase': 'Suv idishi',
      'backpack': 'Suv idishi',
      'person': 'Odam',
      'potted plant': 'Idishdagi gul'
    };

    if (mapping[label]) {
      label = mapping[label];
    }

    const text = `${label} ${score}%`;
    const color = label === 'Suv idishi' ? '#00BFFF' : '#00FF00';

    // To'rtburchak chizish
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(originX, originY, width, height, 10);
    ctx.stroke();

    // KATTA FONT
    const fontSize = 42; // 30px dan 42px ga oshirildi
    ctx.font = `bold ${fontSize}px Arial`;

    const textWidth = ctx.measureText(text).width;
    const textHeight = fontSize;
    const padding = 12;

    // Matn foni
    ctx.fillStyle = color;
    ctx.fillRect(
      originX,
      originY - textHeight - padding * 2,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Matn
    ctx.fillStyle = 'black';
    ctx.fillText(text, originX + padding, originY - padding);
  });
};
