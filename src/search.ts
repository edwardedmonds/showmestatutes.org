import MiniSearch, { type AsPlainObject } from 'minisearch';
import { runtimeAliases } from './aliases-runtime';
import { procedureChapters, isContingent, isEffective, isUpcoming, sectionQueryPattern, validDate, type ChapterView, type StatuteRecord } from './runtime';

const aliases = runtimeAliases.sections;
const topics = runtimeAliases.topics;
const related = runtimeAliases.related;
const stop = new Set(['a', 'an', 'the', 'in', 'of', 'for', 'to', 'and', 'rsmo', 'section', 'missouri']);
const degreeNames: Record<string, string> = { '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth' };
const degrees = ['first', 'second', 'third', 'fourth'];
const procedureWords = ['procedure', 'trial', 'waiver', 'waive', 'sentencing', 'evidence', 'review', 'defenses'];
const procedureSections = new Set(['565.001', '565.004', '565.005', '565.006', '565.029', '565.030', '565.032', '565.033', '565.034', '565.035', '565.040', '565.140', '565.160', '565.163', '565.167']);
const isProcedure = (r: StatuteRecord) => procedureChapters.has(r.chapter) || procedureSections.has(r.section);

// Legal and common words whose plural form has a distinct meaning or is invariant.
const preservePlural = new Set([
  'damages', 'arms', 'goods', 'means', 'premises', 'grounds', 'costs', 'powers',
  'proceeds', 'securities', 'savings', 'earnings', 'customs', 'minutes', 'effects',
  'works', 'services', 'terms', 'series', 'species', 'news', 'corps', 'does',
]);

export function singularize(word: string): string {
  if (word.length < 4 || preservePlural.has(word)) return word;
  if (word.length >= 5 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length >= 5 && /(?:ches|shes|xes|zes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is') && !word.endsWith('os')) {
    return word.slice(0, -1);
  }
  return word;
}

export function normalize(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/\b[1-4](st|nd|rd|th)\b/g, s => degreeNames[s] ?? s)
    .replace(/[^a-z0-9]+/g, ' ').split(' ').filter(s => s && !stop.has(s)).join(' ');
}
const terms = (s: string) => [...new Set(normalize(s).split(' ').filter(Boolean))];
const canonicalTerms = (s: string) => [...new Set(terms(s).map(singularize))];
const signature = (s: string) => canonicalTerms(s).sort().join(' ');
const indexOptions = { fields: ['heading', 'aliases'], tokenize: (s: string) => terms(s), processTerm: (s: string) => singularize(s) };

const topicsByKey = new Map<string, string[]>();
for (const [key, sections] of Object.entries(topics)) {
  topicsByKey.set(key, sections);
  const canonicalKey = terms(key).map(singularize).join(' ');
  if (!topicsByKey.has(canonicalKey)) topicsByKey.set(canonicalKey, sections);
}

export function buildIndex(records: StatuteRecord[]): MiniSearch {
  const index = new MiniSearch(indexOptions);
  index.addAll(records.map(r => ({ id: r.id, heading: r.title, aliases: (aliases[r.section] ?? []).join(' ') })));
  return index;
}

export function loadIndex(serialized: string | AsPlainObject): MiniSearch {
  return typeof serialized === 'string'
    ? MiniSearch.loadJSON(serialized, indexOptions)
    : MiniSearch.loadJS(serialized, indexOptions);
}

export function extractIndexTerms(serialized: AsPlainObject): string[] {
  return serialized.index.map(([term]) => term);
}

export function findMatchingChapters(chapters: ChapterView[], query: string, limit = 4): ChapterView[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 200 || sectionQueryPattern.test(trimmed) || /\d+\.\d+/.test(trimmed)) return [];
  const qTerms = canonicalTerms(trimmed);
  if (!qTerms.length) return [];
  const qSig = [...qTerms].sort().join(' ');
  const scored: { chapter: ChapterView; score: number }[] = [];
  for (const chapter of chapters) {
    if (chapter.sectionCount === 0) continue;
    const cTerms = canonicalTerms(chapter.title);
    if (!cTerms.length) continue;
    let exactCount = 0;
    let allMatched = true;
    for (const qt of qTerms) {
      if (cTerms.includes(qt)) {
        exactCount++;
      } else if (qt.length >= 3 && cTerms.some(ct => ct.startsWith(qt))) {
        // Prefix match
      } else {
        allMatched = false;
        break;
      }
    }
    if (!allMatched) continue;
    const cSig = [...cTerms].sort().join(' ');
    const score = (cSig === qSig ? 100 : 0)
      + exactCount * 20
      + (qTerms.length - exactCount) * 10
      + (qTerms.length / cTerms.length) * 15;
    scored.push({ chapter, score });
  }
  scored.sort((a, b) => b.score - a.score || b.chapter.sectionCount - a.chapter.sectionCount || a.chapter.chapter.localeCompare(b.chapter.chapter, 'en', { numeric: true }));
  return scored.slice(0, limit).map(item => item.chapter);
}

