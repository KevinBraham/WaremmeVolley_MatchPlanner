export function formatUserName(profile?: {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
} | null, fallback: string = 'Utilisateur'): string {
  if (!profile) return fallback;
  const parts: string[] = [];
  if (profile.first_name) parts.push(profile.first_name);
  if (profile.last_name) parts.push(profile.last_name);
  if (parts.length > 0) {
    return parts.join(' ').trim();
  }
  if (profile.display_name) {
    return profile.display_name;
  }
  return fallback;
}

export function deriveNamesFromEmail(email: string | null | undefined) {
  if (!email) {
    return {
      display_name: null as string | null,
      first_name: null as string | null,
      last_name: null as string | null,
    };
  }

  const localPart = email.split('@')[0] || '';
  const separators = /[._-]+/g;
  const tokens = localPart
    .replace(separators, ' ')
    .replace(/([a-z])/g, (match) => match.toUpperCase())
    .split(' ')
    .filter(Boolean);

  let first_name: string | null = null;
  let last_name: string | null = null;

  if (tokens.length === 1) {
    first_name = tokens[0];
  } else if (tokens.length >= 2) {
    first_name = tokens[0];
    last_name = tokens.slice(1).join(' ');
  }

  const display_name = tokens.length > 0 ? tokens.join(' ') : localPart;

  return {
    display_name: display_name || null,
    first_name,
    last_name,
  };
}
