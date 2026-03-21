import { v4 as uuidv4 } from 'uuid';

export class Workflow {
    id: string;
    name: string;
    steps: string[];

    constructor(name: string, steps: string[] = []) {
        this.id = uuidv4();
        this.name = name;
        this.steps = steps;
    }

    addStep(step: string): void {
        this.steps.push(step);
    }

    removeStep(step: string): void {
        this.steps = this.steps.filter(s => s !== step);
    }

    getSteps(): string[] {
        return this.steps;
    }
}