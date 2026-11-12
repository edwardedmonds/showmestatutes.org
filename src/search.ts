import MiniSearch from 'minisearch';
import aliasData from '../data/aliases.json';
import { chapterPolicy, isEffective, validDate, type Statute } from './data';

const aliases = aliasData.sections as Record<string, string[]>;
const topics = aliasData.topics as Record<string, string[]>;
const related = aliasData.related as Record<string, string[]>;
const stop = new Set(['a', 'an', 'the', 'in', 'of', 'for', 'to', 'and', 'rsmo', 'section', 'missouri']);
const degreeNames: Record<string, string> = { '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth' };
const degrees = ['first', 'second', 'third', 'fourth'];
const procedureWords = ['procedure', 'trial', 'waiver', 'waive', 'sentencing', 'evidence', 'review', 'defenses'];
const procedureSections = new Set(['565.001', '565.004', '565.005', '565.006', '565.029', '565.030', '565.032', '565.033', '565.034', '565.035', '565.040', '565.140', '565.160', '565.163', '565.167']);
const procedureChapters = new Set(chapterPolicy.filter(c => c.category === 'procedure').map(c => c.chapter));
const isProcedure = (r: Statute) => procedureChapters.has(r.chapter) || procedureSections.has(r.section);
export function normalize(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/\b[1-4](st|nd|rd|th)\b/g, s => degreeNames[s] ?? s)
    .replace(/[^a-z0-9]+/g, ' ').split(' ').filter(s => s && !stop.has(s)).join(' ');
}
const terms = (s: string) => [...new Set(normalize(s).split(' ').filter(Boolean))];
const signature = (s: string) => terms(s).sort().join(' ');
const indexOptions = { fields: ['heading', 'aliases'], tokenize: (s: string) => terms(s), processTerm: (s: string) => s };

export function buildIndex(records: Statute[]): MiniSearch {
  const index = new MiniSearch(indexOptions);
  index.addAll(records.map(r => ({ id: r.id, heading: r.title, aliases: (aliases[r.section] ?? []).join(' ') })));
  return index;
}
export function loadIndex(serialized: string): MiniSearch { return MiniSearch.loadJSON(serialized, indexOptions); }

// One insertion, deletion, substitution, or adjacent transposition; no broad fuzzy expansion.
function oneEdit(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const differences = [...a].map((c, i) => c === b[i] ? -1 : i).filter(i => i >= 0);
    return differences.length === 1 || (differences.length === 2 && differences[1] === differences[0] + 1
      && a[differences[0]] === b[differences[1]] && a[differences[1]] === b[differences[0]]);
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.slice(i) === long.slice(i + 1);
}
export interface Match { record: Statute; reason: string; score: number; }
export interface SearchResults { best: Match[]; related: Match[]; upcoming: Match[]; correction: string | null; exact: boolean; }

