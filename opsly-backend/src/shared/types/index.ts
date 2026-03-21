export type UUID = string;

export interface BaseEntity {
    id: UUID;
    createdAt: Date;
    updatedAt: Date;
}

export interface ErrorResponse {
    message: string;
    statusCode: number;
}

export interface Pagination<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}