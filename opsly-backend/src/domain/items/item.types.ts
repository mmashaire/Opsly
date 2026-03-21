export interface Item {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ItemDTO {
    name: string;
    description: string;
}