export function createSearch(records: Statute[], index = buildIndex(records)) {
  const byId = new Map(records.map(r => [r.id, r]));
  const vocabulary = [...new Set(records.flatMap(r => [...terms(r.title), ...(aliases[r.section] ?? []).flatMap(terms)]))];
  return (query: string, asOf: string, includeUpcoming = false, chapter = ''): SearchResults => {
    if (!validDate(asOf)) throw new Error('Invalid search date');
    const empty: SearchResults = { best: [], related: [], upcoming: [], correction: null, exact: false };
    const inScope = (r: Statute) => !chapter || r.chapter === chapter;
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > 200) return empty;
    const sectionQuery = trimmed.match(/^(?:(?:rsmo|section)\s*|§\s*)*(\d{1,3}\.\d{1,4})\.?$/i);
    if (sectionQuery) {
      const number = sectionQuery[1];
      const matches = records.filter(r => r.section === number && inScope(r));
      return { ...empty, exact: true,
        best: matches.filter(r => isEffective(r, asOf)).map(record => ({ record, reason: 'Exact section number', score: 1000 })),
        upcoming: includeUpcoming ? matches.filter(r => r.effectiveFrom > asOf).map(record => ({ record, reason: 'Exact section number', score: 1000 })) : [],
      };
    }
    // Never correct a numeric reference or mix numbers into fuzzy heading matching.
    if (/\d+\.\d+/.test(trimmed)) return empty;
    const original = terms(trimmed);
    const corrected = original.map(t => {
      if (t.length < 5 || vocabulary.includes(t) || vocabulary.some(v => v.startsWith(t))) return t;
      const candidates = vocabulary.filter(v => oneEdit(t, v));
      return candidates.length === 1 ? candidates[0] : t;
    });
    const correction = corrected.join(' ') !== original.join(' ') ? corrected.join(' ') : null;
    const normalized = corrected.join(' ');
    if (!normalized) return empty;
    const topicSections = topics[normalized] ?? [];
    const queryDegree = corrected.find(t => degrees.includes(t));
    const wantsProcedure = corrected.some(t => procedureWords.includes(t));
    const candidates = index.search(normalized, { combineWith: 'OR', prefix: term => term.length >= 3, fuzzy: false });
    const scoreRecord = (record: Statute): Match | null => {
      if (!inScope(record)) return null;
      const headingTerms = terms(record.title);
      if (queryDegree && headingTerms.some(t => degrees.includes(t)) && !headingTerms.includes(queryDegree)) return null;
      const aliasList = aliases[record.section] ?? [];
      const sequences = [headingTerms, ...aliasList.map(terms)];
      const substantive = corrected.filter(t => ![...degrees, 'degree', 'penalty', 'offense'].includes(t));
      if (substantive.length && !sequences.some(words => substantive.some(t => words.some(w => w === t || (t.length >= 3 && w.startsWith(t)))))) return null;
      const coverage = Math.max(...sequences.map(words => corrected.filter(t => words.some(w => w === t || (t.length >= 3 && w.startsWith(t)))).length / corrected.length));
      if (coverage < .6) return null;
      const exactAlias = aliasList.some(alias => signature(alias) === signature(normalized));
      const exactHeading = signature(record.title) === signature(normalized);
      const leadingHeading = signature(record.title.split(/[—,]/, 1)[0]) === signature(normalized);
      const procedure = isProcedure(record);
      let score = (coverage === 1 ? 150 : coverage * 60) + (exactAlias ? 150 : 0) + (exactHeading ? 160 : leadingHeading ? 90 : 0);
      if (wantsProcedure) score += procedure ? 35 : -25;
      else score += procedure ? -30 : 20;
      if (!corrected.includes('domestic') && headingTerms.includes('domestic')) score -= 35;
      if (!corrected.includes('involuntary') && corrected.includes('voluntary') && headingTerms.includes('involuntary')) score -= 60;
      score -= headingTerms.length * .3;
      return { record, score, reason: correction ? `Spelling suggestion: ${normalized}` : exactAlias ? 'Common-name match' : coverage === 1 ? 'Heading match' : 'Partial heading match' };
    };
    const scored = candidates.map(c => scoreRecord(byId.get(String(c.id))!)).filter((m): m is Match => m !== null)
      .sort((a, b) => b.score - a.score || a.record.section.localeCompare(b.record.section));
    const current = scored.filter(m => isEffective(m.record, asOf));
    const separateProcedure = !wantsProcedure && Boolean(current[0] && !isProcedure(current[0].record));
    const best = topicSections.length ? [] : current.filter(m => !separateProcedure || !isProcedure(m.record));
    const bestIds = new Set(best.map(m => m.record.section));
    const relatedNumbers = new Set([...topicSections, ...(separateProcedure ? current.filter(m => isProcedure(m.record)).map(m => m.record.section) : []), ...(best[0] ? related[best[0].record.section] ?? [] : [])]);
    const relatedMatches = records.filter(r => inScope(r) && isEffective(r, asOf) && relatedNumbers.has(r.section) && !bestIds.has(r.section))
      .map(record => ({ record, reason: topicSections.length ? 'Broader topic match' : 'Related section', score: 0 }));
    return { best, related: relatedMatches, upcoming: includeUpcoming ? scored.filter(m => m.record.effectiveFrom > asOf) : [], correction, exact: false };
  };
}
