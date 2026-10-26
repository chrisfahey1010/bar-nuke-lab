import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSheet } from '../../src/data/sheetAdapter';
test('maps the live 16-header snapshot by name and retains every nonempty row and note', () => {
  const d = parseSheet(readFileSync('data/acquisitions/sheet.csv', 'utf8'));
  expect(d.headers).toHaveLength(16);
  expect(d.rows).toHaveLength(67);
  expect(new Set(d.rows.map((r: any) => r.gameId)).size).toBe(7);
  const salvo = d.rows.find((r: any) => r.raw['First Nuke launch'] === '20:30')!;
  expect(salvo.raw['Positions targeted']).toBe('Tech, air');
  expect(salvo.raw.Notes).toBe('Double nuke on tech + air won game, instant surrender');
  expect(salvo.ref).toBe('Sheet1!A37:P37');
  expect(salvo.teamId).toBe('2');
  expect(d.rows.find((r: any) => r.raw.OS === '-1')!.unranked).toBe(true);
  expect(d.rows.find((r: any) => r.raw.OS === '0')!.os).toBe(0);
  expect(d.rows.find((r: any) => r.raw['Team ID'] === '')!.teamId).toBeNull();
});
test('degrades optional capabilities without dropping invalid or unknown records', () => {
  const d = parseSheet(
    'Position,AN built time,OS,Game ID,Notes\n air ,11:18,0,001,literal note\nTech,,-1,002,second\nGeo,?,bad,002,invalid OS\n,,,,\n',
  );
  expect(d.rows).toHaveLength(3);
  expect(d.rows[0].role).toBe('Air');
  expect(d.rows[0].raw.Position).toBe(' air ');
  expect(d.rows[0].gameId).toBe('001');
  expect(d.missingOptional).toContain('Team ID');
  expect(d.rows[2].os).toBeNull();
  expect(d.rows[2].issues.some((i: any) => i.field === 'OS')).toBe(true);
  expect(d.rows[0].ref).toBe('Sheet1!A2:E2');
});
test('retained extra-cell labels cannot overwrite a literal source header', () => {
  const dataset = parseSheet(
    'Game ID,OS,Position,AN built time,_extra_1\n1,20,Tech,11:18,source field\n1,10,Air,,other source field,overflow value',
  );
  expect(dataset.rows[1].raw._extra_1).toBe('other source field');
  expect(dataset.rows[1].raw.retained__extra_1).toBe('overflow value');
});
