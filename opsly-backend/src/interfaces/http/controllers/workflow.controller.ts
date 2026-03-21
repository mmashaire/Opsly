import { Request, Response } from 'express';
import { WorkflowService } from '../../../application/services/workflow.service';
import { WorkflowDTO } from '../../../application/dto/index';

export class WorkflowController {
    private workflowService: WorkflowService;

    constructor() {
        this.workflowService = new WorkflowService();
    }

    public async createWorkflow(req: Request, res: Response): Promise<void> {
        try {
            const workflowData: WorkflowDTO = req.body;
            const newWorkflow = await this.workflowService.createWorkflow(workflowData);
            res.status(201).json(newWorkflow);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public async updateWorkflow(req: Request, res: Response): Promise<void> {
        try {
            const workflowId = req.params.id;
            const workflowData: WorkflowDTO = req.body;
            const updatedWorkflow = await this.workflowService.updateWorkflow(workflowId, workflowData);
            res.status(200).json(updatedWorkflow);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public async getWorkflow(req: Request, res: Response): Promise<void> {
        try {
            const workflowId = req.params.id;
            const workflow = await this.workflowService.getWorkflow(workflowId);
            res.status(200).json(workflow);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}