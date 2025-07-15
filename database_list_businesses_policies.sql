-- List all policies for the 'businesses' table
SELECT
  polname AS policy_name,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'businesses';

-- List RLS status for the 'businesses' table
SELECT relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'businesses';

-- List all grants for the 'businesses' table
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'businesses';

-- List all users/roles
SELECT rolname FROM pg_roles;
