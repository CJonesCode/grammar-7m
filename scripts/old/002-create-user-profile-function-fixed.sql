-- Check if function already exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_new_user') THEN
        DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
        RAISE NOTICE 'Dropped existing handle_new_user function';
    END IF;
END $$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user profile, handling conflicts gracefully
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name);
    
    RAISE NOTICE 'User profile created/updated for user: %', NEW.email;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW; -- Don't fail the auth process if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger already exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND trigger_schema = 'auth'
    ) THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
        RAISE NOTICE 'Dropped existing trigger on_auth_user_created';
    END IF;
END $$;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE 'User profile function and trigger created successfully!';
