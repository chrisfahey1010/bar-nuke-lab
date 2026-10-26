export const AN_AMMO_DELAY_SECONDS = 90;
export const EXPECTED_ROSTER_SIZE = 16;
export const UNKNOWN_GAME_DURATION_SECONDS = 1800;
// User-confirmed correction, scoped to one game and exact Sheet export token.
export const GAME_DURATION_CORRECTIONS: Record<
  string,
  { sourceToken: string; correctedToken: string }
> = {
  '7': { sourceToken: '29:03:00', correctedToken: '29:03' },
};
