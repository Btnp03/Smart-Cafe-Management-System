# Smart Cafe

Smart Cafe is a cafe operations web app built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.
The project focuses on practical day-to-day cafe workflows: staff authentication, branch-based access, menu management, point-of-sale ordering, and a kitchen board for live order handling.

## Project Goal

This project was built to simulate a real internal system used by cafe staff.
The main focus is operational flow:

- Staff sign in and access the system based on their branch
- Menu items can be created, edited, reviewed, and deleted
- Cashier staff can create orders from the POS screen
- Kitchen staff can view active orders and update food status
- Orders move through a practical workflow: `PREPARING -> READY -> COMPLETED`

## Main Features

- Authentication with Supabase Auth
- Branch-scoped access control for admin and staff users
- POS screen for creating customer orders
- Kitchen board for active order tracking
- Menu management: add, edit, list, and delete menu items
- Order history view
- Status flow for kitchen operations
- Responsive UI for desktop and tablet-style usage

## Status Flow

The kitchen workflow is intentionally simple:

- `PREPARING`: the kitchen is working on the order
- `READY`: the order is finished and ready to serve or pick up
- `COMPLETED`: the order is closed and removed from the active kitchen board
- `CANCELLED`: reserved for cancelled orders

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- ESLint

## Key Screens

- `app/login/page.tsx`: user sign-in
- `app/register/page.tsx`: staff account registration
- `app/select-branch/page.tsx`: branch selection flow
- `app/dashboard/page.tsx`: general dashboard
- `app/menu-system/show-menu/page.tsx`: menu listing and filtering
- `app/menu-system/add-menu/page.tsx`: create menu items
- `app/menu-system/edit/[id]/page.tsx`: edit menu items
- `app/pos-system/pos/page.tsx`: POS order creation
- `app/pos-system/orders/page.tsx`: order history
- `app/kitchen-system/kitchen/page.tsx`: kitchen preparation board

## What I Built

Highlights of the work in this project:

- Designed the cafe workflow for POS and kitchen operations
- Implemented branch-based access rules for admin and non-admin users
- Built a kitchen board that updates active order status in real time
- Improved the POS page to feel production-ready instead of template-like UI
- Resolved TypeScript, lint, image config, and production build issues
- Configured `next/image` for Supabase and Unsplash-hosted images

## Challenges Solved

Some practical issues handled during development:

- Fixed deep TypeScript inference issues caused by Supabase query chains
- Resolved `next/image` remote host configuration problems
- Corrected Supabase relation mapping for kitchen order item names
- Cleaned up build blockers until `tsc`, `lint`, and `next build` all passed

## Demo

Add your live demo and walkthrough links here:

- Live site: `https://your-deployment-url`
- Demo video: `https://your-demo-video-link`

## Screenshots

Suggested screenshots to include in your portfolio or repository:

- Login page
- POS page with active cart
- Kitchen board with order status updates
- Menu management page
- Order history page

Example structure:

```md
![Login screen](./public/screenshots/login.png)
![POS screen](./public/screenshots/pos.png)
![Kitchen board](./public/screenshots/kitchen.png)
```

## Portfolio Summary (TH)

Smart Cafe เป็นเว็บแอปสำหรับจัดการการทำงานภายในร้านคาเฟ่ โดยครอบคลุม flow หลักตั้งแต่การเข้าสู่ระบบของพนักงาน การจัดการเมนู การสร้างออเดอร์ผ่านหน้า POS ไปจนถึงการติดตามสถานะออเดอร์ในฝั่งครัวแบบเรียลไทม์

สิ่งที่พัฒนาด้วยตัวเองในโปรเจ็กต์นี้:

- ออกแบบ workflow การทำงานของระบบร้านคาเฟ่ให้เชื่อมกันระหว่าง POS และ Kitchen
- พัฒนา branch-based access control สำหรับ admin และ staff
- สร้างหน้าจอ POS สำหรับรับออเดอร์และสรุปรายการสินค้า
- สร้าง kitchen board สำหรับอัปเดตสถานะออเดอร์จาก `PREPARING` ไป `READY` และ `COMPLETED`
- ปรับปรุงโครงสร้าง TypeScript, lint, และ production build จนพร้อม deploy
- ตั้งค่า `next/image` และแก้ปัญหา remote image host ให้รองรับ Supabase และ Unsplash

จุดเด่นที่ได้เรียนรู้จากโปรเจ็กต์นี้:

- การออกแบบระบบที่มีหลาย role และหลายหน้าการทำงานร่วมกัน
- การจัดการ state และ data flow ใน React / Next.js
- การเชื่อมต่อ Supabase สำหรับ auth, query, และ relation data
- การแก้ปัญหา build และ type issues ในงานที่ใกล้ production

## Portfolio Entry

Project: Smart Cafe Management System  
Tech Stack: Next.js, React, TypeScript, Tailwind CSS, Supabase

- Developed a web application for managing cafe operations, including staff authentication, branch-based access, menu management, POS ordering, and kitchen order tracking.
- Built the frontend using Next.js and React to support practical internal workflows across cashier, kitchen, and management views.
- Integrated Supabase for authentication, database access, and relational data handling across menus, orders, profiles, and order items.
- Designed and implemented an order status workflow from `PREPARING` to `READY` and `COMPLETED` for real-time kitchen operations.
- Improved production readiness by resolving TypeScript issues, lint errors, image configuration issues, and deployment build blockers.

GitHub: `github.com/your-username/smart-cafe`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Fill in the required values in `.env`

4. Start the development server:

```bash
npm run dev
```

5. Open:

```txt
http://localhost:3000
```

## Environment Variables

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

See [.env.example](./.env.example) for the template.

## Available Scripts

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

## Build Status

The project currently passes:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Notes

- This project uses Supabase as the main backend service for authentication and data access.
- The app is designed around internal operational usage rather than public-facing marketing pages.
- For portfolio presentation, adding screenshots, a short demo video, and a live deployment link is highly recommended.

## Suggested Portfolio Add-ons

To present this project more strongly in an internship portfolio, include:

- 3-5 screenshots of the main flows
- A short demo video
- A live deployment link
- A short paragraph explaining what you personally implemented
