import { Item } from '../../domain/items/item.types';
import { ItemRepository } from '../../infrastructure/repositories/item.repository';

export class ItemService {
    private itemRepository: ItemRepository;

    constructor() {
        this.itemRepository = new ItemRepository();
    }

    async createItem(itemData: Item): Promise<Item> {
        // Validate item data here
        return this.itemRepository.create(itemData);
    }

    async updateItem(id: string, itemData: Partial<Item>): Promise<Item | null> {
        // Validate item data here
        return this.itemRepository.update(id, itemData);
    }

    async deleteItem(id: string): Promise<boolean> {
        return this.itemRepository.delete(id);
    }

    async getItem(id: string): Promise<Item | null> {
        return this.itemRepository.findById(id);
    }

    async getAllItems(): Promise<Item[]> {
        return this.itemRepository.findAll();
    }
}