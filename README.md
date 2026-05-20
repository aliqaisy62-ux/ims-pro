# IMS-Pro — Inventory & Point-of-Sale Management System

A full-stack commercial POS and inventory system for the Iraqi market.

## Features
- Dual currency: USD + IQD
- Bilingual: Arabic (RTL) + English (LTR)
- 4 user roles: Admin, Manager, Cashier, Viewer
- Barcode scanning (USB + camera)
- 5 price types per item
- Complete invoicing (sales + purchases)
- Reports with PDF + Excel export
- LAN-hosted deployment

## Stack
- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 15, Prisma ORM
- **Auth**: JWT + RBAC
- **Deployment**: Docker + Nginx

## Quick Start

1. Copy `.env.example` to `.env` and fill in the values
2. Run `docker-compose up -d postgres` to start the database
3. Run `npm install` in the root
4. Run `npm run db:migrate` to run migrations
5. Run `npm run db:seed` to seed initial data
6. Run `npm run dev` to start both web and API in development mode

## Project Structure
See `CLAUDE.md` for full architecture documentation.
