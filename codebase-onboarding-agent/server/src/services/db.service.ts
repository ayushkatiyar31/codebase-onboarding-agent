import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    // mongoose.connect() returns a promise — we await it so the server
    // only starts listening AFTER the database is ready
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');

    // Listen for connection events (useful for debugging)
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error; // Re-throw so startServer() catches it and exits
  }
};