import { ItemService } from '../../../../src/application/services/item.service';
import { Item } from '../../../../src/domain/items/item.types';

describe('ItemService', () => {
    let itemService: ItemService;

    beforeEach(() => {
        itemService = new ItemService();
    });

    describe('createItem', () => {
        it('should create a new item', () => {
            const newItem: Item = { id: '1', name: 'Test Item', description: 'This is a test item' };
            const createdItem = itemService.createItem(newItem);
            expect(createdItem).toEqual(newItem);
        });
    });

    describe('updateItem', () => {
        it('should update an existing item', () => {
            const existingItem: Item = { id: '1', name: 'Test Item', description: 'This is a test item' };
            itemService.createItem(existingItem);
            const updatedItem: Item = { id: '1', name: 'Updated Item', description: 'This is an updated test item' };
            const result = itemService.updateItem(updatedItem);
            expect(result).toEqual(updatedItem);
        });
    });

    describe('deleteItem', () => {
        it('should delete an existing item', () => {
            const existingItem: Item = { id: '1', name: 'Test Item', description: 'This is a test item' };
            itemService.createItem(existingItem);
            const result = itemService.deleteItem('1');
            expect(result).toBeTruthy();
        });
    });
});