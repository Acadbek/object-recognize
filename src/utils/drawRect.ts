// import { Detection } from "@mediapipe/tasks-vision";

// export const drawRect = (detections: Detection[], ctx: CanvasRenderingContext2D) => {
//   detections.forEach((prediction) => {
//     if (!prediction.boundingBox) return;

//     const { originX, originY, width, height } = prediction.boundingBox;

//     const category = prediction.categories[0];
//     const score = category ? Math.round(category.score * 100) : 0;
//     const label = category ? category.categoryName : "Noma'lum";
//     const text = `${label} ${score}%`;

//     const color = '#00FF00';

//     ctx.strokeStyle = color;
//     ctx.lineWidth = 2;
//     ctx.beginPath();
//     ctx.roundRect(originX, originY, width, height, 10);
//     ctx.stroke();

//     ctx.font = '14px Arial';
//     const textWidth = ctx.measureText(text).width;
//     const textHeight = 14;

//     ctx.fillStyle = color;
//     ctx.fillRect(originX, originY - textHeight - 10, textWidth + 10, textHeight + 10);

//     ctx.fillStyle = 'black';
//     ctx.fillText(text, originX + 5, originY - 10);
//   });
// };

import { Detection } from "@mediapipe/tasks-vision";

export const drawRect = (detections: Detection[], ctx: CanvasRenderingContext2D) => {
  detections.forEach((prediction) => {
    if (!prediction.boundingBox) return;

    const { originX, originY, width, height } = prediction.boundingBox;

    const category = prediction.categories[0];
    let label = category ? category.categoryName.toLowerCase() : "noma'lum";
    let score = category ? Math.round(category.score * 100) : 0;

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

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(originX, originY, width, height, 10);
    ctx.stroke();

    ctx.font = 'bold 30px Arial';
    const textWidth = ctx.measureText(text).width;
    const textHeight = 30;

    ctx.fillStyle = color;
    ctx.fillRect(originX, originY - textHeight - 10, textWidth + 10, textHeight + 10);

    ctx.fillStyle = 'black';
    ctx.fillText(text, originX + 5, originY - 10);
  });
};
