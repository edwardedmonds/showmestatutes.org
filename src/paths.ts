/** Keep the exact section identifier, including letters and compound numbering. */
export const statutePath = (section: string) => `/statutes/${encodeURIComponent(section)}/`;
export const statuteVersionPath = (section: string, id: string) => `${statutePath(section)}#version-${encodeURIComponent(id)}`;
