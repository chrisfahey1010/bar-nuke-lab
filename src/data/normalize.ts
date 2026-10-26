export const ROLES = ['Air', 'Tech', 'Geo', 'Pond', 'Sea geo', 'Sea beach', 'Front1', 'Front2'];
export const AN_TYPES = ['Citadel', 'Umbrella', 'Oasis'];
function display(raw: string, allowed: string[]) {
  return (
    allowed.find((v) => v.toLowerCase() === raw.trim().replace(/\s+/g, ' ').toLowerCase()) ?? raw
  );
}
export const normalizeRole = (raw: string) => display(raw, ROLES);
export const normalizeType = (raw: string) => display(raw, AN_TYPES);
export const roleList = (raw: string) =>
  raw.trim() === '' ? [] : raw.split(/[,;]/).map(normalizeRole);
