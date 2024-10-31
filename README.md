# Notifi

<img src="frontend/public/logo.svg" width="200" alt="Notifi Logo">

Notifi is a lightweight, real-time notification service that lets you instantly push notifications across all your devices, with multi-device support, file sharing, and instant message delivery. Built with Node.js, React, and SQLite.

## Features

- 🚀 Real-time notifications via WebSockets
- 🔒 Secure user authentication using JWT
- 💻 Clean, modern web interface
- 📱 Cross-device synchronization
- 🔔 Browser notifications support
- ⚡ Fast and lightweight
- 🛠️ Easy to self-host
- ⚡ Fast SQLite database
- 🎨 Modern React frontend with Tailwind CSS
- 📱 Responsive design for all devices
- ♾️ Infinite scroll message history
- 📅 Date separators
- 🔄 Automatic reconnection
- 📍 Unread message tracking

## Tech Stack

### Backend

- Node.js & Express
- TypeScript
- WebSocket (ws)
- SQLite with sqlite3
- JWT authentication
- Zod validation
- bcrypt password hashing
- Multer for file uploads

### Frontend

- React 18+
- Next.js 13
- TypeScript
- Tailwind CSS
- Lucide Icons
- ShadcnUI components

## Quick Start

### Backend Setup

1. Clone the repository:

```bash
git clone https://github.com/krugerm/notifi.git
cd notifi/backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```env
JWT_SECRET=your-secret-key
PORT=8000
```

4. Create uploads directory:

```bash
mkdir uploads
```

5. Run development server:

```bash
npm run dev
```

Or for production:

```bash
npm run build
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your backend URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

5. Run the development server:

```bash
npm run dev
```

## API Documentation

### Authentication Endpoints

#### Register New User

```http
POST /users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Request Password Reset

```http
POST /auth/reset-password-request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "newPassword": "newpassword123"
}
```

### Message Endpoints

#### Send Message

```http
POST /messages
Authorization: Bearer <token>
Content-Type: multipart/form-data

body: "Message text"
attachments: [files]
```

#### Get Messages

```http
GET /messages?limit=20&before=<timestamp>
Authorization: Bearer <token>
```

### WebSocket Connection

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/messages?token=<jwt-token>&deviceId=<device-identifier>");

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("New message:", message);
};
```

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT,
  reset_token TEXT
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  body TEXT,
  timestamp TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER,
  filename TEXT,
  mimetype TEXT,
  path TEXT,
  FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

## Development

### Directory Structure

```txt
notifi/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── environment.ts
│   │   │   └── upload.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types/
│   └── uploads/
└── frontend/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── hooks/
    │   └── types/
    └── public/
```

### Key Features Implementation

#### Multi-device Support

- Unique device identification
- Session management
- Cross-device message synchronization
- Connection status per device

#### File Attachments

- Image previews
- File downloads
- Multiple file support
- Drag and drop upload

#### Real-time Features

- Instant message delivery
- Typing indicators
- Online status
- Read receipts
- Automatic reconnection

#### UI Features

- Infinite scroll
- Unread message counter
- Jump to bottom button
- Date separators
- File upload previews

## Deployment

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add environment variables:
   - `JWT_SECRET`
   - `PORT`

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_WS_URL`
4. Deploy

### Type Safety

The project uses TypeScript throughout with strict type checking. Zod is used for runtime validation of all inputs.

### WebSocket Security

- JWT authentication required for WebSocket connections
- Automatic reconnection handling
- Connection cleanup on client disconnect

### Database Security

- Prepared statements for SQL queries
- Input validation using Zod
- Proper error handling

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens for authentication
- Input validation using Zod
- File upload restrictions
- SQL injection prevention
- XSS protection
- CORS configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- UI Components by [shadcn/ui](https://ui.shadcn.com/)
- Built with [Express](https://expressjs.com/) and [React](https://reactjs.org/)
