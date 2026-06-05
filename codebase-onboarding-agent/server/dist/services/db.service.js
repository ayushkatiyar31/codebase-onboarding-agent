"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }
    try {
        // mongoose.connect() returns a promise — we await it so the server
        // only starts listening AFTER the database is ready
        await mongoose_1.default.connect(uri);
        console.log('MongoDB connected successfully');
        // Listen for connection events (useful for debugging)
        mongoose_1.default.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });
    }
    catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error; // Re-throw so startServer() catches it and exits
    }
};
exports.connectDB = connectDB;
