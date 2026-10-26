/** Shared browser-side measurement and comparison for an original and a built page. */
export function captureStyles() {
  const properties = ('font-family font-size font-weight font-style font-stretch font-variant line-height letter-spacing word-spacing text-align text-transform text-decoration-line text-decoration-color text-decoration-style text-indent white-space word-break overflow-wrap color background-color background-image background-size background-position background-repeat display visibility opacity position top right bottom left width height min-width max-width min-height max-height box-sizing margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left border-top-width border-right-width border-bottom-width border-left-width border-top-color border-right-color border-bottom-color border-left-color border-top-style border-right-style border-bottom-style border-left-style border-radius box-shadow float clear vertical-align overflow-x overflow-y flex-direction flex-wrap justify-content align-items gap grid-template-columns object-fit object-position transform').split(' ');
  const normalize = value => value.replace(/url\([^)]+\)/g, 'url(LOCALIZED-ASSET)');
  const styles = (element, pseudo) => {
    const computed = getComputedStyle(element, pseudo);
    return Object.fromEntries(properties.map(key => [key, normalize(computed.getPropertyValue(key))]));
  };
  const path = element => {
    if (element === document.body) return 'body';
    const siblings = [...element.parentElement.children].filter(e => e.tagName === element.tagName);
    return `${path(element.parentElement)} > ${element.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(element) + 1})`;
  };
  const elements = [document.body, ...document.body.querySelectorAll('*')]
    .filter(e => !['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'IFRAME'].includes(e.tagName))
    .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
    .map(element => {
      const rect = element.getBoundingClientRect();
      const pseudo = {};
      for (const name of ['::before', '::after']) {
        const content = getComputedStyle(element, name).content;
        if (content !== 'none' && content !== 'normal') pseudo[name] = {content: normalize(content), ...styles(element, name)};
      }
      return {
        path: path(element),
        text: [...element.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim(),
        rect: {x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height},
        styles: styles(element), pseudo,
      };
    });
  return {viewport: {width: innerWidth, height: innerHeight, dpr: devicePixelRatio}, elements};
}

export function compareStyles(original, local, tolerance = 0.5) {
  const differences = [];
  if (JSON.stringify(original.viewport) !== JSON.stringify(local.viewport)) {
    differences.push({path: 'viewport', expected: original.viewport, actual: local.viewport});
  }
  const actual = new Map(local.elements.map(e => [e.path, e]));
  for (const expected of original.elements) {
    const found = actual.get(expected.path);
    if (!found) { differences.push({path: expected.path, property: 'element', expected: 'present', actual: 'missing'}); continue; }
    actual.delete(expected.path);
    for (const property of ['text', ...Object.keys(expected.styles)]) {
      const a = property === 'text' ? expected.text : expected.styles[property];
      const b = property === 'text' ? found.text : found.styles[property];
      if (a !== b) differences.push({path: expected.path, property, expected: a, actual: b});
    }
    for (const key of Object.keys(expected.rect)) {
      if (Math.abs(expected.rect[key] - found.rect[key]) > tolerance) differences.push({path: expected.path, property: `rect.${key}`, expected: expected.rect[key], actual: found.rect[key]});
    }
    if (JSON.stringify(expected.pseudo) !== JSON.stringify(found.pseudo)) differences.push({path: expected.path, property: 'pseudo-elements', expected: expected.pseudo, actual: found.pseudo});
  }
  for (const path of actual.keys()) differences.push({path, property: 'element', expected: 'absent', actual: 'extra'});
  return differences;
}
