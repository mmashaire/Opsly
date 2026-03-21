import { v4 as uuidv4 } from 'uuid';
import { UserRole } from './user.types';

export class User {
    id: string;
    username: string;
    role: UserRole;

    constructor(username: string, role: UserRole) {
        this.id = uuidv4();
        this.username = username;
        this.role = role;
    }

    // Additional methods for user-related operations can be added here
    updateUsername(newUsername: string) {
        this.username = newUsername;
    }

    updateRole(newRole: UserRole) {
        this.role = newRole;
    }
}