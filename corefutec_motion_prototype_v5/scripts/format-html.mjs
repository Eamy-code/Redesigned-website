const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);
const inlineElements = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'del',
  'em',
  'i',
  'img',
  'input',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr'
]);

// Keep quoted attribute values and whitespace-sensitive contents intact.
const htmlTokens = /<!--[\s\S]*?-->|<(script|style|pre|textarea)\b(?:[^<>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<![^>]*>|<\/?[a-zA-Z][\w:-]*(?:[^<>"']|"[^"]*"|'[^']*')*>|[^<]+/gi;

function parseHtml(html) {
  const document = { children: [] };
  const stack = [document];
  const tokens = html.match(htmlTokens) ?? [];
  if (tokens.join('') !== html) throw new Error('HTMLを欠落なく読み取れませんでした。');

  for (const token of tokens) {
    const parent = stack.at(-1);
    if (!token.startsWith('<')) {
      parent.children.push({ text: token });
      continue;
    }
    const tag = token.match(/^<\/?([\w:-]+)/)?.[1].toLowerCase();
    if (token.startsWith('</')) {
      if (stack.length === 1 || parent.tag !== tag) {
        throw new Error(`HTMLの閉じタグが対応していません: ${token}`);
      }
      parent.close = token;
      stack.pop();
      continue;
    }
    if (!tag || /^(script|style|pre|textarea)$/.test(tag)) {
      parent.children.push({ raw: token });
      continue;
    }
    const element = {
      tag,
      open: token,
      close: '',
      children: []
    };
    parent.children.push(element);
    if (!voidElements.has(tag) && !token.endsWith('/>')) stack.push(element);
  }
  if (stack.length !== 1) throw new Error(`HTMLの閉じタグがありません: ${stack.at(-1).tag}`);
  return document;
}

function serialize(node) {
  if (node.text !== undefined) return node.text.replace(/[ \t\r\n\f]+/g, ' ');
  if (node.raw !== undefined) return node.raw;
  return node.open + node.children.map(serialize).join('') + node.close;
}

function isInline(node) {
  if (node.text !== undefined) return true;
  return inlineElements.has(node.tag) && node.children.every(isInline);
}

function formatElement(node, depth) {
  const indent = '  '.repeat(depth);
  if (node.raw !== undefined) return indent + node.raw;
  if (node.text !== undefined) return indent + node.text.trim();

  const children = node.children.filter(child => child.text === undefined || child.text.trim());
  const containsText = children.some(child => child.text !== undefined);
  if (node.tag === 'p' && children.every(isInline) && children.some(child => child.tag === 'br')) {
    const lines = [];
    let line = '';
    for (const child of node.children) {
      line += serialize(child);
      if (child.tag === 'br') {
        lines.push(indent + '  ' + line.trim());
        line = '';
      }
    }
    if (line.trim()) lines.push(indent + '  ' + line.trim());
    return [indent + node.open, ...lines, indent + node.close].join('\n');
  }
  // Keep headings, paragraphs and mixed inline text together so that words
  // and inline decorations do not acquire extra spaces between them.
  if (!children.length || (children.every(isInline) && (containsText || inlineElements.has(node.tag) && node.tag !== 'a'))) {
    return indent + serialize(node);
  }
  return [
    indent + node.open,
    ...children.map(child => formatElement(child, depth + 1)),
    indent + node.close
  ].join('\n');
}

export function formatHtml(html) {
  const document = parseHtml(html);
  return document.children
    .filter(node => node.text === undefined || node.text.trim())
    .map(node => formatElement(node, 0))
    .join('\n') + '\n';
}
