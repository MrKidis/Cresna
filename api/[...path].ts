import "dotenv/config";
import { createCresnaApp } from "../server/_core/app";

// Vercel imports this default-exported Express application for every /api/*
// request. Frontend pages remain static Vite output under the same domain.
export default createCresnaApp();
