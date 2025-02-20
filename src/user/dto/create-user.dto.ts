export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  companyIds: string[]; // Array of company IDs
}
