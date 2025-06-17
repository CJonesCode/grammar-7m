-- Safe user profile function creation with error handling
DO $$ 
BEGIN
    -- Drop existing function and trigger if they exist
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user();
    RAISE NOTICE 'Dropped existing trigger and function if they existed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No existing trigger/function to drop: %', SQLERRM;
END $$;

-- Create the user profile function
DO $$ 
BEGIN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $func$
    BEGIN
        INSERT INTO public.users (id, email, full_name)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', '')
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, users.full_name);
        RETURN NEW;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Error in handle_new_user function: %', SQLERRM;
            RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
    
    RAISE NOTICE 'Created handle_new_user function successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating handle_new_user function: %', SQLERRM;
END $$;

-- Create the trigger
DO $$ 
BEGIN
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE 'Created trigger on_auth_user_created successfully';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Trigger already exists, this is expected';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating trigger: %', SQLERRM;
END $$;

DO $$ 
BEGIN
    RAISE NOTICE 'User profile function setup completed successfully';
END $$;
