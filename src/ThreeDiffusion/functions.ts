export const scaledSigmoid = (x: number, scale: number) =>
  scale / (1 + Math.exp(-x) * scale);

export const pseudoRandom = (pointIdx: number, step: number) => {
  // https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
  return (Math.sin(pointIdx * 12.9898 + step * 78.233) * 43758.5453) % 1;
};

export const periodNormalize = (num: number, mod: number) => {
  return ((num % mod) + mod) % mod;
};

export const getDifferences = (array: number[]) =>
  array.slice(1).map((val, i) => val - array[i]);
