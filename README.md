# Notifi

<img src="logo.svg" width="200" alt="Notifi Logo">

Notifi is a lightweight, real-time notification service that lets you instantly push notifications across all your devices. Built with Node.js, React, and SQLite, it provides a seamless way to stay connected and informed.

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

## Tech Stack

### Backend

- Node.js & Express
- TypeScript
- WebSocket (ws)
- SQLite with sqlite3
- JWT authentication
- Zod validation
- bcrypt password hashing

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
git clone https://github.com/yourusername/notifi.git
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

4. Run development server:

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
POST /users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Request Password Reset

```http
POST /users/reset-password-request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password

```http
POST /users/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "newPassword": "newpassword123"
}
```

### Notification Endpoints

#### Send Notification

```http
POST /notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Notification Title",
  "body": "Notification message"
}
```

#### Get Notifications

```http
GET /notifications
Authorization: Bearer <token>
```

### WebSocket Connection

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/notifications?token=<jwt-token>");

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log("New notification:", notification);
};
```

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

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT,
  reset_token TEXT
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT,
  body TEXT,
  timestamp TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## Development

### Directory Structure

```
notifi/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   └── types/
│   │       └── express.d.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── components/
│   │   └── ui/
│   │       └── alert.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   └── index.tsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Running Tests

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens for authentication
- Input validation on all endpoints
- CORS protection
- SQL injection prevention
- XSS protection in frontend

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

- Create an issue on GitHub
- Join our Discord community: [Discord Invite Link]
- Email: <support@notifi.example.com>

## Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- UI Components by [shadcn/ui](https://ui.shadcn.com/)
- Built with [Express](https://expressjs.com/) and [React](https://reactjs.org/)
