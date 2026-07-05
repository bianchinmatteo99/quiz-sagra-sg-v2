import { FirebaseDatabaseAdapter } from "../common/database/firebase.adapter";
import { QuizManager } from "../common/quiz/quiz.manager";

document.addEventListener('DOMContentLoaded', async function () {
    const quizManager = new QuizManager(new FirebaseDatabaseAdapter());
    await quizManager.boot("/quiz_def.md");
    await quizManager.start();
});


/* ---------------- RESIZABLE CONTAINERS ---------------- */

const container = document.querySelector<HTMLDivElement>("#main-container");
if (!container) throw new Error("Missing #main-container element");

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

let activeColResizer: ColResizeState | null = null;
let activeRow: RowResizeState | null = null;

function parseGrid(value: string): number[] {
  return value.split(" ").map(v => parseFloat(v));
}

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