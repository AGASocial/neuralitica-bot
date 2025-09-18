# NeuraliticaBot MVP Setup Guide

## 🚀 Quick Start

This is the NeuraliticaBot MVP - a B2B SaaS platform for Venezuelan auto parts retailers with ultra-fast price queries (50ms response time).

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project
- OpenAI API account

## 🔧 Environment Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd neuralitica-bot
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for development)

## 🗄️ Database Setup

1. **Run the schema in Supabase:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `supabase/schema.sql`
   - Optionally run `supabase/seed.sql` for test data

2. **Set up Supabase Storage:**
   - Create a storage bucket named `price-lists`
   - Set it to public or configure RLS policies as needed

3. **Configure Authentication:**
   - Enable Email/Password authentication in Supabase Auth
   - Optionally enable Google OAuth provider
   - Set up redirect URLs: `http://localhost:3000/auth/callback`

## 🏃‍♂️ Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔑 Creating Admin Users

1. Sign up through the application with your email
2. Go to your Supabase dashboard → Authentication → Users
3. Find your user and copy their UUID
4. Go to SQL Editor and run:
   ```sql
   UPDATE public.user_profiles 
   SET role = 'ADMIN' 
   WHERE id = 'your-user-uuid-here';
   ```

## 📁 File Structure

```
src/
├── app/
│   ├── admin/           # Admin panel (files, users, dashboard)
│   ├── auth/            # Authentication pages
│   ├── chat/            # Chat interface for users
│   └── api/             # API routes (chat, OpenAI integration)
├── contexts/
│   └── AuthContext.tsx  # Authentication state management
├── lib/
│   ├── supabase.ts     # Supabase client configuration
│   └── openai.ts       # OpenAI client and utilities
└── middleware.ts        # Route protection and access control
```

## 🎯 MVP Features

### ✅ Core Features Implemented:

1. **Authentication System**
   - Email/password login
   - Google OAuth
   - User whitelist management
   - Role-based access control (Admin/User)

2. **Admin Panel**
   - PDF file upload and management
   - Active/inactive toggle for price lists
   - User management (enable/disable access)
   - Basic dashboard with statistics

3. **Ultra-Fast Chat System**
   - 50ms response time using OpenAI Responses API
   - Spanish-language optimized for Venezuelan market
   - Real-time price queries from active PDF files
   - Conversation history

4. **OpenAI Integration**
   - Automatic PDF upload to OpenAI Files API
   - Vector store management for active files only
   - File lifecycle management
   - Performance monitoring

## 🧪 Testing the MVP

1. **Create an admin user** (see above)
2. **Upload a PDF price list** via Admin → Files Management
3. **Toggle the file to "Active"** to enable it for queries
4. **Test the chat interface** by asking price questions in Spanish

Example queries:
- "¿Cuál es el precio de las pastillas de freno Toyota Corolla?"
- "Busco repuestos para motor Honda Civic"
- "¿Tienen filtros de aceite disponibles?"

## 🚀 Deployment

The application is configured for Netlify deployment:

1. **Connect your repository to Netlify**
2. **Set environment variables** in Netlify dashboard
3. **Deploy** - the build command is automatically configured

## 🛠️ Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📊 Performance Targets

- **Chat Response Time**: < 100ms (target: 50ms)
- **PDF Upload**: < 30 seconds processing
- **File Toggle**: < 2 seconds to activate/deactivate

## 🔐 Security Features

- Row Level Security (RLS) on all database tables
- JWT-based authentication via Supabase
- Role-based access control
- Input validation and sanitization
- Secure file handling

## 🆘 Troubleshooting

### Common Issues:

1. **"Account disabled" error**: User needs to be activated by admin
2. **Upload fails**: Check Supabase storage bucket permissions
3. **Chat not responding**: Verify OpenAI API key and active files
4. **Authentication loops**: Check environment variables

### Support:

- Check browser console for detailed error messages
- Verify all environment variables are set correctly
- Ensure database schema is properly installed
- Test OpenAI API key with a simple API call

## 📈 Next Steps (Post-MVP)

- Advanced analytics and reporting
- Multi-language support
- Mobile app
- API endpoints for third parties
- Advanced caching and optimization
- Subscription billing system

---

*This MVP delivers the core functionality needed to validate the NeuraliticaBot to chat with your files*