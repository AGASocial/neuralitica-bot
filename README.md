# 📦 NeuraliticaBot - Chat con tus archivos

**Ultra-fast chat with your files**

NeuraliticaBot is a platform that lets you upload files (PDF, DOCX, CSV, images, and more) and get lightning-fast answers by chatting with your own content.

## 🎯 Key Features

- **⚡ Ultra-Fast Answers**: Sub-100ms response time using OpenAI Responses API
- **📄 File Management**: Upload and manage knowledge files (PDF, DOCX, CSV, etc.)
- **💬 Multilingual Chat Interface**: Spanish-first, with support for multiple languages
- **👥 User Management**: Admin whitelist control with role-based access
- **🔒 Secure Authentication**: Supabase Auth with Google OAuth support

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.template .env.local
   # Fill in your Supabase and OpenAI credentials
   ```

3. **Set up database:**
   - Run `supabase/schema.sql` in your Supabase SQL Editor
   - Create a storage bucket named `price-lists`

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Create admin user:**
   - Sign up through the app
   - Update your user role to 'ADMIN' in the database

📖 **For detailed setup instructions, see [SETUP.md](./SETUP.md)**

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI Responses API (gpt-4o-mini)
- **Storage**: Supabase Storage + OpenAI Files API
- **Deployment**: Netlify

## 🎨 MVP Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │   Chat Interface │    │  OpenAI Files   │
│                 │    │                  │    │                 │
│ • Upload Files  │    │ • Chat w/ Files  │    │ • Vector Stores │
│ • Toggle Active │────│ • 50ms Responses │────│ • File Search   │
│ • User Mgmt     │    │ • Multilingual   │    │ • Ultra-Fast    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         └──────────── Supabase Database ─────────────────┘
                      (Users, Files, Messages, RLS)
```

## 📊 Performance Targets

- **Chat Response Time**: < 100ms (targeting 50ms)
- **File Processing**: < 30 seconds
- **File Toggle**: < 2 seconds
- **User Experience**: Instant loading with optimistic updates

## 🛡️ Security Features

- Row Level Security (RLS) policies
- JWT-based authentication
- Role-based access control (Admin/User)
- Secure file handling and storage
- Input validation and sanitization

## 📱 User Flows

### Admin Flow:
1. Login → Admin Dashboard
2. Upload files (PDF, DOCX, CSV, imágenes, etc.)
3. Toggle files active/inactive
4. Manage user whitelist
5. Monitor usage statistics

### Customer Flow:
1. Login → Chat Interface
2. Ask questions about your files (Spanish-first)
3. Get instant responses (50ms)
4. View conversation history

## 🤖 Interacción inteligente (Paso 2)

Chatea con tus archivos con respuestas fundamentadas en tu contenido:

- Recuperación contextual: el sistema busca fragmentos relevantes en los archivos cargados (PDF, DOCX, CSV, imágenes, etc.) para fundamentar cada respuesta.
- Respuestas en tiempo real: latencias objetivo < 100ms aprovechando OpenAI Responses API y file search/vector stores.
- Idioma adaptable: español por defecto; puede responder en el idioma de la consulta.
- Conversaciones multi-turno: mantén el contexto y refina tus preguntas sin salir del chat.

## 🚀 Deployment

Optimized for Netlify deployment:

```bash
npm run build
```

Set environment variables in your Netlify dashboard and deploy.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For setup assistance or questions about the NeuraliticaBot MVP, refer to:
- [SETUP.md](./SETUP.md) for detailed configuration
- Check browser console for error messages
- Verify environment variables are correctly set

## 📈 Future Roadmap

- Advanced analytics dashboard
- Multi-language support
- Mobile app
- API for third-party integrations
- Subscription billing system
- Advanced caching and optimization

---

**NeuraliticaBot MVP** - Transforming B2B price discovery for Venezuelan auto parts retailers with AI-powered ultra-fast queries.
