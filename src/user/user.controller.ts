import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  async signup(@Body() req) {
    const { fullName, email, password } = req;
    console.log('signup', req);
    try {
      const user = await this.userService.createUser({
        name: fullName,
        email,
        password,
      });
      return { status: 201, data: user };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  // Add login and other user-related endpoints as needed
}
