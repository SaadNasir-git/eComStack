import 'dotenv/config'

export const eComConfig = {
    env: {
        PORT: Number(process.env.PORT) ?? 8080,
        DATABASE_URL: process.env.DATABASE_URL!,
        PREFIX: process.env.PREFIX ?? "/api",
        VALKEY: {
            PORT: Number(process.env.VALKEY_PORT) ?? 6379,
            HOST: process.env.VALKEY_HOST ?? '127.0.0.1'
        },
        JWT_SECRET: process.env.JWT_SECRET!,
        BASE_URL: process.env.BASE_URL!,
        RESEND_API_KEY: process.env.RESEND_API_KEY!,
        SECRET_KEY: process.env.SECRET_KEY!,
        NODE_ENV: process.env.NODE_ENV ?? 'development'
    },
    projectName: process.env.PROJECT_NAME ?? 'eComStack',
}

export const cookiePath = `${eComConfig.env.PREFIX}/auth`