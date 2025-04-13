# Garmin Data Extractor

A TypeScript application to extract data from Garmin Connect API and store user credentials securely in Supabase.

## Features

- Secure Garmin Connect authentication
- User credential storage in Supabase with Row Level Security
- Data extraction for:
  - User profile
  - Recent activities
  - Heart rate data
  - Sleep data
  - Steps data
  - Daily activities

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Setup

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Create a `.env` file with the following variables:
```env
GARMIN_USERNAME=your_garmin_email
GARMIN_PASSWORD=your_garmin_password
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
USER_ID=your_user_id
```

3. Create the required Supabase table with RLS policies:
```sql
-- Create the table
create table garmin_auth (
  user_id uuid primary key references auth.users(id),
  garmin_email text not null,
  garmin_password text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable Row Level Security
alter table garmin_auth enable row level security;

-- Create policy to only allow users to see their own data
create policy "Users can only access their own garmin auth"
  on garmin_auth for all
  using (auth.uid() = user_id);
```

## Usage

Run the extractor:
```bash
npm run start
# or
yarn start
```

This will:
1. Authenticate with Garmin Connect using stored credentials
2. Extract user data
3. Save data to JSON files in the `data` directory

## Project Structure

```
garmin-extractor/
├── src/
│   ├── auth/           # Authentication and credential management
│   ├── extractor/      # Data extraction logic
│   └── types/          # TypeScript type definitions
├── data/               # Extracted data (gitignored)
└── dist/              # Compiled JavaScript output
```

## Development

Build the project:
```bash
npm run build
# or
yarn build
```

Run in development mode with auto-reload:
```bash
npm run dev
# or
yarn dev
```

## Type Safety

The project uses TypeScript to ensure type safety and better developer experience. Make sure to run type checks before committing:

```bash
npm run type-check
# or
yarn type-check
```
