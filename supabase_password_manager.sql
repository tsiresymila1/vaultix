-- Migration to add password_entries table for the Password Manager feature

CREATE TABLE IF NOT EXISTS password_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    website_url TEXT,
    username TEXT,
    encrypted_password TEXT NOT NULL,
    password_nonce TEXT NOT NULL,
    encrypted_otp_seed TEXT,
    otp_nonce TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE password_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own passwords" ON password_entries 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create a dummy entry for demo purposes
-- INSERT INTO password_entries (user_id, title, website_url, username, encrypted_password, password_nonce)
-- VALUES ('<YOUR_USER_ID>', 'Example Account', 'example.com', 'user@example.com', 'encrypted_data', 'nonce_data');
