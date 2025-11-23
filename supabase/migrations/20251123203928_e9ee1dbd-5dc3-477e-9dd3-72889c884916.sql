-- Add invite codes to servers for easy sharing and joining

-- Add invite_code column to servers table
ALTER TABLE public.servers 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Create function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate invite codes for new servers
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.servers WHERE invite_code = NEW.invite_code) LOOP
      NEW.invite_code := generate_invite_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_invite_code
BEFORE INSERT ON public.servers
FOR EACH ROW
EXECUTE FUNCTION set_invite_code();

-- Generate invite codes for existing servers
UPDATE public.servers 
SET invite_code = generate_invite_code()
WHERE invite_code IS NULL;