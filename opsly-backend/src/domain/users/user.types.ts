export interface User {
    id: string;
    username: string;
    password: string;
    role: UserRole;
}

export interface UserDTO {
    username: string;
    password: string;
    role: UserRole;
}

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    GUEST = 'guest',
}