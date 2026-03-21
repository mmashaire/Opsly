import { User } from '../../domain/users/user.entity';
import { UserDTO } from '../../application/dto/index';
import { Database } from '../database'; // Assuming a Database module for data access

export class UserRepository {
    private db: Database;

    constructor() {
        this.db = new Database(); // Initialize the database connection
    }

    async createUser(userDTO: UserDTO): Promise<User> {
        const user = new User(userDTO);
        // Logic to save user to the database
        await this.db.save(user);
        return user;
    }

    async getUser(id: string): Promise<User | null> {
        // Logic to retrieve user from the database
        return await this.db.find(User, id);
    }

    async updateUser(id: string, userDTO: UserDTO): Promise<User | null> {
        const user = await this.getUser(id);
        if (user) {
            Object.assign(user, userDTO);
            // Logic to update user in the database
            await this.db.update(user);
            return user;
        }
        return null;
    }

    async deleteUser(id: string): Promise<boolean> {
        // Logic to delete user from the database
        return await this.db.delete(User, id);
    }
}