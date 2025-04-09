import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpAndUserVerification20240322000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create OTP table
    await queryRunner.query(`
      CREATE TABLE "otp" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL,
        "code" varchar NOT NULL,
        "used" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "expires_at" timestamp NOT NULL
      );
    `);

    // Add verification columns to user table
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN "is_verified" boolean DEFAULT false,
      ADD COLUMN "verified_at" timestamp;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove verification columns from user table
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN "is_verified",
      DROP COLUMN "verified_at";
    `);

    // Drop OTP table
    await queryRunner.query(`
      DROP TABLE "otp";
    `);
  }
}
