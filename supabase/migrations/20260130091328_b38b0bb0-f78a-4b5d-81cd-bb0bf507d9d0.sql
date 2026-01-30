-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create schools table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    school_code TEXT UNIQUE NOT NULL,
    admin_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    school_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    UNIQUE (user_id, role)
);

-- Create scholarships table
CREATE TABLE public.scholarships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2),
    deadline DATE,
    eligibility TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create fees table
CREATE TABLE public.fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create notices table
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's school code
CREATE OR REPLACE FUNCTION public.get_user_school_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_code
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Create function to check if user is admin of a school
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schools
    WHERE admin_id = _user_id
      AND school_code = _school_code
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role" ON public.user_roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for schools
CREATE POLICY "Anyone can view schools" ON public.schools
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert schools" ON public.schools
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE POLICY "Admins can update own schools" ON public.schools
    FOR UPDATE USING (admin_id = auth.uid());

-- RLS Policies for scholarships
CREATE POLICY "Users can view scholarships of their school" ON public.scholarships
    FOR SELECT USING (school_code = public.get_user_school_code(auth.uid()) OR public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can insert scholarships" ON public.scholarships
    FOR INSERT WITH CHECK (public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can update scholarships" ON public.scholarships
    FOR UPDATE USING (public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can delete scholarships" ON public.scholarships
    FOR DELETE USING (public.is_school_admin(auth.uid(), school_code));

-- RLS Policies for fees
CREATE POLICY "Users can view fees of their school" ON public.fees
    FOR SELECT USING (school_code = public.get_user_school_code(auth.uid()) OR public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can insert fees" ON public.fees
    FOR INSERT WITH CHECK (public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can update fees" ON public.fees
    FOR UPDATE USING (public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can delete fees" ON public.fees
    FOR DELETE USING (public.is_school_admin(auth.uid(), school_code));

-- RLS Policies for notices
CREATE POLICY "Users can view notices of their school" ON public.notices
    FOR SELECT USING (school_code = public.get_user_school_code(auth.uid()) OR public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can insert notices" ON public.notices
    FOR INSERT WITH CHECK (public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can update notices" ON public.notices
    FOR UPDATE USING (public.is_school_admin(auth.uid(), school_code));

CREATE POLICY "Admins can delete notices" ON public.notices
    FOR DELETE USING (public.is_school_admin(auth.uid(), school_code));

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scholarships_updated_at
    BEFORE UPDATE ON public.scholarships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fees_updated_at
    BEFORE UPDATE ON public.fees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notices_updated_at
    BEFORE UPDATE ON public.notices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notices
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;