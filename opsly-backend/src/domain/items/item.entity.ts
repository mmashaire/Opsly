import { v4 as uuidv4 } from 'uuid';

export class Item {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(name: string, description: string) {
        this.id = uuidv4();
        this.name = name;
        this.description = description;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    update(name: string, description: string) {
        this.name = name;
        this.description = description;
        this.updatedAt = new Date();
    }
}