/**
 * Calibrated ADC ranges for each flex sensor.
 * Min = resting (straight finger), Max = fully flexed.
 * Update these values after each calibration pass with the physical hardware.
 */
export const FLEX_RANGES = {
  ring: { min: 3900, max: 5200 },
  middle: { min: 6000, max: 10000 },
  index: { min: 3000, max: 5300 },
  thumb: { min: 4500, max: 9100 },
} as const;
