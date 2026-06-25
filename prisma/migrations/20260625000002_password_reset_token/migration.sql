-- Add password reset token fields to users table
ALTER TABLE "users" ADD COLUMN "password_reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN "password_reset_token_expiry" TIMESTAMP(3);
ALTER TABLE "users" ADD CONSTRAINT "users_password_reset_token_key" UNIQUE ("password_reset_token");
