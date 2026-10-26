import { z } from 'zod';
export const rawRowSchema = z.record(z.string(), z.string());
export const HEADERS = [
  'Game ID',
  'Team ID',
  'OS',
  'Position',
  'AN built time',
  'AN Type',
  'Other positions covered',
  'Front situation upon AN build',
  'Nuke built',
  'First Nuke ready',
  'First Nuke launch',
  'Num nukes launched',
  'Positions targeted',
  'Game duration',
  'Replay name',
  'Notes',
] as const;
export const REQUIRED_HEADERS = ['Game ID', 'OS', 'Position', 'AN built time'];
