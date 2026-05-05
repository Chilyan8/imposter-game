require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const lobbySocket = require('./socket/lobby');
const gameSocket = require('./socket/game');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL
      : 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : 'http://localhost:5173',
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

lobbySocket(io);
gameSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
