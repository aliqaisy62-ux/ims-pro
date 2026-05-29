# دليل التثبيت — IMS-Pro Installation Guide

---

## العربية | Arabic

### المتطلبات الأساسية

| المتطلب | الإصدار الأدنى |
|---|---|
| Windows 10/11 أو Linux/macOS | — |
| Docker Desktop | 24+ |
| ذاكرة RAM | 4 GB كحد أدنى |
| مساحة القرص | 5 GB |

> **ملاحظة:** لا يلزم تثبيت Node.js أو PostgreSQL على جهاز الخادم. كل شيء يعمل داخل Docker.

---

### الخطوة 1 — تثبيت Docker Desktop

- **Windows:** [https://docs.docker.com/desktop/windows/](https://docs.docker.com/desktop/windows/)
- **Linux:** [https://docs.docker.com/desktop/linux/](https://docs.docker.com/desktop/linux/)

تأكد من تشغيل Docker قبل المتابعة.

---

### الخطوة 2 — تشغيل سكريبت الإعداد

**على Windows:**
```bat
setup.bat 192.168.1.100
```

**على Linux/macOS:**
```bash
bash setup.sh 192.168.1.100
```

استبدل `192.168.1.100` بعنوان IP الفعلي لجهاز الخادم على الشبكة.  
سيقوم السكريبت تلقائياً بـ:
1. إنشاء ملف `.env` مع مفاتيح JWT آمنة
2. بناء وتشغيل جميع حاويات Docker
3. تهيئة قاعدة البيانات وإضافة البيانات الأولية
4. جدولة النسخ الاحتياطي اليومي الساعة 2:00 صباحاً

---

### الخطوة 3 — الوصول للنظام

افتح المتصفح على أي جهاز في الشبكة:
```
http://192.168.1.100
```

بيانات الدخول:
- المستخدم: القيمة التي حددتها في `SEED_ADMIN_USERNAME` (الافتراضي: `admin`)
- كلمة المرور: القيمة التي حددتها في `SEED_ADMIN_PASSWORD` (لا توجد كلمة مرور افتراضية)

> **⚠️ مهم:** لا توجد بيانات افتراضية. يجب تعيين `SEED_ADMIN_PASSWORD` قبل أول تشغيل.

---

### الخطوة 4 — إعداد الشبكة المحلية

1. تأكد أن جدار الحماية (Windows Firewall) يسمح بالمنفذ **80**
2. على Windows: ابحث عن "Windows Defender Firewall" ← "Advanced Settings" ← "Inbound Rules" ← أضف قاعدة للمنفذ TCP 80
3. جرّب الوصول من جهاز آخر على نفس الشبكة

---

### النسخ الاحتياطي

#### تشغيل النسخ الاحتياطي يدوياً:

**Windows:**
```bat
scripts\backup.bat
```

**Linux/macOS:**
```bash
bash scripts/backup.sh
```

تُخزن النسخ الاحتياطية في مجلد `backups/` بصيغة `.sql.gz`.  
يتم حذف النسخ الأقدم من 30 يوماً تلقائياً (قابل للتعديل في `.env`).

#### استعادة نسخة احتياطية:
```bash
# Linux/macOS
gunzip -c backups/backup_20260101_020000.sql.gz | \
  docker exec -i ims-pro-db psql -U imspro ims_pro

# Windows (PowerShell)
cmd /c "gzip -d -c backups\backup_20260101_020000.sql.gz | docker exec -i ims-pro-db psql -U imspro ims_pro"
```

---

### إيقاف وإعادة تشغيل النظام

```bash
# إيقاف
docker compose down

# إعادة التشغيل
docker compose up -d

# عرض السجلات
docker compose logs -f api
docker compose logs -f web
```

---

### حل المشكلات الشائعة

| المشكلة | الحل |
|---|---|
| لا يمكن الوصول من أجهزة أخرى | تحقق من جدار الحماية — افتح المنفذ 80 |
| خطأ في تشغيل Docker | شغّل Docker Desktop أولاً |
| نسيت كلمة المرور | `node scripts/reset-admin-password.ts` |
| قاعدة البيانات لا تبدأ | `docker compose logs postgres` |
| النسخ الاحتياطي يفشل | تأكد أن Docker يعمل وأن `ims-pro-db` نشط |

---

---

## English

### Prerequisites

| Requirement | Minimum |
|---|---|
| Windows 10/11 or Linux/macOS | — |
| Docker Desktop | 24+ |
| RAM | 4 GB |
| Disk Space | 5 GB |

> **Note:** Node.js and PostgreSQL do not need to be installed on the server machine. Everything runs inside Docker.

---

### Step 1 — Install Docker Desktop

- **Windows:** [https://docs.docker.com/desktop/windows/](https://docs.docker.com/desktop/windows/)
- **Linux:** [https://docs.docker.com/desktop/linux/](https://docs.docker.com/desktop/linux/)

Make sure Docker is running before continuing.

---

### Step 2 — Run the Setup Script

**On Windows:**
```bat
setup.bat 192.168.1.100
```

**On Linux/macOS:**
```bash
bash setup.sh 192.168.1.100
```

Replace `192.168.1.100` with the actual IP address of the server machine on your network.  
The script automatically:
1. Creates a `.env` file with secure auto-generated JWT secrets
2. Builds and starts all Docker containers
3. Initializes the database with seed data
4. Schedules a daily backup at 2:00 AM

---

### Step 3 — Access the System

Open a browser on any device on the network:
```
http://192.168.1.100
```

Login credentials:
- Username: value of `SEED_ADMIN_USERNAME` (default: `admin`)
- Password: value of `SEED_ADMIN_PASSWORD` (no default — you must set this before first run)

> **⚠️ Important:** No default passwords exist. Set `SEED_ADMIN_PASSWORD` before first deployment.

---

### Step 4 — LAN Network Setup

1. Ensure Windows Firewall allows **port 80**
2. On Windows: Search "Windows Defender Firewall" → "Advanced Settings" → "Inbound Rules" → Add rule for TCP port 80
3. Test access from another device on the same network

---

### Backup

#### Run backup manually:

**Windows:**
```bat
scripts\backup.bat
```

**Linux/macOS:**
```bash
bash scripts/backup.sh
```

Backups are stored in the `backups/` folder as `.sql.gz` files.  
Files older than 30 days are deleted automatically (configurable via `BACKUP_RETENTION_DAYS` in `.env`).

#### Restore a backup:
```bash
# Linux/macOS
gunzip -c backups/backup_20260101_020000.sql.gz | \
  docker exec -i ims-pro-db psql -U imspro ims_pro

# Windows (PowerShell)
cmd /c "gzip -d -c backups\backup_20260101_020000.sql.gz | docker exec -i ims-pro-db psql -U imspro ims_pro"
```

---

### Stop and Restart

```bash
# Stop
docker compose down

# Start
docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f web
```

---

### Common Troubleshooting

| Problem | Solution |
|---|---|
| Can't access from other devices | Check firewall — open port 80 |
| Docker error on startup | Start Docker Desktop first |
| Forgot admin password | `node scripts/reset-admin-password.ts` |
| Database won't start | `docker compose logs postgres` |
| Backup fails | Confirm Docker is running and `ims-pro-db` is active |

---

*IMS-Pro v1.0 | Docker + Nginx + PostgreSQL 15 | LAN-hosted POS System*
