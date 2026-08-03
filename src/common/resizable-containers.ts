type Axis = 'columns' | 'rows';

const MIN_TRACK_SIZE_PX = 80;

type GridTemplateInfo = {
  tokens: string[];
  sizesPx: number[];
  gapPx: number;
};

type ResizeState = {
  axis: Axis;
  startClient: number;
  container: HTMLElement;
  trackTokens: string[];
  trackSizesPx: number[];
  firstTrack: number;
  secondTrack: number;
};

let activeResize: ResizeState | null = null;

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

function getTemplateInfo(container: HTMLElement, axis: Axis): GridTemplateInfo | null {
  const style = getComputedStyle(container);
  const template = axis === 'columns' ? style.gridTemplateColumns : style.gridTemplateRows;

  if (!template || template === 'none') return null;

  const tokens = splitTrackList(template);
  if (tokens.length < 2) return null;

  const sizesPx: number[] = [];
  for (const token of tokens) {
    const size = parsePixelTrack(token);
    if (size === null) return null;
    sizesPx.push(size);
  }

  const gapRaw = axis === 'columns' ? style.columnGap : style.rowGap;
  const parsedGap = Number.parseFloat(gapRaw);
  const gapPx = Number.isFinite(parsedGap) ? parsedGap : 0;

  return { tokens, sizesPx, gapPx };
}

function findGridContainer(start: HTMLElement, axis: Axis): { container: HTMLElement; info: GridTemplateInfo } | null {
  let current: HTMLElement | null = start.parentElement;

  while (current) {
    const display = getComputedStyle(current).display;
    if (display.includes('grid')) {
      const info = getTemplateInfo(current, axis);
      if (info) return { container: current, info };
    }
    current = current.parentElement;
  }

  return null;
}

function findTrackAtPosition(position: number, sizesPx: number[], gapPx: number): number {
  let cursor = 0;

  for (let i = 0; i < sizesPx.length; i += 1) {
    const size = sizesPx[i];
    if (size === undefined) break;

    const start = cursor;
    const end = start + size;
    if (position >= start && position <= end) return i;
    cursor = end + gapPx;
  }

  return -1;
}

function findAdjacentTrackPair(position: number, sizesPx: number[], gapPx: number): [number, number] | null {
  if (sizesPx.length < 2) return null;

  const insideTrack = findTrackAtPosition(position, sizesPx, gapPx);
  const insideTrackSize = insideTrack >= 0 ? sizesPx[insideTrack] : undefined;
  if (insideTrack > 0 && insideTrack < sizesPx.length - 1 && insideTrackSize !== undefined && insideTrackSize <= 16) {
    return [insideTrack - 1, insideTrack + 1];
  }

  let bestBoundary = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  const firstSize = sizesPx[0];
  if (firstSize === undefined) return null;
  let cursor = firstSize;

  for (let leftTrack = 0; leftTrack < sizesPx.length - 1; leftTrack += 1) {
    const boundary = cursor + (gapPx / 2);
    const distance = Math.abs(position - boundary);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestBoundary = leftTrack;
    }

    const nextSize = sizesPx[leftTrack + 1];
    if (nextSize === undefined) break;
    cursor += gapPx + nextSize;
  }

  return [bestBoundary, bestBoundary + 1];
}

function beginResize(axis: Axis, resizer: HTMLElement, event: MouseEvent): void {
  const gridData = findGridContainer(resizer, axis);
  if (!gridData) return;

  const { container, info } = gridData;
  const containerRect = container.getBoundingClientRect();
  const resizerRect = resizer.getBoundingClientRect();

  const position = axis === 'columns'
    ? (resizerRect.left + (resizerRect.width / 2) - containerRect.left)
    : (resizerRect.top + (resizerRect.height / 2) - containerRect.top);

  const pair = findAdjacentTrackPair(position, info.sizesPx, info.gapPx);
  if (!pair) return;

  activeResize = {
    axis,
    startClient: axis === 'columns' ? event.clientX : event.clientY,
    container,
    trackTokens: [...info.tokens],
    trackSizesPx: [...info.sizesPx],
    firstTrack: pair[0],
    secondTrack: pair[1],
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

document.querySelectorAll<HTMLElement>('.col-resizer').forEach((resizer) => {
  resizer.addEventListener('mousedown', (event) => beginResize('columns', resizer, event));
});

document.querySelectorAll<HTMLElement>('.row-resizer').forEach((resizer) => {
  resizer.addEventListener('mousedown', (event) => beginResize('rows', resizer, event));
});

window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', stopResize);
