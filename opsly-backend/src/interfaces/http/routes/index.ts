import { Router } from 'express';
import ItemController from '../controllers/item.controller';
import UserController from '../controllers/user.controller';
import WorkflowController from '../controllers/workflow.controller';

const router = Router();

// Item routes
router.post('/items', ItemController.createItem);
router.get('/items/:id', ItemController.getItem);
router.put('/items/:id', ItemController.updateItem);
router.delete('/items/:id', ItemController.deleteItem);

// User routes
router.post('/users', UserController.createUser);
router.get('/users/:id', UserController.getUser);
router.put('/users/:id', UserController.updateUser);
router.delete('/users/:id', UserController.deleteUser);

// Workflow routes
router.post('/workflows', WorkflowController.createWorkflow);
router.get('/workflows/:id', WorkflowController.getWorkflow);
router.put('/workflows/:id', WorkflowController.updateWorkflow);
router.delete('/workflows/:id', WorkflowController.deleteWorkflow);

export default router;