# VPay Database Setup Guide

## 🚨 Problem
SQLite doesn't support:
- `String[]` arrays (like `skills String[]`)
- `enum` types (like `KycStatus`, `TaskStatus`)

## ✅ Two Solutions Available

---

## Option 1: SQLite (Quick Development)

### When to use:
- ✅ Quick prototyping and testing
- ✅ No external database setup needed
- ✅ Simple local development

### Setup Steps:

1. **Use SQLite schema:**
```bash
cd backend
cp prisma/sqlite-schema.prisma prisma/schema.prisma
```

2. **Use SQLite environment:**
```bash
cp .env.sqlite .env
```

3. **Generate Prisma client and migrate:**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. **Seed database (optional):**
```bash
npm run seed
```

### Changes Made:
- `String[]` → `String` (comma-separated values)
- `enum KycStatus` → `String` with default values
- Arrays stored as: `"javascript,react,nodejs"`

---

## Option 2: PostgreSQL (RECOMMENDED)

### When to use:
- ✅ Production-ready application
- ✅ Full feature support (arrays + enums)
- ✅ Better performance and scalability
- ✅ Real VPay deployment

### Setup Options:

#### A. Local PostgreSQL
1. **Install PostgreSQL:**
   - Windows: Download from https://postgresql.org/download/windows/
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres`

2. **Create database:**
```sql
CREATE DATABASE verypay;
CREATE USER verypay_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE verypay TO verypay_user;
```

#### B. Cloud PostgreSQL (Easier)
Choose one of these free options:

**Neon (Recommended):**
1. Go to https://neon.tech/
2. Create free account
3. Create new project
4. Copy connection string

**Supabase:**
1. Go to https://supabase.com/
2. Create free account  
3. Create new project
4. Go to Settings → Database → Copy connection string

**Railway:**
1. Go to https://railway.app/
2. Create free account
3. Add PostgreSQL service
4. Copy connection string

### Setup Steps:

1. **Use PostgreSQL schema:**
```bash
cd backend
cp prisma/postgres-schema.prisma prisma/schema.prisma
```

2. **Use PostgreSQL environment:**
```bash
cp .env.postgres .env
```

3. **Update DATABASE_URL in .env:**
```env
# Example for Neon:
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/verypay?sslmode=require"

# Example for local:
DATABASE_URL="postgresql://verypay_user:your_password@localhost:5432/verypay"
```

4. **Generate Prisma client and migrate:**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. **Seed database (optional):**
```bash
npm run seed
```

---

## 🎯 My Recommendation

**Use PostgreSQL (Option 2)** because:
- ✅ Native support for arrays and enums
- ✅ Production-ready for VPay
- ✅ Better performance
- ✅ No data conversion needed
- ✅ Free cloud options available

## Quick Start Commands

### For SQLite (Quick Testing):
```bash
cd backend
cp prisma/sqlite-schema.prisma prisma/schema.prisma
cp .env.sqlite .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### For PostgreSQL (Recommended):
```bash
cd backend
cp prisma/postgres-schema.prisma prisma/schema.prisma
cp .env.postgres .env
# Edit .env with your DATABASE_URL
npx prisma generate  
npx prisma migrate dev --name init
npm run dev
```

## Troubleshooting

### Common Issues:
1. **"Environment variable not found: DATABASE_URL"**
   - Make sure `.env` file exists in `/backend/`
   - Copy from `.env.sqlite` or `.env.postgres`

2. **"Can't reach database server"**
   - Check your DATABASE_URL is correct
   - For cloud DB: ensure connection string includes `?sslmode=require`

3. **Migration fails**
   - Delete `prisma/migrations/` folder
   - Run `npx prisma migrate dev --name init` again

### Need Help?
- Check Prisma docs: https://prisma.io/docs
- VPay is ready to run once database is set up! 🚀
