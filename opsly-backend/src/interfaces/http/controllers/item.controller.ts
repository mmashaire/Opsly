import { Request, Response } from 'express';
import { ItemService } from '../../../application/services/item.service';
import { ItemDTO } from '../../../application/dto/index';

export class ItemController {
    private itemService: ItemService;

    constructor() {
        this.itemService = new ItemService();
    }

    public async createItem(req: Request, res: Response): Promise<void> {
        try {
            const itemData: ItemDTO = req.body;
            const newItem = await this.itemService.createItem(itemData);
            res.status(201).json(newItem);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public async updateItem(req: Request, res: Response): Promise<void> {
        try {
            const itemId = req.params.id;
            const itemData: ItemDTO = req.body;
            const updatedItem = await this.itemService.updateItem(itemId, itemData);
            res.status(200).json(updatedItem);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public async getItem(req: Request, res: Response): Promise<void> {
        try {
            const itemId = req.params.id;
            const item = await this.itemService.getItem(itemId);
            if (item) {
                res.status(200).json(item);
            } else {
                res.status(404).json({ message: 'Item not found' });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public async deleteItem(req: Request, res: Response): Promise<void> {
        try {
            const itemId = req.params.id;
            await this.itemService.deleteItem(itemId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}