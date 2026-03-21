export type Item = {
    id: string;
    name: string;
    description: string;
};

export type CreateItemInput = {
    name: string;
    description: string;
};

const items: Item[] = [];

export const createItem = (input: CreateItemInput): Item => {
    const newItem: Item = {
        id: generateId(),
        name: input.name,
        description: input.description,
    };
    items.push(newItem);
    return newItem;
};

export const getItems = (): Item[] => {
    return items;
};

export const getItemById = (id: string): Item | undefined => {
    return items.find(item => item.id === id);
};

const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};