import { pulse, smooth } from "./SanguineEclipseConfig";
export class SanguineTimeline {
  age = 0;
  hand = 0;
  field = 0;
  ascension = 0;
  eclipse = 0;
  formation = 0;
  compression = 0;
  execution = 0;
  impact = 0;
  residue = 0;
  dissolve = 0;
  advance(delta: number): void {
    this.age += Math.max(0, delta);
    this.sample();
  }
  sample(): void {
    const t = this.age;
    this.hand = pulse(0, 0.3, 1.2, 2, t);
    this.field = pulse(0.8, 1.6, 13.2, 15.2, t);
    this.ascension = pulse(1.3, 2.9, 5.2, 6.7, t);
    this.eclipse = pulse(2.4, 4.0, 9.1, 10.2, t);
    this.formation = smooth(4.5, 5.8, t);
    this.compression = smooth(8.1, 9.35, t);
    this.execution = pulse(9.2, 9.55, 10.15, 10.65, t);
    this.impact = pulse(10.1, 10.22, 11.7, 12.9, t);
    this.residue = pulse(10.2, 11, 14.5, 16, t);
    this.dissolve = smooth(12.5, 15.7, t);
  }
}
export function sanguineStage(t: number): string {
  return t < 1.3
    ? "AWAKENING"
    : t < 2.4
      ? "ASCENSION"
      : t < 4.5
        ? "ECLIPSE FORMATION"
        : t < 6
          ? "LANCE FORMATION"
          : t < 8.2
            ? "BARRAGE"
            : t < 9.2
              ? "COMPRESSION"
              : t < 10.1
                ? "EXECUTION"
                : t < 12.5
                  ? "LIQUID IMPACT"
                  : "AFTERMATH";
}
