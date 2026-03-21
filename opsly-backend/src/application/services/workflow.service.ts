import { Workflow } from '../../domain/workflows/workflow.types';
import { WorkflowRepository } from '../../infrastructure/repositories/workflow.repository';

export class WorkflowService {
    private workflowRepository: WorkflowRepository;

    constructor() {
        this.workflowRepository = new WorkflowRepository();
    }

    async createWorkflow(workflowData: Workflow): Promise<Workflow> {
        // Validate workflow data here
        return await this.workflowRepository.create(workflowData);
    }

    async updateWorkflow(id: string, workflowData: Partial<Workflow>): Promise<Workflow | null> {
        // Validate workflow data here
        return await this.workflowRepository.update(id, workflowData);
    }

    async getWorkflow(id: string): Promise<Workflow | null> {
        return await this.workflowRepository.findById(id);
    }

    async getAllWorkflows(): Promise<Workflow[]> {
        return await this.workflowRepository.findAll();
    }

    async deleteWorkflow(id: string): Promise<void> {
        await this.workflowRepository.delete(id);
    }
}