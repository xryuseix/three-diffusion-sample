export const scaledSigmoid = (x: number, scale: number) =>
  scale / (1 + Math.exp(-x) * scale);

export const pseudoRandom = (pointIdx: number, count: number) => {
  // https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
  return (Math.sin(pointIdx * 12.9898 + count * 78.233) * 43758.5453) % 1;
};
