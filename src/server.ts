import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/database.js';

const PORT = env.PORT;

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');

  await prisma.$disconnect();
  console.log('Database disconnected');

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Database connected`);
});
