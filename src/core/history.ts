import { parseProject } from './project';
import type { Project } from './project';
export class ProjectHistory {
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];
  private value: Project;
  constructor(project: Project, private limit = 50) { this.value = parseProject(project); }
  get current() { return structuredClone(this.value); }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  commit(project: Project) {
    const next = parseProject(project);
    if (JSON.stringify(next) === JSON.stringify(this.value)) return this.current;
    this.undoStack.push(this.value); if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.value = next; this.redoStack = []; return this.current;
  }
  undo() { const prev = this.undoStack.pop(); if (prev) { this.redoStack.push(this.value); this.value = prev; } return this.current; }
  redo() { const next = this.redoStack.pop(); if (next) { this.undoStack.push(this.value); this.value = next; } return this.current; }
}
