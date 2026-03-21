export type Workflow = {
    id: string;
    name: string;
    steps: WorkflowStep[];
};

export type WorkflowStep = {
    id: string;
    name: string;
    order: number;
    status: 'pending' | 'in-progress' | 'completed';
};

export type WorkflowDTO = {
    name: string;
    steps: Omit<WorkflowStep, 'id'>[];
};