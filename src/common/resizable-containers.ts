type Axis = 'columns' | 'rows';

const MIN_TRACK_SIZE_PX = 80;

type ResizeState = {
  axis: Axis;
  startClient: number;
  container: HTMLElement;
  trackTokens: string[];
  trackSizesPx: number[];
  firstTrack: number;
  secondTrack: number;
};

type ResizerBinding = {
  axis: Axis;
  resizer: HTMLElement;
  container: HTMLElement;
  firstTrack: number;
  secondTrack: number;
};

let activeResize: ResizeState | null = null;

const rootContainer = document.querySelector<HTMLElement>('#main-container');

function splitTrackList(value: string): string[] {
  const tracks: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of value.trim()) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);

    if (ch === ' ' && depth === 0) {
      if (current) {
        tracks.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) tracks.push(current);
  return tracks;
}

function parsePixelTrack(token: string): number | null {
  const match = token.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  if (!match?.[1]) return null;
  return parseFloat(match[1]);
}

function getTrackTokens(container: HTMLElement, axis: Axis): string[] | null {
  const style = getComputedStyle(container);
  const template = axis === 'columns' ? style.gridTemplateColumns : style.gridTemplateRows;

  if (!template || template === 'none') return null;

  const tokens = splitTrackList(template);
  if (tokens.length < 2) return null;

  return tokens;
}

function getTrackSizesPx(container: HTMLElement, axis: Axis): number[] | null {
  const tokens = getTrackTokens(container, axis);
  if (!tokens) return null;

  const sizesPx: number[] = [];
  for (const token of tokens) {
    const size = parsePixelTrack(token);
    if (size === null) return null;
    sizesPx.push(size);
  }

  return sizesPx;
}

function isColumnResizer(element: Element): boolean {
  return element.classList.contains('col-resizer') || element.classList.contains('column-resizer');
}

function isRowResizer(element: Element): boolean {
  return element.classList.contains('row-resizer');
}

function findSiblingPairIndexes(
  container: HTMLElement,
  resizer: HTMLElement,
  isAxisResizer: (element: Element) => boolean,
): [number, number] | null {
  const children = Array.from(container.children);
  const resizerIndex = children.indexOf(resizer);
  if (resizerIndex < 0) return null;

  let leftIndex = -1;
  for (let i = resizerIndex - 1; i >= 0; i -= 1) {
    const candidate = children[i];
    if (candidate && !isAxisResizer(candidate)) {
      leftIndex = i;
      break;
    }
  }

  let rightIndex = -1;
  for (let i = resizerIndex + 1; i < children.length; i += 1) {
    const candidate = children[i];
    if (candidate && !isAxisResizer(candidate)) {
      rightIndex = i;
      break;
    }
  }

  if (leftIndex < 0 || rightIndex < 0) return null;
  return [leftIndex, rightIndex];
}

function collectColumnBindings(root: HTMLElement): ResizerBinding[] {
  const bindings: ResizerBinding[] = [];
  const children = Array.from(root.children);

  children.forEach((node) => {
    if (!(node instanceof HTMLElement) || !isColumnResizer(node)) return;

    const pair = findSiblingPairIndexes(root, node, isColumnResizer);
    if (!pair) return;

    bindings.push({
      axis: 'columns',
      resizer: node,
      container: root,
      firstTrack: pair[0],
      secondTrack: pair[1],
    });
  });

  return bindings;
}

function collectRowBindings(root: HTMLElement): ResizerBinding[] {
  const bindings: ResizerBinding[] = [];
  const resizers = Array.from(root.querySelectorAll<HTMLElement>('.row-resizer'));

  resizers.forEach((resizer) => {
    const container = resizer.parentElement;
    if (!(container instanceof HTMLElement)) return;

    const pair = findSiblingPairIndexes(container, resizer, isRowResizer);
    if (!pair) return;

    bindings.push({
      axis: 'rows',
      resizer,
      container,
      firstTrack: pair[0],
      secondTrack: pair[1],
    });
  });

  return bindings;
}

function canApplyBinding(binding: ResizerBinding): boolean {
  const tokens = getTrackTokens(binding.container, binding.axis);
  if (!tokens) return false;

  return binding.firstTrack >= 0
    && binding.secondTrack >= 0
    && binding.firstTrack < tokens.length
    && binding.secondTrack < tokens.length;
}

function beginResize(binding: ResizerBinding, event: MouseEvent): void {
  const trackTokens = getTrackTokens(binding.container, binding.axis);
  const trackSizesPx = getTrackSizesPx(binding.container, binding.axis);
  if (!trackTokens || !trackSizesPx) return;

  const firstSize = trackSizesPx[binding.firstTrack];
  const secondSize = trackSizesPx[binding.secondTrack];
  if (firstSize === undefined || secondSize === undefined) return;

  activeResize = {
    axis: binding.axis,
    startClient: binding.axis === 'columns' ? event.clientX : event.clientY,
    container: binding.container,
    trackTokens,
    trackSizesPx,
    firstTrack: binding.firstTrack,
    secondTrack: binding.secondTrack,
  };

  event.preventDefault();
}

function onPointerMove(event: MouseEvent): void {
  if (!activeResize) return;

  const currentClient = activeResize.axis === 'columns' ? event.clientX : event.clientY;
  const delta = currentClient - activeResize.startClient;

  const firstSize = activeResize.trackSizesPx[activeResize.firstTrack];
  const secondSize = activeResize.trackSizesPx[activeResize.secondTrack];
  if (firstSize === undefined || secondSize === undefined) return;

  const minDelta = -(firstSize - MIN_TRACK_SIZE_PX);
  const maxDelta = secondSize - MIN_TRACK_SIZE_PX;
  const clampedDelta = Math.min(maxDelta, Math.max(minDelta, delta));

  const updatedFirst = firstSize + clampedDelta;
  const updatedSecond = secondSize - clampedDelta;

  const updatedTokens = [...activeResize.trackTokens];
  updatedTokens[activeResize.firstTrack] = `${updatedFirst}px`;
  updatedTokens[activeResize.secondTrack] = `${updatedSecond}px`;

  if (activeResize.axis === 'columns') {
    activeResize.container.style.gridTemplateColumns = updatedTokens.join(' ');
  } else {
    activeResize.container.style.gridTemplateRows = updatedTokens.join(' ');
  }
}

function stopResize(): void {
  activeResize = null;
}

if (rootContainer) {
  const bindings = [
    ...collectColumnBindings(rootContainer),
    ...collectRowBindings(rootContainer),
  ].filter(canApplyBinding);

  bindings.forEach((binding) => {
    binding.resizer.addEventListener('mousedown', (event) => beginResize(binding, event));
  });
}

window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', stopResize);
