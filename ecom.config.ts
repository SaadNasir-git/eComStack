import 'dotenv/config'

export const eComConfig = {
    env: {
        PORT: Number(process.env.PORT) ?? 8080,
        DATABASE_URL: process.env.DATABASE_URL!,
        PREFIX: process.env.PREFIX ?? "/api"
    }
}