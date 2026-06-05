"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repo = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// The actual Mongoose schema — maps 1:1 with the interface above
const FileNodeSchema = new mongoose_1.Schema({
    path: { type: String, required: true },
    type: { type: String, enum: ['blob', 'tree'], required: true },
    size: { type: Number },
    sha: { type: String, required: true },
}, { _id: false }); // _id: false — these are sub-documents, they don't need their own Mongo ID
const RepoSchema = new mongoose_1.Schema({
    owner: { type: String, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true, unique: true }, // unique: no two docs with same fullName
    description: { type: String, default: '' },
    defaultBranch: { type: String, default: 'main' },
    language: { type: String, default: 'Unknown' },
    stars: { type: Number, default: 0 },
    fileTree: { type: [FileNodeSchema], default: [] },
    status: { type: String, enum: ['pending', 'processing', 'ready', 'error'], default: 'pending' },
}, {
    timestamps: true, // auto-adds createdAt and updatedAt fields, managed by Mongoose
});
// The third argument 'repos' is the collection name in MongoDB
// Without it, Mongoose would use 'repoes' (auto-plural) which looks wrong
exports.Repo = mongoose_1.default.model('Repo', RepoSchema, 'repos');
