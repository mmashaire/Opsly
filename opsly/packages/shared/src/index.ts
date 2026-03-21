export type Item = {
    id: string;
    name: string;
    description: string;
};

export type CreateItemInput = {
    name: string;
    description: string;
};

export type Role = 'admin' | 'user';