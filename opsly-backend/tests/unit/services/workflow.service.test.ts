import { WorkflowService } from '../../../src/application/services/workflow.service';
import { Workflow } from '../../../src/domain/workflows/workflow.types';

describe('WorkflowService', () => {
    let workflowService: WorkflowService;

    beforeEach(() => {
        workflowService = new WorkflowService();
    });

    describe('createWorkflow', () => {
        it('should create a new workflow', () => {
            const workflowData: Workflow = { id: '1', name: 'Test Workflow', steps: [] };
            const createdWorkflow = workflowService.createWorkflow(workflowData);
            expect(createdWorkflow).toEqual(workflowData);
        });
    });

    describe('updateWorkflow', () => {
        it('should update an existing workflow', () => {
            const workflowData: Workflow = { id: '1', name: 'Updated Workflow', steps: [] };
            workflowService.createWorkflow(workflowData);
            const updatedWorkflow = workflowService.updateWorkflow('1', { name: 'New Name' });
            expect(updatedWorkflow.name).toBe('New Name');
        });
    });

    describe('getWorkflow', () => {
        it('should return the workflow by id', () => {
            const workflowData: Workflow = { id: '1', name: 'Test Workflow', steps: [] };
            workflowService.createWorkflow(workflowData);
            const fetchedWorkflow = workflowService.getWorkflow('1');
            expect(fetchedWorkflow).toEqual(workflowData);
        });
    });
});