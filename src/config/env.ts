import dotenv from "dotenv";

dotenv.config();

export const API_KEY: string = (() => {
    const key = process.env.MBUS_API_KEY;
    if (!key) {
        throw new Error("MBus API key not set. Define MBUS_API_KEY in environment variables.");
    }
    return key;
})(); 