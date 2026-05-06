import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { CODING_PROMPTS } from "./data/prompts.js";
import { Prompt } from "./models/Prompt.js";
import { Room } from "./models/Room.js";
import { User } from "./models/User.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/codedock";

const sampleRooms = [
    { title: "Arrays & Hashing Practice" },
    { title: "Frontend Interview Prep" },
    { title: "Algorithm Warm-Up" },
];

await mongoose.connect(MONGO_URI);
console.log("Connected to MongoDB");

await Prompt.deleteMany({});
await Prompt.insertMany(CODING_PROMPTS);
console.log(`Seeded ${CODING_PROMPTS.length} prompts`);

await Room.deleteMany({});
await User.deleteMany({ username: "seed_user" });

const passwordHash = await bcrypt.hash("seedpass123", 10);
const seedUser = await User.create({
    username: "seed_user",
    email: "seed@codedock.dev",
    passwordHash,
});

for (const r of sampleRooms) {
    await Room.create({ title: r.title, createdBy: seedUser._id });
}
console.log(`Seeded ${sampleRooms.length} sample rooms`);

await mongoose.disconnect();
console.log("Done");
