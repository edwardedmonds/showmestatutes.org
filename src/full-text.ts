/** Build-time reading content. Never import this module from the search entry point. */
export type TextNode = string | { tag: string; attrs: Record<string, string>; children: TextNode[] };
export interface FullText {
  id: string; section: string; versionId: string;
  sourceUrl: string; sourceCheckedAt: string; sourceSha256: string;
  textSha256: string; headingText: string;
  blocks: TextNode[]; notes: TextNode[];
  subsections: { number: number; block: number }[];
  navigationReview: boolean;
}
export const textContent = (node: TextNode): string => typeof node === 'string' ? node : node.children.map(textContent).join('');
/** Recompute the complete navigation plan; validating only supplied anchors can
 * miss a footnote-marked final subsection and silently attach it to its predecessor. */
export function navigationFor(blocks: TextNode[]) {
  const number = /^\s*\**\s*([0-9]+)\.\s+/;
  const compound = /^\s*\**\s*[0-9]+\.[0-9]/;
  const hierarchy = /^\s*(?:ARTICLE|SECTION|PART)\s+(?:[IVXLC]+|[0-9]+)(?:\.(?=\s|$)|(?=\s|$))/i;
  const lettered = /^\s*[A-Z]+[.)]\s+/;
  const starts: {number: number; block: number}[] = [];
  const reasons = new Set<string>();
  const inspect = (node: TextNode, nested = false) => {
    if (typeof node === 'string') return;
    const text = textContent(node);
    if (['p', 'div'].includes(node.tag)) {
      if (hierarchy.test(text)) reasons.add('article-or-part-structure');
      if (compound.test(text)) reasons.add('compound-numbering');
      if (lettered.test(text)) reasons.add('lettered-or-roman-structure');
      if (nested && number.test(text)) reasons.add('nested-numbering');
    }
    node.children.forEach(child => inspect(child, true));
  };
  blocks.forEach((block, index) => {
    const text = textContent(block), match = text.match(number);
    if (typeof block !== 'string' && ['p', 'div'].includes(block.tag)) {
      if (match) starts.push({number: Number(match[1]), block: index});
    } else if (match || compound.test(text)) reasons.add('unsupported-number-container');
    if (hierarchy.test(text)) reasons.add('article-or-part-structure');
    inspect(block);
  });
  if (starts.length && blocks.slice(0, starts[0].block).some(b => textContent(b).replace(/\u00ad/g,'').trim())) reasons.add('introductory-text-before-numbering');
  if (starts.some((s,i) => s.number !== i + 1)) reasons.add('nonsequential-numbering');
  return {subsections: reasons.size ? [] : starts, navigationReview: reasons.size > 0, reasons: [...reasons].sort()};
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const subsectionId = (id: string, number: number) => `version-${id}-subsection-${number}`;
const fragment = (id: string) => '#' + encodeURIComponent(id);

export function renderNode(node: TextNode): string {
  if (typeof node === 'string') return escape(node);
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${escape(v)}"`).join('');
  const html = `<${node.tag}${attrs}>${node.children.map(renderNode).join('')}${['br', 'hr', 'col'].includes(node.tag) ? '' : `</${node.tag}>`}`;
  return node.tag === 'table' ? `<div class="source-table" role="region" aria-label="Table from the official source" tabindex="0">${html}</div>` : html;
}

export function renderFullText(text: FullText): string {
  const notesId = `version-${text.id}-notes`;
  const bodyId = `version-${text.id}-text`;
  const render = (nodes: TextNode[]) => nodes.map(renderNode).join('');
  const sourceBody = (nodes: TextNode[]) => `<div data-source-body="${escape(text.id)}">${render(nodes)}</div>`;
  const starts = text.subsections;
  const emptyBody = !text.blocks.map(textContent).join('').trim();
  const body = starts.length ? sourceBody(text.blocks.slice(0, starts[0].block)) + starts.map((s, i) => {
    const id = subsectionId(text.id, s.number);
    return `<section class="law-subsection" id="${escape(id)}" aria-label="Subsection ${s.number}">
<div class="subsection-tools"><a class="permalink" href="${fragment(id)}">Subsection ${s.number} <span aria-hidden="true">↗</span></a><button type="button" data-copy-fragment="${escape(id)}" hidden>Copy link</button></div>
${sourceBody(text.blocks.slice(s.block, starts[i + 1]?.block))}</section>`;
  }).join('') : `<div class="law-unsectioned">${sourceBody(text.blocks)}</div>`;
  return `<div class="reading-layout">
<aside class="reading-guide" aria-label="Reading guide for source version ${escape(text.versionId)}"><h3>In this section</h3>
<p>Navigate this source version.</p><nav class="reading-links" aria-label="Subsections for source version ${escape(text.versionId)}">${starts.map(s => `<a href="${fragment(subsectionId(text.id, s.number))}"><span>${s.number}</span> Subsection ${s.number}</a>`).join('') || `<a href="${fragment(bodyId)}">Statutory text</a>`}</nav>
<a class="notes-link" href="${fragment(notesId)}">History &amp; source notes ↓</a>
<p class="guide-note">Navigation labels are reading aids. Original numbering and wording appear alongside them.</p></aside>
<div class="reading-content"><div class="text-heading" id="${escape(bodyId)}"><h3>Statutory text</h3></div>
<p class="reading-description">From the archived Revisor response shown above. Text is not included in the site’s search index.</p>
<div class="law-text">${text.headingText ? `<p class="source-heading" data-source-heading="${escape(text.id)}">${escape(text.headingText)}</p>` : ''}${emptyBody ? '<p class="no-body-note">The archived source provides a heading and source notes, with no separate statutory body text.</p>' : ''}${body}</div>
<section class="source-notes" id="${escape(notesId)}" aria-label="History and source notes"><p class="eyebrow">FROM THE OFFICIAL SOURCE</p><h3>History &amp; source notes</h3><div data-source-notes="${escape(text.id)}">${render(text.notes)}</div></section>
<p class="end-note"><a href="${escape(text.sourceUrl)}">Check this exact version at the Missouri Revisor ↗</a></p></div></div>`;
}
