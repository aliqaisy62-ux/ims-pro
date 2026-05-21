# IMS-Pro — دليل التثبيت | Installation Guide

## المتطلبات | Requirements
- Windows 10/11
- Docker Desktop
- Node.js 20+

---

## التثبيت السريع (ويندوز) | Quick Install (Windows)

1. افتح Command Prompt بصلاحيات المدير | Open Command Prompt as Administrator
2. انتقل إلى مجلد المشروع | Navigate to project folder
3. شغّل ملف الإعداد | Run setup:
   ```
   setup.bat
   ```
4. افتح المتصفح على | Open browser at: http://localhost:3000
5. تسجيل الدخول | Login: admin / admin123

---

## التشغيل اليدوي | Manual Start

### وضع التطوير | Development Mode
```
npm run dev
```

### وضع الإنتاج | Production Mode
```
docker-compose up -d
```

---

## النسخ الاحتياطي | Backup
```
scripts/backup.sh
```

---

## إعادة تعيين قاعدة البيانات | Reset Database
```
npm run db:migrate
npm run db:seed
```

---

## الوصول الشبكي | Network Access
Replace localhost with server IP for LAN access.
Default ports: Web=3000, API=4000, DB=5434
