import { Item, CreateItemInput } from '@opsly/shared';

const items: Item[] = [];

export const getItems = (): Item[] => {
    return items;
};

export const getItemById = (id: string): Item | undefined => {
    return items.find(item => item.id === id);
};

export const createItem = (input: CreateItemInput): Item => {
    const newItem: Item = {
        id: generateId(),
        ...input,
    };
    items.push(newItem);
    return newItem;
};

const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};