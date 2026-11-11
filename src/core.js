'use strict';
const compact = value => String(value || '').replace(/\s+/g, ' ').trim();
function paperFolder(value) {
  const folder=String(value||'').trim().replace(/\/+$/,'');
  if(!folder||/^[\/\\]|[\\:\x00-\x1f]/.test(folder)||folder.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('.')))throw new Error('请填写仓库内的相对目录。');
  return folder;
}
function translationEndpoint(value) {
  let url;
  try{url=new URL(String(value||'').trim());}catch{throw new Error('请填写有效的翻译服务 Base URL。');}
  if(url.username||url.password||url.search||url.hash)throw new Error('Base URL 不能包含凭据、查询参数或片段。');
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(url.protocol!=='https:'&&!(local&&url.protocol==='http:'))throw new Error('翻译服务需使用 HTTPS；仅本机接口允许 HTTP。');
  return url.href.replace(/\/+$/,'')+'/chat/completions';
}
function parseInput(input) {
  let value = String(input || '').trim();
  const arxivPattern = /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/i;
  const doi = value.replace(/^doi:\s*/i, '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  if (/^10\.\d{4,9}\/\S+$/i.test(doi)) {
    const normalized = decodeURIComponent(doi);
    const arxivDoi = /^10\.48550\/arxiv\.(.+)$/i.exec(normalized);
    if (arxivDoi) return parseInput(arxivDoi[1]);
    return { kind: 'doi', id: normalized, url: 'https://doi.org/' + normalized };
  }
  if (arxivPattern.test(value.replace(/^arxiv:\s*/i, ''))) {
    const id = value.replace(/^arxiv:\s*/i, '');
    return { kind: 'arxiv', id, url: 'https://arxiv.org/abs/' + id };
  }
  let url;
  try { url = new URL(value); } catch { throw new Error('请输入 arXiv 链接、IEEE Xplore 论文链接或 DOI。'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('只支持 HTTP／HTTPS 论文链接。');
  if (/^(?:export\.)?arxiv\.org$/i.test(url.hostname)) {
    const id = decodeURIComponent(url.pathname.replace(/^\/(?:abs|pdf|html)\//, '').replace(/\.pdf$/, '').replace(/\/$/, ''));
    if (arxivPattern.test(id)) return parseInput(id);
  }
  if (url.hostname === 'ieeexplore.ieee.org') {
    const id = /\/(?:document|abstract\/document)\/(\d+)/.exec(url.pathname)?.[1] || url.searchParams.get('arnumber');
    if (id && /^\d+$/.test(id)) return { kind: 'ieee', id, url: 'https://ieeexplore.ieee.org/document/' + id };
  }
  throw new Error('当前支持 arXiv、IEEE Xplore 和 DOI；其他出版社请粘贴 DOI。');
}
const canonicalArxiv = id => String(id || '').replace(/v\d+$/i, '').toLowerCase();
const canonicalDoi = doi => String(doi || '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim().toLowerCase();
function samePaper(frontmatter, source, metadata = {}) {
  return !!((source.kind === 'arxiv' && (canonicalArxiv(frontmatter['arXiv']) === canonicalArxiv(source.id) || canonicalDoi(frontmatter.DOI) === '10.48550/arxiv.' + canonicalArxiv(source.id))) ||
    (canonicalDoi(metadata.doi || (source.kind === 'doi' ? source.id : '')) && canonicalDoi(frontmatter.DOI) === canonicalDoi(metadata.doi || source.id)) ||
    (frontmatter['原文链接'] === source.url) ||
    (metadata.arxiv && canonicalArxiv(frontmatter['arXiv']) === canonicalArxiv(metadata.arxiv)));
}
function safeName(text, max = 90) {
  const name = compact(text).replace(/[<>:"/\\|?*\x00-\x1f\[\]#^]/g, '-').replace(/[. ]+$/g, '').slice(0, max).trim();
  return name && name !== '.' && name !== '..' ? name : 'Paper';
}
function htmlText(html, parseDocument) {
  const doc = parseDocument(String(html || ''), 'text/html');
  return compact(doc.body?.textContent || doc.documentElement?.textContent || '');
}
function metaValues(doc, name) {
  return Array.from(doc.querySelectorAll('meta')).filter(el => (el.getAttribute('name') || el.getAttribute('property') || '').toLowerCase() === name.toLowerCase()).map(el => el.getAttribute('content')).filter(Boolean);
}
function parseArxivHtml(html, id, parseDocument) {
  const doc = parseDocument(html, 'text/html');
  const get = name => metaValues(doc, name)[0] || '';
  const title = compact(get('citation_title'));
  if (!title) throw new Error('arXiv 页面没有返回论文信息，可能正在限流，请稍后重试。');
  return { title, authors: metaValues(doc, 'citation_author').map(compact), published: get('citation_date').replace(/\//g, '-'),
    abstract: compact(doc.querySelector('blockquote.abstract')?.textContent?.replace(/^\s*Abstract:\s*/i, '') || get('description')),
    doi: get('citation_doi'), arxiv: id, venue: 'arXiv', url: 'https://arxiv.org/abs/' + id,
    candidates: [{ url: 'https://arxiv.org/pdf/' + id, version: 'arXiv 预印本' }] };
}
function parseArxivAtom(xml, id, parseDocument) {
  const doc = parseDocument(xml, 'application/xml');
  const entry = doc.getElementsByTagName('entry')[0];
  if (!entry || doc.getElementsByTagName('parsererror').length) throw new Error('arXiv API 暂未返回有效论文信息。');
  return fromArxivEntry(entry, id);
}
function fromArxivEntry(entry, id) {
  const get = name => compact(entry.getElementsByTagName(name)[0]?.textContent);
  const title = get('title');
  if (!title || /^Error$/i.test(title)) throw new Error('未找到该 arXiv 论文。');
  return { title, authors: Array.from(entry.getElementsByTagName('author')).map(a => compact(a.getElementsByTagName('name')[0]?.textContent)),
    published: get('published').slice(0, 10), abstract: get('summary'), doi: compact(entry.getElementsByTagNameNS('http://arxiv.org/schemas/atom', 'doi')[0]?.textContent),
    arxiv: id, venue: 'arXiv', url: 'https://arxiv.org/abs/' + id,
    candidates: [{ url: 'https://arxiv.org/pdf/' + id, version: 'arXiv 预印本' }] };
}
function fromCrossref(work, parseDocument) {
  if (!work || !work.title?.[0]) throw new Error('DOI 未返回有效的标题信息。');
  const parts = (work['published-online'] || work['published-print'] || work.published || work.issued)?.['date-parts']?.[0] || [];
  const published = parts.map((n, i) => i ? String(n).padStart(2, '0') : String(n)).join('-');
  const candidates = (work.link || []).filter(l => l['content-type'] === 'application/pdf').map(l => ({ url: l.URL, version: l['content-version'] || '出版来源 PDF' }));
  const url = work.URL || 'https://doi.org/' + work.DOI;
  const ieee = /ieeexplore\.ieee\.org\/(?:document|abstract\/document)\/(\d+)/.exec((work.resource?.primary?.URL || '') + ' ' + url);
  if (ieee) candidates.push({ url: 'https://ieeexplore.ieee.org/stampPDF/getPDF.jsp?tp=&arnumber=' + ieee[1], version: '出版社正式版' });
  return { title: htmlText(work.title[0], parseDocument), authors: (work.author || []).map(a => compact([a.given, a.family].filter(Boolean).join(' ') || a.name)),
    published, doi: work.DOI, venue: work['container-title']?.[0] || '', abstract: htmlText(work.abstract || '', parseDocument), url, candidates };
}
async function fetchMetadata(source, request, parseDocument, fallbackDoi = '') {
  if (source.kind === 'arxiv') {
    try { return parseArxivHtml((await request(source.url)).text, source.id, parseDocument); }
    catch { return parseArxivAtom((await request('https://export.arxiv.org/api/query?id_list=' + encodeURIComponent(source.id))).text, source.id, parseDocument); }
  }
  let doi = source.kind === 'doi' ? source.id : fallbackDoi;
  if (!doi) {
    try {
      const html = (await request(source.url)).text;
      const doc = parseDocument(html, 'text/html');
      doi = metaValues(doc, 'citation_doi')[0] || /["']doi["']\s*:\s*["'](10\.[^"']+)["']/i.exec(html)?.[1];
    } catch { /* IEEE 页面受限时，用户可提供页面上显示的 DOI。 */ }
  }
  if (!doi) throw new Error('IEEE 页面暂时无法读取 DOI。请把论文 DOI 填入“补充 DOI”后重试；无需重新输入标签。');
  const parsed = parseInput(doi);
  if (parsed.kind !== 'doi') return fetchMetadata(parsed, request, parseDocument);
  const data = (await request('https://api.crossref.org/works/' + encodeURIComponent(parsed.id))).json;
  const meta = fromCrossref(data.message, parseDocument);
  meta.url = source.url;
  if (source.kind === 'ieee') meta.candidates.unshift({url:'https://ieeexplore.ieee.org/stampPDF/getPDF.jsp?tp=&arnumber=' + source.id,version:'出版社正式版'});
  return meta;
}
const matchText = text => String(text || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function matchArxivEntry(xml, meta, parseDocument) {
  const doc = parseDocument(xml, 'application/xml');
  for (const entry of Array.from(doc.getElementsByTagName('entry'))) {
    const url = compact(entry.getElementsByTagName('id')[0]?.textContent);
    let source;try { source = parseInput(url); } catch { continue; }
    if (source.kind !== 'arxiv') continue;
    const candidate = fromArxivEntry(entry, source.id);
    const titleMatches = matchText(candidate.title) === matchText(meta.title);
    const authorMatches = meta.authors?.some(a => candidate.authors.some(b => matchText(a) === matchText(b)));
    const doiMatches = meta.doi && candidate.doi && canonicalDoi(meta.doi) === canonicalDoi(candidate.doi);
    // 相同标题和至少一位完整作者都一致，或 DOI 一致，才采用预印本。
    if (doiMatches || (titleMatches && authorMatches)) return candidate;
  }
  return null;
}
async function enrichFromArxiv(meta, request, parseDocument) {
  if (meta.arxiv || !parseDocument) return;
  const title = compact(meta.title).replace(/["\\]/g, ' ');
  try {
    const response = await request('https://export.arxiv.org/api/query?search_query=' + encodeURIComponent('ti:"' + title + '"') + '&max_results=5');
    const candidate = matchArxivEntry(response.text, meta, parseDocument);
    if (!candidate) return;
    meta.arxiv = candidate.arxiv;
    meta.candidates.push(...candidate.candidates);
    if (!meta.abstract && candidate.abstract) { meta.abstract = candidate.abstract;meta.abstractSource = candidate.url; }
  } catch { /* arXiv 暂不可用时，仍继续尝试已知的出版来源。 */ }
}
async function openPdfCandidates(meta, request, parseDocument) {
  await enrichFromArxiv(meta, request, parseDocument);
  const candidates = [...meta.candidates];
  if (meta.doi && !meta.arxiv) {
    try {
      const data = (await request('https://api.semanticscholar.org/graph/v1/paper/DOI:' + encodeURIComponent(meta.doi) + '?fields=openAccessPdf')).json;
      if (data.openAccessPdf?.url) candidates.push({url:data.openAccessPdf.url,version:'公开全文（版本待核对）'});
    } catch { /* 开放全文检索不可用时，仍尝试已知的 PDF 地址。 */ }
  }
  return candidates.filter((c, i, arr) => c.url && arr.findIndex(x => x.url === c.url) === i);
}
function figureScore(caption, url) {
  const text = (caption + ' ' + url).toLowerCase();
  let score = 0;
  for (const [pattern, weight] of [[/\bframework\b/,3],[/\boverview\b/,4],[/\barchitecture\b/,4],[/\bpipeline\b/,3],[/\bproposed\b/,1],[/network (?:structure|design)/,2],[/system[_-]overview/,3]]) if(pattern.test(text))score+=weight;
  if(/\bschematic overview\b/.test(caption.toLowerCase()))score+=3;
  if (/\b(?:ablation|comparison|benchmark|performance|trajectories|results)\b/.test(caption.toLowerCase()))score-=3;
  return score;
}
function parseFigureCandidates(html, pageUrl, parseDocument) {
  const doc = parseDocument(html, 'text/html');
  const candidates=[];
  for(const figure of Array.from(doc.querySelectorAll('figure'))){
    const caption=compact(figure.querySelector('figcaption')?.textContent);
    if(!caption)continue;
    const images=Array.from(figure.querySelectorAll('img')).map(image=>{
      const src=image.getAttribute('src')||image.getAttribute('data-src');
      if(!src)return null;
      try{const url=new URL(src,pageUrl);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}
    }).filter(Boolean);
    if(images.length!==1)continue;
    const number=/^(?:Fig\.?|Figure)\s*([\d.]+)/i.exec(caption)?.[1]||'';
    candidates.push({url:images[0],caption,number,pageUrl,anchor:figure.getAttribute('id')||'',score:figureScore(caption,images[0])});
  }
  return candidates.sort((a,b)=>b.score-a.score);
}
function automaticFigure(candidates) {
  const first=candidates[0];
  return first&&first.score>=5&&(!candidates[1]||first.score-candidates[1].score>=2)?first:null;
}
async function fetchFigures(meta, request, parseDocument) {
  await enrichFromArxiv(meta,request,parseDocument);
  const sources=meta.arxiv?['https://arxiv.org/html/'+meta.arxiv]:[meta.url];
  for(const source of sources){
    if(!source)continue;
    try{const response=await request(source);const candidates=parseFigureCandidates(response.text,source,parseDocument);if(candidates.length)return candidates;}catch{}
  }
  return [];
}
function imageExtension(data) {
  const b=new Uint8Array(data),starts=values=>values.every((v,i)=>b[i]===v);
  if(starts([137,80,78,71,13,10,26,10]))return 'png';
  if(starts([255,216,255]))return 'jpg';
  if(starts([71,73,70,56]))return 'gif';
  if(starts([82,73,70,70])&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'webp';
  return null;
}
function insertMainFigure(text, imagePath, figure) {
  const start='<!-- paper-main-figure:start -->',end='<!-- paper-main-figure:end -->';
  if(text.includes(start))return text;
  const caption=compact(figure.caption);
  const block=start+'\n![['+imagePath+']]\n\n'+caption+'\n\n[原文图示来源](<'+figure.pageUrl+'#'+(figure.anchor||'')+'>)\n'+end+'\n\n';
  // 摘要优先展示，主图放在摘要之后、阅读笔记之前。
  const fm=/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text);
  const split=fm?fm[0].length:0,body=text.slice(split);
  const heading=/^# [^\r\n]+(?:\r?\n|$)/m.exec(body);
  const abstract=/^## 原文摘要[ \t]*\r?\n[\s\S]*?(?=^## |$(?![\s\S]))/m.exec(body);
  const at=abstract?split+abstract.index+abstract[0].length:heading?split+heading.index+heading[0].length:split;
  return text.slice(0,at)+'\n'+block+text.slice(at).replace(/^\r?\n/,'');
}
function isPdf(data) {
  const bytes = new Uint8Array(data);
  return bytes.length > 5 && Array.from(bytes.slice(0, 1024)).map(c => String.fromCharCode(c)).join('').includes('%PDF-');
}
function paperBody(depth = '粗读') {
  if(depth==='精读')return '## 一分钟速览\n\n- 研究问题：\n- 核心想法：\n- 对我的研究的价值：\n\n## 问题与已有方法的不足\n\n## 方法拆解\n\n### 输入、输出与关键模块\n\n### 关键公式解读\n\n## 训练与部署\n\n- 数据与监督信号／奖励：\n- 观测与动作表示：\n- 仿真／实机、硬件与实时性：\n\n## 实验证据与局限\n\n| 结论 | 图表或章节 | 证据与适用边界 |\n| --- | --- | --- |\n| | | |\n\n## 我的理解与研究关联\n\n## 复现与下一步\n\n## 相关笔记\n\n';
  return '## 研究问题与贡献\n\n## 方法与关键假设\n\n## 实验证据与局限\n\n## 关键公式解读\n\n## 相关笔记\n\n';
}
function originalAbstract(text) {
  const match=/^## 原文摘要[ \t]*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(text);
  return match?match[1].replace(/\n摘要来源：[\s\S]*$/,'').trim():'';
}
function moveAbstractsToTop(text) {
  const sections=[];
  const body=text.replace(/^## (中文摘要|原文摘要)[ \t]*\r?\n[\s\S]*?(?=^## |$(?![\s\S]))/gm,(block,title)=>{sections.push({title,block});return '';});
  if(!sections.length)return text;
  const heading=/^# [^\r\n]+(?:\r?\n|$)/m.exec(body);
  if(!heading)return text;
  sections.sort((a,b)=>(a.title==='中文摘要'?0:1)-(b.title==='中文摘要'?0:1));
  const at=heading.index+heading[0].length;
  return body.slice(0,at)+'\n'+sections.map(s=>s.block.trimEnd()+'\n\n').join('')+body.slice(at).replace(/^\s*\n/,'');
}
function insertTranslation(text, translation, model) {
  const section=/^## 中文摘要\n([\s\S]*?)(?=^## |$(?![\s\S]))/m;
  const existing=section.exec(text);
  if(existing&&existing[1].trim()&&!existing[1].includes('中文翻译待补充。'))return text;
  // 模型输出仅作为引用文本，不能注入笔记标题、属性或模板标记。
  const quoted=translation.trim().split('\n').map(line=>'> '+line).join('\n');
  const block='## 中文摘要\n\n'+quoted+'\n\n*机器翻译（'+String(model).replace(/[\r\n]/g,'')+'），请结合原文核对。*\n\n';
  if(existing)return text.replace(section,()=>block);
  const at=text.search(/^## 原文摘要[ \t]*$/m);
  return at>=0?text.slice(0,at)+block+text.slice(at):text+'\n'+block;
}
function templateMarkdown(text) {
  const body=text.replace(/^\uFEFF/,'').replace(/^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/,'').trimEnd().replace(/^(?:[ \t]*\r?\n)+/,'');
  if(!body.trim())throw new Error('模板正文为空，请先写入标题或内容。');
  // 摘要和主图按二级标题划分；让以列表或段落开头的模板也有明确边界。
  return (/^## /.test(body)?body:'## 阅读笔记\n\n'+body)+'\n';
}
function buildNote(meta, pdf, folder, imported, templateBody) {
  const q = value => JSON.stringify(value == null ? '' : value);
  const localPdf = pdf ? folder + '/paper.pdf' : '';
  const fm = { '类型': '论文笔记', '阅读状态': '待读', '阅读深度': templateBody?'自定义':meta.readingDepth==='精读'?'精读':'粗读', '标题': meta.title, '作者': meta.authors, '年份': Number(meta.published?.slice(0, 4)) || '',
    '发表日期': meta.published || '', 'DOI': meta.doi ? 'https://doi.org/' + canonicalDoi(meta.doi) : '', 'arXiv': meta.arxiv || '', '期刊或会议': meta.venue || '',
    '原文链接': meta.url, '摘要来源': meta.abstract ? (meta.abstractSource || meta.url) : '', '导入日期': imported, 'PDF状态': pdf ? '已下载' : '待补充', 'PDF版本': pdf?.version || '',
    'PDF来源': pdf?.url || '', '本地PDF': localPdf ? '[[' + localPdf + ']]' : '', tags: [], cover: '' };
  if(templateBody)fm['阅读模板']=meta.templatePath;
  return '---\n' + Object.entries(fm).map(([k,v]) => k + ': ' + q(v)).join('\n') + '\n---\n\n# ' + meta.title + '\n\n' +
    (localPdf ? '[打开本地 PDF](<' + encodeURI('paper.pdf') + '>)\n\n' : '> PDF 暂未下载，可使用“论文导入：为当前论文补入本地 PDF”。\n\n') +
    '## 中文摘要\n\n中文翻译待补充。\n\n## 原文摘要\n\n' + (meta.abstract || '来源未提供摘要，待补充。') + (meta.abstract?'\n\n摘要来源：['+(meta.abstractSource||meta.url)+']('+(meta.abstractSource||meta.url)+')':'')+'\n\n'+(templateBody??paperBody(meta.readingDepth));
}
module.exports = { paperFolder, translationEndpoint, parseInput, canonicalArxiv, canonicalDoi, samePaper, safeName, parseArxivHtml, parseArxivAtom, fromCrossref, fetchMetadata, matchArxivEntry, enrichFromArxiv, openPdfCandidates, figureScore, parseFigureCandidates, automaticFigure, fetchFigures, imageExtension, insertMainFigure, isPdf, paperBody, originalAbstract, moveAbstractsToTop, insertTranslation, templateMarkdown, buildNote };