// One insertion, deletion, substitution, or adjacent transposition; no broad fuzzy expansion.
function oneEdit(a: string, b: string): boolean {
  const la = a.length;
  const lb = b.length;
  if (a === b || Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diff1 = -1;
    let diff2 = -1;
    for (let i = 0; i < la; i++) {
      if (a.charCodeAt(i) !== b.charCodeAt(i)) {
        if (diff1 === -1) diff1 = i;
        else if (diff2 === -1) diff2 = i;
        else return false;
      }
    }
    return diff2 === -1
      || (diff2 === diff1 + 1
        && a.charCodeAt(diff1) === b.charCodeAt(diff2)
        && a.charCodeAt(diff2) === b.charCodeAt(diff1));
  }
  const short = la < lb ? a : b;
  const long = la < lb ? b : a;
  const ls = short.length;
  let i = 0;
  while (i < ls && short.charCodeAt(i) === long.charCodeAt(i)) i++;
  for (; i < ls; i++) {
    if (short.charCodeAt(i) !== long.charCodeAt(i + 1)) return false;
  }
  return true;
}

function hasPrefix(sorted: string[], prefix: string): boolean {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo < sorted.length && sorted[lo].startsWith(prefix);
}

export interface Match { record: StatuteRecord; reason: string; score: number; }
export interface SearchResults { best: Match[]; related: Match[]; upcoming: Match[]; contingent: Match[]; constitutional: Match[]; correction: string | null; exact: boolean; }

