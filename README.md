# Main spreadsheet Database
https://docs.google.com/spreadsheets/d/1jnuPTpmYWK6opaAdKn7utvc1S5NQNX-lsz8VZ6gh4_U/edit?gid=1026863697#gid=1026863697

# PERMINTAAN ELEKTRIK 2026
https://docs.google.com/spreadsheets/d/18E7-wo16YOc_UpIb_LYEUhPhWpmE5EGn0ASSMpOATqY/edit?gid=1783492643#gid=1783492643

# Field Work Report System

 
A modern, professional field work management system powered by **Supabase**

  [![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
---

## 🌟 Features

### 📊 **Dashboard Analytics**
- Real-time statistics and performance metrics
- Visual data representation with charts
- Quick overview of all activities
- Responsive design for all devices

### 📝 **Report Management**
- Create, edit, and delete field reports
- Comprehensive report forms with validation
- Rich text descriptions and notes
- Time tracking (start/end time)
- Location and project details
- Professional modal-based forms

### ✅ **Task Management**
- Create and track tasks with priorities (Low/Medium/High)
- Progress tracking system with percentage
- Progress log history with timestamps
- Deadline management
- Status indicators (To Do/In Progress/Completed)
- Detailed task descriptions

### 🔧 **Sparepart Ordering**
- Order new spareparts with quantity tracking
- Status tracking (Pending/Ordered/Arrived)
- Order and arrival date management
- Unit and description fields
- Easy-to-use modal interface

### 🎨 **Modern UI/UX**
- Professional animations and transitions
- Smooth modal interactions with dark backdrop
- Per-letter hover animations on title
- Card hover effects with lift animation
- Custom scrollbar styling
- Glass morphism effects
- Responsive mobile-first design

### 🌐 **Bilingual Support**
- Indonesian (ID) and English (EN) languages
- Real-time language switching
- Complete translation coverage (200+ keys)
- Persistent language preference

### 🎭 **Theme System**
- Light, Dark, and Auto modes
- System preference detection
- Smooth theme transitions
- Persistent theme preference
- Optimized for readability

### 🔄 **Database & Synchronization**
- Supabase PostgreSQL backend
- Lightning-fast queries with indexes
- Automatic data synchronization
- Multi-user collaboration support
- Real-time updates ready (can be enabled)
- Scalable for millions of records

### 🧭 **Browser Navigation**
- Full browser history integration
- Back/forward button support
- URL hash routing (#dashboard, #laporan, #tasks, #spareparts)
- Page refresh maintains current view

### 🔍 **Search & Filter**
- Real-time search functionality
- Filter by status and priority
- Quick access to specific entries
- Responsive search results

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (recommended)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Fill in the values in `.env`.
4. Start development server:
   ```bash
   npm run dev
   ```

### Build
```bash
npm run build
```

---

## 🔐 Environment Variables

Frontend (Vite):
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Serverless API (Vercel/Node):
```bash
SPREADSHEET_ID=
# GOOGLE_CREDENTIALS should be a JSON string of Google service account credentials
GOOGLE_CREDENTIALS=
REPAIRS_SHEET_URL=
```

> Configure the serverless variables in your deployment platform (e.g., Vercel) for the `/api` routes.

---

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 👨‍💻 Author

**Sahik Jaman**
- GitHub: [@sahikjaman](https://github.com/sahikjaman)
