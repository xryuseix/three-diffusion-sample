import seedrandom from "seedrandom";

export const scaledSigmoid = (x: number, scale: number) =>
  scale / (1 + Math.exp(-x) * scale);

export const random = (seed?: string) => {
  if (typeof seed === "undefined") {
    return Math.random();
  } else {
    const rng = seedrandom(seed);
    return rng();
  }
};
