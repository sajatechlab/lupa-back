import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultIssueDate1711466431842 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE invoice 
      SET "issueDate" = NOW() 
      WHERE "issueDate" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No down migration needed
  }
}
