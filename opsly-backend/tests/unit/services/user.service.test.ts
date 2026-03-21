import { UserService } from '../../../src/application/services/user.service';
import { UserRepository } from '../../../src/infrastructure/repositories/user.repository';
import { User } from '../../../src/domain/users/user.types';

describe('UserService', () => {
    let userService: UserService;
    let userRepository: UserRepository;

    beforeEach(() => {
        userRepository = new UserRepository();
        userService = new UserService(userRepository);
    });

    describe('createUser', () => {
        it('should create a user successfully', async () => {
            const userData: User = { id: '1', username: 'testuser', role: 'admin' };
            jest.spyOn(userRepository, 'create').mockResolvedValue(userData);

            const result = await userService.createUser(userData);
            expect(result).toEqual(userData);
            expect(userRepository.create).toHaveBeenCalledWith(userData);
        });
    });

    describe('getUser', () => {
        it('should return a user by id', async () => {
            const userData: User = { id: '1', username: 'testuser', role: 'admin' };
            jest.spyOn(userRepository, 'findById').mockResolvedValue(userData);

            const result = await userService.getUser('1');
            expect(result).toEqual(userData);
            expect(userRepository.findById).toHaveBeenCalledWith('1');
        });

        it('should throw an error if user not found', async () => {
            jest.spyOn(userRepository, 'findById').mockResolvedValue(null);

            await expect(userService.getUser('1')).rejects.toThrow('User not found');
        });
    });

    describe('updateUser', () => {
        it('should update a user successfully', async () => {
            const userData: User = { id: '1', username: 'testuser', role: 'admin' };
            const updatedData: User = { id: '1', username: 'updateduser', role: 'admin' };
            jest.spyOn(userRepository, 'update').mockResolvedValue(updatedData);

            const result = await userService.updateUser('1', updatedData);
            expect(result).toEqual(updatedData);
            expect(userRepository.update).toHaveBeenCalledWith('1', updatedData);
        });
    });
});