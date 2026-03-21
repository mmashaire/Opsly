import { User } from '../../domain/users/user.entity';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

export class UserService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    async createUser(userData: Partial<User>): Promise<User> {
        const user = new User(userData);
        return await this.userRepository.create(user);
    }

    async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
        return await this.userRepository.update(id, userData);
    }

    async getUser(id: string): Promise<User | null> {
        return await this.userRepository.findById(id);
    }

    async deleteUser(id: string): Promise<void> {
        await this.userRepository.delete(id);
    }
}