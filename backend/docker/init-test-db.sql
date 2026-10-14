-- Runs once, when the Docker volume is first created. Tests use this database
-- so they never touch your development data.
CREATE DATABASE orca_test OWNER orca;