export function createSearch(records: StatuteRecord[], index = buildIndex(records), prebuiltTerms?: Iterable<string>) {
  const byId = new Map<string, StatuteRecord>();
  const bySection = new Map<string, StatuteRecord[]>();
  const recordOrder = new Map<string, number>();
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    byId.set(record.id, record);
    recordOrder.set(record.id, i);
    const versions = bySection.get(record.section);
    if (versions) versions.push(record);
    else bySection.set(record.section, [record]);
  }
  let vocab: { set: Set<string>; sorted: string[]; byLength: Map<number, string[]> } | undefined;
  const getVocab = () => {
    if (vocab) return vocab;
    const set = new Set<string>();
    if (prebuiltTerms) {
      for (const t of prebuiltTerms) set.add(t);
    } else {
      for (const r of records) {
        for (const t of terms(r.title)) set.add(singularize(t));
        const sectionAliases = aliases[r.section];
        if (sectionAliases) {
          for (const alias of sectionAliases) {
            for (const t of terms(alias)) set.add(singularize(t));
          }
        }
      }
    }
    for (const topic of Object.keys(topics)) {
      for (const t of terms(topic)) set.add(singularize(t));
    }
    const sorted = [...set].sort();
    const byLength = new Map<number, string[]>();
    for (const word of sorted) {
      const len = word.length;
      const bucket = byLength.get(len);
      if (bucket) bucket.push(word);
      else byLength.set(len, [word]);
    }
    vocab = { set, sorted, byLength };
    return vocab;
  };
  return (query: string, asOf: string, includeUpcoming = false, chapter = ''): SearchResults => {
    if (!validDate(asOf)) throw new Error('Invalid search date');
    const empty: SearchResults = { best: [], related: [], upcoming: [], contingent: [], constitutional: [], correction: null, exact: false };
    const inScope = (r: StatuteRecord) => !chapter || r.chapter === chapter;
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > 200) return empty;
    const sectionQuery = trimmed.match(sectionQueryPattern);
    if (sectionQuery) {
      const number = sectionQuery[1].toUpperCase();
      const matches = (bySection.get(number) ?? []).filter(inScope);
      return { ...empty, exact: true,
        best: matches.filter(r => isEffective(r, asOf)).map(record => ({ record, reason: 'Exact section number', score: 1000 })),
        upcoming: includeUpcoming ? matches.filter(r => isUpcoming(r, asOf)).map(record => ({ record, reason: 'Exact section number', score: 1000 })) : [],
        constitutional: matches.filter(r => r.hasConstitutionalWarning).map(record => ({ record, reason: 'Exact section number', score: 1000 })),
        contingent: matches.filter(r => isContingent(r, asOf)).map(record => ({ record, reason: 'Exact section number', score: 1000 })),
      };
    }
    // Never correct a numeric reference or mix numbers into fuzzy heading matching.
    if (/\d+\.\d+/.test(trimmed)) return empty;
    const original = terms(trimmed);
    const { set: vocabSet, sorted: sortedVocab, byLength } = getVocab();
    const corrected = original.map(t => {
      const s = singularize(t);
      if (t.length < 5 || vocabSet.has(t) || vocabSet.has(s) || hasPrefix(sortedVocab, t) || hasPrefix(sortedVocab, s)) return t;
      let match: string | undefined;
      for (let len = t.length - 1; len <= t.length + 1; len++) {
        const bucket = byLength.get(len);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const candidate = bucket[i];
          if (oneEdit(t, candidate)) {
            if (match !== undefined) return t;
            match = candidate;
          }
        }
      }
      return match ?? t;
    });
    const correction = corrected.join(' ') !== original.join(' ') ? corrected.join(' ') : null;
    const normalized = corrected.join(' ');
    if (!normalized) return empty;
    const canonicalCorrected = corrected.map(singularize);
    const topicSections = topicsByKey.get(normalized) ?? topicsByKey.get(canonicalCorrected.join(' ')) ?? [];
    const queryDegree = corrected.find(t => degrees.includes(t));
    const wantsProcedure = corrected.some(t => procedureWords.includes(t));
    const candidates = index.search(normalized, { combineWith: 'OR', prefix: term => term.length >= 3, fuzzy: false });
    const termMatchesWord = (qTerm: string, word: string) => word === qTerm || (qTerm.length >= 3 && word.startsWith(qTerm));
    const scoreRecord = (record: StatuteRecord, miniSearchScore: number): Match | null => {
      if (!inScope(record)) return null;
      const headingTerms = canonicalTerms(record.title);
      if (queryDegree && headingTerms.some(t => degrees.includes(t)) && !headingTerms.includes(queryDegree)) return null;
      const aliasList = aliases[record.section] ?? [];
      const sequences = [headingTerms, ...aliasList.map(canonicalTerms)];
      const substantive = canonicalCorrected.filter(t => ![...degrees, 'degree', 'penalty', 'offense'].includes(t));
      // Do not drop a topic-defining word (e.g. "rent") just because generic
      // words such as "security deposit" match an unrelated heading.
      if (substantive.length && !sequences.some(words => substantive.every(t => words.some(w => termMatchesWord(t, w))))) return null;
      const coverage = Math.max(...sequences.map(words => canonicalCorrected.filter(t => words.some(w => termMatchesWord(t, w))).length / canonicalCorrected.length));
      if (coverage < .6) return null;
      const exactAlias = aliasList.some(alias => signature(alias) === signature(normalized));
      const exactHeading = signature(record.title) === signature(normalized);
      const leadingHeading = signature(record.title.split(/[—,]/, 1)[0]) === signature(normalized);
      const rawSequences = [terms(record.title), ...aliasList.map(terms)];
      const exactFormCoverage = Math.max(...rawSequences.map(words => corrected.filter(t => words.some(w => w === t)).length / corrected.length));
      const procedure = isProcedure(record);
      let score = (coverage === 1 ? 150 : coverage * 60) + (exactAlias ? 150 : 0) + (exactHeading ? 160 : leadingHeading ? 90 : 0) + exactFormCoverage * 4;
      if (wantsProcedure) score += procedure ? 35 : -25;
      else score += procedure ? -30 : 20;
      if (!canonicalCorrected.includes('domestic') && headingTerms.includes('domestic')) score -= 35;
      if (!canonicalCorrected.includes('involuntary') && canonicalCorrected.includes('voluntary') && headingTerms.includes('involuntary')) score -= 60;
      score -= headingTerms.length * .3;
      score += Math.min(12, Math.log1p(Math.max(0, miniSearchScore)) * 2.5);
      return { record, score, reason: correction ? `Spelling suggestion: ${normalized}` : exactAlias ? 'Common-name match' : coverage === 1 ? 'Heading match' : 'Partial heading match' };
    };
    const scored = candidates.map(c => scoreRecord(byId.get(String(c.id))!, c.score)).filter((m): m is Match => m !== null)
      .sort((a, b) => b.score - a.score || a.record.section.localeCompare(b.record.section));
    const current = scored.filter(m => isEffective(m.record, asOf));
    const separateProcedure = !wantsProcedure && Boolean(current[0] && !isProcedure(current[0].record));
    const best = current.filter(m => !separateProcedure || !isProcedure(m.record));
    const bestIds = new Set(best.map(m => m.record.section));
    const relatedNumbers = new Set([...topicSections, ...(separateProcedure ? current.filter(m => isProcedure(m.record)).map(m => m.record.section) : []), ...(best[0] ? related[best[0].record.section] ?? [] : [])]);
    const topicSet = new Set(topicSections);
    const relatedRecords: StatuteRecord[] = [];
    for (const section of relatedNumbers) {
      if (bestIds.has(section)) continue;
      const versions = bySection.get(section);
      if (!versions) continue;
      for (const r of versions) {
        if (inScope(r) && isEffective(r, asOf)) relatedRecords.push(r);
      }
    }
    relatedRecords.sort((a, b) => recordOrder.get(a.id)! - recordOrder.get(b.id)!);
    const relatedMatches = relatedRecords.map(record => ({ record, reason: topicSet.has(record.section) ? 'Broader topic match' : 'Related section', score: 0 }));
    return { best, related: relatedMatches, upcoming: includeUpcoming ? scored.filter(m => isUpcoming(m.record, asOf)) : [],
      constitutional: scored.filter(m => m.record.hasConstitutionalWarning),
      contingent: scored.filter(m => isContingent(m.record, asOf)), correction, exact: false };
  };
}
