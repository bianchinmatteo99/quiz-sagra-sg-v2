import { app , auth, database } from "../firebase-init";

document.addEventListener('DOMContentLoaded', function () {
    const loadEl = document.querySelector('#load');
    // firebase.auth().onAuthStateChanged(user => { });
    // firebase.database().ref('/path/to/ref').on('value', snapshot => { });

    try {
        let features: string[] = [];
        if (auth) features.push('auth');
        if (database) features.push('database');

        if (loadEl) {
            loadEl.textContent = `Firebase SDK loaded with ${features.join(', ')}`;
        }
    } catch (e) {
        console.error(e);
        if (loadEl) {
            loadEl.textContent = 'Error loading the Firebase SDK, check the console.';
        }
    }
});


const container = document.querySelector<HTMLDivElement>("#main-container");
if (!container) throw new Error("Missing #main-container element");

/* ---------------- TYPES ---------------- */

type ColResizeState = {
  startX: number;
  resizer: HTMLElement;
  startGrid: number[];
};

type RowResizeState = {
  startY: number;
  col: HTMLElement;
  startGrid: number[];
};

/* ---------------- STATE ---------------- */

let activeColResizer: ColResizeState | null = null;
let activeRow: RowResizeState | null = null;

/* ---------------- HELPERS ---------------- */

function parseGrid(value: string): number[] {
  return value.split(" ").map(v => parseFloat(v));
}

/* ---------------- COLUMN RESIZING ---------------- */

const colResizers = document.querySelectorAll<HTMLElement>(".col-resizer");

colResizers.forEach(resizer => {
  resizer.addEventListener("mousedown", (e: MouseEvent) => {
    activeColResizer = {
      startX: e.clientX,
      resizer,
      startGrid: parseGrid(getComputedStyle(container).gridTemplateColumns),
    };
  });
});

window.addEventListener("mousemove", (e: MouseEvent) => {
  if (!activeColResizer) return;

  const dx = e.clientX - activeColResizer.startX;
  const cols = activeColResizer.startGrid;

  const sidebar = cols[0];
  const colA = cols[2];
  const colB = cols[4];

  const resizerIndex = Array.from(container.children).indexOf(activeColResizer.resizer);

  if (resizerIndex === 1) {
    const newSidebar = sidebar + dx;
    const newColA = colA - dx;

    container.style.gridTemplateColumns =
      `${newSidebar}px 6px ${newColA}px 6px ${colB}px`;
  }

  if (resizerIndex === 3) {
    const newColA = colA + dx;
    const newColB = colB - dx;

    container.style.gridTemplateColumns =
      `${sidebar}px 6px ${newColA}px 6px ${newColB}px`;
  }
});

window.addEventListener("mouseup", () => {
  activeColResizer = null;
});

/* ---------------- ROW RESIZING ---------------- */

const cols = document.querySelectorAll<HTMLElement>(".col");

cols.forEach(col => {
  const resizer = col.querySelector<HTMLElement>(".row-resizer");
  if (!resizer) return;

  resizer.addEventListener("mousedown", (e: MouseEvent) => {
    activeRow = {
      startY: e.clientY,
      col,
      startGrid: parseGrid(getComputedStyle(col).gridTemplateRows),
    };
  });
});

window.addEventListener("mousemove", (e: MouseEvent) => {
  if (!activeRow) return;

  const dy = e.clientY - activeRow.startY;
  const rows = activeRow.startGrid;

  const top = rows[0];
  const bottom = rows[2];

  activeRow.col.style.gridTemplateRows =
    `${top + dy}px 6px ${bottom - dy}px`;
});

window.addEventListener("mouseup", () => {
  activeRow = null;
});