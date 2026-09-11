export function insertBeside(host: HTMLElement, svg: SVGSVGElement, behind: boolean): boolean {
  host.insertAdjacentElement(behind ? 'beforebegin' : 'afterend', svg);

  if (behind && window.getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
    return true;
  }

  return false;
}

export function restorePosition(host: HTMLElement, changed: boolean): void {
  if (changed && host.style.position === 'relative') host.style.position = '';
}
