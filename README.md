# Garmin Data Extractor

A Node.js application to extract data from Garmin Connect API and store user credentials securely in Supabase.

## Features

- Secure Garmin Connect authentication
- User credential storage in Supabase
- Data extraction for:
  - User profile
  - Recent activities
  - Heart rate data
  - Sleep data
  - Steps data
  - Daily activities

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
GARMIN_USERNAME=your_garmin_email
GARMIN_PASSWORD=your_garmin_password
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
USER_ID=your_user_id
```

3. Create the required Supabase table:
```sql
create table garmin_auth (
  user_id uuid primary key,
  garmin_email text not null,
  garmin_password text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
```

## Usage

Run the extractor:
```bash
npm run start
```

This will:
1. Authenticate with Garmin Connect
2. Extract user data
3. Save data to JSON files in the `data` directory

## Project Structure

- `src/auth/` - Authentication and credential management
- `src/extractor/` - Data extraction logic
- `src/types/` - TypeScript type definitions

## Development

Build the project:
```bash
npm run build
```

Run in development mode with auto-reload:
```bash
npm run dev
``` 