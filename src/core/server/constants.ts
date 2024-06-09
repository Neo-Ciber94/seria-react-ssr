const IS_DEV = process.env.NODE_ENV !== "production";
export const CLIENT_DIR = IS_DEV ? "/build/client" : "/client";
