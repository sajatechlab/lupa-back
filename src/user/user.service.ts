import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { hashPassword } from '../utils/password.util';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(data: { name: string; email: string; password: string }) {
    const existingUser = await this.userRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await hashPassword(data.password);
    return this.userRepository.createUser({
      ...data,
      password: hashedPassword,
    });
  }

  // Add login and other user-related methods as needed
}
