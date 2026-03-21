import { Item } from '../../domain/items/item.types';

export class ItemRepository {
    private items: Item[] = [];

    public async create(item: Item): Promise<Item> {
        this.items.push(item);
        return item;
    }

    public async findById(id: string): Promise<Item | undefined> {
        return this.items.find(item => item.id === id);
    }

    public async update(id: string, updatedItem: Partial<Item>): Promise<Item | undefined> {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) return undefined;

        this.items[index] = { ...this.items[index], ...updatedItem };
        return this.items[index];
    }

    public async delete(id: string): Promise<boolean> {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) return false;

        this.items.splice(index, 1);
        return true;
    }

    public async findAll(): Promise<Item[]> {
        return this.items;
    }
}