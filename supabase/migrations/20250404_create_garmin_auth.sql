-- Create the garmin_auth table
create table garmin_auth (
  user_id uuid primary key references auth.users(id),
  garmin_email text not null,
  garmin_password text not null,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable Row Level Security
alter table garmin_auth enable row level security;

-- Create policy to only allow users to see their own garmin auth
create policy "Users can only access their own garmin auth"
  on garmin_auth for all
  using (auth.uid() = user_id); 