-- Add 'admin' to the profiles.role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'teacher', 'admin'));

-- Helper function to check admin role (mirrors is_teacher())
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Admin can read all profiles
CREATE POLICY "admin_read_profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admin can read all bookings
CREATE POLICY "admin_read_bookings"
  ON public.bookings FOR SELECT
  USING (public.is_admin());

-- Admin can read all availability_ranges
CREATE POLICY "admin_read_availability_ranges"
  ON public.availability_ranges FOR SELECT
  USING (public.is_admin());

-- To seed admin role, run manually:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'p.dhebrail@proton.me';
