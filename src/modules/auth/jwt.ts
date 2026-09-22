import { type FastifyInstance, type FastifyPluginOptions } from "fastify";
import { Type } from "@sinclair/typebox";
import { userDevices, users } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { FastifyTypeProvider } from "@/utils/fastifyTypeProvider";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { TimeUnit } from "@valkey/valkey-glide";
import { eComConfig } from "@/ecom.config";

const createUserSignupSchema = Type.Object({
    name: Type.String(),
    email: Type.String({ format: 'email' }),
    password: Type.String({
        minLength: 8,
        maxLength: 72
    })
});

const createUserLoginSchema = Type.Object({
    email: Type.String({ format: 'email' }),
    password: Type.String({
        minLength: 8,
        maxLength: 72
    }),
    strategy: Type.Union([
        Type.Literal("url"),
        Type.Literal("otp")
    ]).default("url"),
    callBackUrl: Type.Optional(Type.String())
});

const createTokenVerificationSchema = Type.Object({
    token: Type.String()
});

const createOtpSchema = Type.Object({
    otp: Type.String()
});

const createForgotPasswordSchema = Type.Object({
    email: Type.String({ format: 'email' })
});

const createResetPasswordSchema = Type.Object({
    token: Type.String(),
    password: Type.String({
        minLength: 8,
        maxLength: 72
    })
})

const safeRedirect = (input: string): string => {
    if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return '/';
    return input;
};

const hmac = (code: string) => createHmac('sha256', eComConfig.env.SECRET_KEY).update(code).digest('hex');

const verifyHmac = (plainText: string, hashedText: string): boolean => {
    const newHash = hmac(plainText);

    const bufferA = Buffer.from(newHash, 'hex');
    const bufferB = Buffer.from(hashedText, 'hex');

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return timingSafeEqual(bufferA, bufferB);
};

export const authModule = (baseFastify: FastifyInstance, otps: FastifyPluginOptions) => {
    const fastify = FastifyTypeProvider(baseFastify)

    fastify.post('/auth/local/signup', { schema: { body: createUserSignupSchema } }, async (request, reply) => {
        const body = request.body;

        try {
            await fastify.db.insert(users).values({
                name: body.name,
                email: body.email,
                passwordHash: await fastify.bcrypt.hash(body.password),
            }).returning({
                id: users.id,
                email: users.email
            });

            return reply.code(201).send({
                message: "Account created. Now login and verify your account."
            });
        } catch (error: any) {
            if ((error?.code ?? error?.cause?.code) === '23505') {
                return reply.code(409).send({ message: 'User already exists.' });
            }
            throw error;
        }

    });

    fastify.post('/auth/local/login', { schema: { body: createUserLoginSchema } }, async (request, reply) => {
        const body = request.body;

        const [result] = await fastify.db.select({
            userId: users.id,
            passwordHash: users.passwordHash
        })
            .from(users)
            .where(eq(users.email, body.email))

        if (!result) {
            return reply.code(400).send({
                message: "User is not signed up, Signup first."
            })
        }

        if (!result.passwordHash) {
            return reply.code(400).send({
                message: "User signed up with provider before and now trying to login with email."
            })
        }

        const isCorrect = await fastify.bcrypt.compare(body.password, result.passwordHash);

        if (!isCorrect) {
            return reply.code(400).send({
                message: "Wrong Password!"
            })
        }

        const uniqueId = randomUUID();

        if (body.strategy === "url") {
            const token = fastify.jwt.sign({
                id: uniqueId,
                purpose: 'authentication'
            }, { expiresIn: '24h' })

            await fastify.valkey.set(`TOKEN:${uniqueId}`, JSON.stringify({ callBackUrl: safeRedirect(body.callBackUrl ?? '/'), userId: result.userId }), {
                expiry: {
                    type: TimeUnit.Seconds,
                    count: 24 * 60 * 60
                }
            });

            await fastify.authQueue.add('url', {
                email: body.email,
                token
            });

            return reply.code(202).send({
                message: "Verification Email will be sent to your email shortly."
            })
        } else {
            await fastify.valkey.set(`LOGIN_SESSION:${uniqueId}`, JSON.stringify({
                userId: result.userId,
                email: body.email,
                resendCount: 0,
                lastSentAt: Date.now(),
            }), { expiry: { type: TimeUnit.Seconds, count: 15 * 60 } });

            const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
            const hashedCode = hmac(code.toString());

            await fastify.valkey.set(`OTP:${uniqueId}`, JSON.stringify({ code: hashedCode, userId: result.userId, tries: 0 }), {
                expiry: {
                    type: TimeUnit.Seconds,
                    count: 5 * 60
                }
            });

            await fastify.authQueue.add('otp', {
                email: body.email,
                code
            })

            reply.setCookie('uniqueId', uniqueId, {
                httpOnly: true,
                secure: eComConfig.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60
            })

            return reply.code(202).send({
                message: "OTP will be sent to your email shortly"
            })
        }
    });

    fastify.get('/auth/verify-email', { schema: { querystring: createTokenVerificationSchema } }, async (request, reply) => {
        const { token } = request.query;
        let decodedPayload: { id: string; purpose: string };

        try {
            decodedPayload = fastify.jwt.verify<{ id: string; purpose: string; }>(token);
        } catch {
            return reply.code(400).send({ message: 'Token is invalid or expired' });
        }

        if (!decodedPayload || decodedPayload.purpose !== 'authentication') {
            return reply.code(400).send({
                message: "Token is invalid"
            })
        }

        const uniqueId = decodedPayload.id;
        const tokenDetailsString = await fastify.valkey.getdel(`TOKEN:${uniqueId}`);

        if (!tokenDetailsString) {
            return reply.code(400).send({
                message: "Verification token has been expired!"
            });
        }

        const tokenDetails: { userId: string; callBackUrl: string } = JSON.parse(tokenDetailsString.toString())

        const [result] = await fastify.db.select({
            userId: users.id
        }).from(users).where(eq(users.id, tokenDetails.userId));

        if (!result) {
            return reply.code(400).send({
                message: "Token is invalid"
            })
        }

        const deviceId = randomUUID()
        const refreshToken = fastify.jwt.sign({
            deviceId: deviceId
        }, {
            expiresIn: '7d'
        });

        const [insertResult] = await fastify.db.insert(userDevices).values({
            userId: result.userId,
            refreshToken: (await fastify.bcrypt.hash(refreshToken)),
            id: deviceId
        }).returning({
            id: userDevices.id
        });

        if (!insertResult) {
            return reply.code(500).send({
                message: "Something went wrong!"
            });
        }


        reply.setCookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: eComConfig.env.NODE_ENV === "production",
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60
        });

        return reply.redirect(tokenDetails.callBackUrl);
    });

    fastify.post('/auth/verify-otp', { schema: { body: createOtpSchema } }, async (request, reply) => {
        const body = request.body;
        const uniqueId = request.cookies.uniqueId;

        if (!uniqueId) {
            return reply.code(400).send({
                message: "OTP has been expired."
            })
        }

        const codeDetailsString = await fastify.valkey.get(`OTP:${uniqueId}`);
        if (!codeDetailsString) {
            return reply.code(400).send({
                message: "OTP has been expired."
            })
        }

        const codeDetails: { code: string; userId: string; tries: number; } = JSON.parse(codeDetailsString.toString());
        const isCorrect = verifyHmac(body.otp, codeDetails.code);

        if (!isCorrect) {
            codeDetails.tries += 1;
            if (codeDetails.tries >= 5) {
                await fastify.valkey.del([`OTP:${uniqueId}`, `LOGIN_SESSION:${uniqueId}`]);
                reply.clearCookie('uniqueId')
                return reply.code(400).send({ message: 'Too many attempts. Please login again.' });
            }

            await fastify.valkey.set(`OTP:${uniqueId}`, JSON.stringify(codeDetails), {
                expiry: "keepExisting"
            });
            return reply.code(400).send({
                message: "Invalid OTP."
            })
        }

        await fastify.valkey.del([`OTP:${uniqueId}`, `LOGIN_SESSION:${uniqueId}`]);

        const [result] = await fastify.db.select({
            userId: users.id
        }).from(users)
            .where(eq(users.id, codeDetails.userId.toString()));

        if (!result) {
            return reply.code(400).send({
                message: "Token is invalid"
            })
        }

        const deviceId = randomUUID()
        const refreshToken = fastify.jwt.sign({
            deviceId: deviceId
        }, {
            expiresIn: '7d'
        })

        const [insertResult] = await fastify.db.insert(userDevices).values({
            userId: result.userId,
            refreshToken: (await fastify.bcrypt.hash(refreshToken)),
            id: deviceId
        }).returning({
            id: userDevices.id
        });

        if (!insertResult) {
            return reply.code(500).send({
                message: "Something went wrong!"
            });
        }

        reply.setCookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: eComConfig.env.NODE_ENV === "production",
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60
        });
        reply.clearCookie('uniqueId')

        return reply.send({
            message: "User verified successfully"
        });
    });

    fastify.post('/auth/resend', async (request, reply) => {
        const uniqueId = request.cookies.uniqueId;
        if (!uniqueId) {
            return reply.code(400).send({ message: 'Session expired. Please login again.' });
        }

        const sessionRaw = await fastify.valkey.get(`LOGIN_SESSION:${uniqueId}`);
        if (!sessionRaw) {
            return reply.code(400).send({ message: 'Session expired. Please login again.' });
        }

        const session: {
            userId: string,
            email: string,
            resendCount: number,
            lastSentAt: number,
        } = JSON.parse(sessionRaw.toString());

        if (Date.now() - session.lastSentAt < 60_000) {
            return reply.code(429).send({ message: 'Please wait before requesting another code.' });
        }

        if (session.resendCount >= 5) {
            await fastify.valkey.del([`LOGIN_SESSION:${uniqueId}`, `OTP:${uniqueId}`]);
            reply.clearCookie('uniqueId')
            return reply.code(429).send({ message: 'Too many resends. Please login again.' });
        }

        const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
        await fastify.valkey.set(`OTP:${uniqueId}`, JSON.stringify({ userId: session.userId, code: hmac(code), tries: 0 }), {
            expiry: { type: TimeUnit.Seconds, count: 5 * 60 },
        });

        await fastify.valkey.set(`LOGIN_SESSION:${uniqueId}`, JSON.stringify({
            ...session,
            resendCount: session.resendCount + 1,
            lastSentAt: Date.now(),
        }), { expiry: "keepExisting" });

        await fastify.authQueue.add('otp', { email: session.email, code });

        return reply.code(202).send({ message: 'A new code has been sent.' });
    });

    fastify.post('/auth/forgot-password', { schema: { body: createForgotPasswordSchema } }, async (request, reply) => {
        const body = request.body;

        const [result] = await fastify.db.select({
            id: users.id
        }).from(users)
            .where(eq(users.email, body.email));

        if (!result) {
            return reply.code(200).send({
                message: "Email sent successfully."
            })
        }

        const tokenId = randomUUID();
        const token = fastify.jwt.sign({
            userId: result.id,
            tokenId: tokenId,
            purpose: 'forgot-password'
        }, { expiresIn: '30m' });

        await fastify.valkey.set(`RESET_PASSWORD:${result.id}`, tokenId, {
            expiry: {
                type: TimeUnit.Seconds,
                count: 30 * 60
            }
        });

        await fastify.authQueue.add('reset', {
            email: body.email,
            forgotPasswordUrl: `${eComConfig.env.BASE_URL}/reset-password?token=${token}`
        });

        return reply.code(200).send({
            message: "Email sent successfully."
        })
    });

    fastify.post('/auth/reset-password', { schema: { body: createResetPasswordSchema } }, async (request, reply) => {
        const body = request.body;
        let decodedPayload: { userId: string; tokenId: string; purpose: string };
        try {
            decodedPayload = fastify.jwt.verify<{ userId: string; tokenId: string; purpose: string }>(body.token);
        } catch {
            return reply.code(400).send({
                message: "Invalid Token"
            })
        }

        if (!decodedPayload || decodedPayload.purpose !== 'forgot-password') {
            return reply.code(400).send({
                message: "Invalid Token"
            })
        }

        const tokenId = await fastify.valkey.get(`RESET_PASSWORD:${decodedPayload.userId}`);
        if (!tokenId || tokenId.toString() !== decodedPayload.tokenId) {
            return reply.code(400).send({
                message: "Token has been expired"
            })
        }

        await fastify.valkey.del([`RESET_PASSWORD:${decodedPayload.userId}`]);

        const passwordHash = await fastify.bcrypt.hash(body.password)
        await fastify.db.update(users).set({
            passwordHash: passwordHash
        }).where(eq(users.id, decodedPayload.userId));

        await fastify.db.delete(userDevices)
            .where(eq(userDevices.userId, decodedPayload.userId));

        return reply.code(200).send({ message: "Password updated successfully" });
    });

    fastify.get('/auth/access-token', async (request, reply) => {
        const refreshToken = request.cookies.refreshToken;
        if (!refreshToken) {
            return reply.code(401).send({ message: 'Unauthorized' });
        }

        let decoded: { deviceId: string };
        try {
            decoded = fastify.jwt.verify<{ deviceId: string }>(refreshToken);
        } catch {
            return reply.code(401).send({ message: 'Session expired. Please log in again.' });
        }

        const [user] = await fastify.db
            .select({
                deviceId: userDevices.id,
                userId: userDevices.userId,
                email: users.email,
                name: users.name,
                refreshToken: userDevices.refreshToken,
                role: users.role
            })
            .from(userDevices)
            .innerJoin(users, eq(users.id, userDevices.userId))
            .where(eq(userDevices.id, decoded.deviceId));


        if (!user) {
            reply.clearCookie('refreshToken');
            return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
        }

        const isCorrect = await fastify.bcrypt.compare(refreshToken, user.refreshToken);

        if (!isCorrect) {
            reply.clearCookie('refreshToken');
            return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
        }

        const accessToken = fastify.jwt.sign({
            userId: user.userId,
            email: user.email,
            name: user.name,
            deviceId: user.deviceId,
            role: user.role
        }, { expiresIn: '15m' });

        return reply.send({ accessToken });
    });

    fastify.post('/auth/rotate', async (request, reply) => {
        const refreshToken = request.cookies.refreshToken;
        if (!refreshToken) {
            return reply.code(401).send({ message: 'Unauthorized' });
        }

        let decoded: { deviceId: string; iat: number };
        try {
            decoded = fastify.jwt.verify<{ deviceId: string; iat: number }>(refreshToken);
        } catch {
            return reply.code(401).send({ message: 'Session expired. Please log in again.' });
        }

        const [user] = await fastify.db
            .select({
                deviceId: userDevices.id,
                userId: userDevices.userId,
                email: users.email,
                name: users.name,
                refreshToken: userDevices.refreshToken,
                role: users.role
            })
            .from(userDevices)
            .innerJoin(users, eq(users.id, userDevices.userId))
            .where(eq(userDevices.id, decoded.deviceId));

        if (!user) {
            reply.clearCookie('refreshToken');
            return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
        }

        const isCorrect = await fastify.bcrypt.compare(refreshToken, user.refreshToken);
        if (!isCorrect) {
            reply.clearCookie('refreshToken');
            return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
        }

        const accessToken = fastify.jwt.sign({
            userId: user.userId,
            email: user.email,
            name: user.name,
            deviceId: user.deviceId,
            role: user.role
        }, { expiresIn: '15m' });

        const ageSeconds = Math.floor(Date.now() / 1000) - decoded.iat;
        const shouldRotate = ageSeconds >= 24 * 60 * 60;

        if (!shouldRotate) {
            return reply.send({ accessToken });
        }

        const newRefreshToken = fastify.jwt.sign(
            { deviceId: user.deviceId },
            { expiresIn: '7d' }
        );

        const newHash = await fastify.bcrypt.hash(newRefreshToken);

        const [updated] = await fastify.db.update(userDevices)
            .set({ refreshToken: newHash })
            .where(and(
                eq(userDevices.id, user.deviceId),
                eq(userDevices.refreshToken, user.refreshToken)
            ))
            .returning({ id: userDevices.id })

        if (!updated) {
            return reply.send({ accessToken });
        }

        reply.setCookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: eComConfig.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
        });

        return reply.send({ accessToken });
    });

    fastify.post('/auth/logout', async (request, reply) => {
        const refreshToken = request.cookies.refreshToken;

        if (refreshToken) {
            try {
                const decoded = fastify.jwt.verify<{ deviceId: string }>(refreshToken);
                await fastify.db
                    .delete(userDevices)
                    .where(eq(userDevices.id, decoded.deviceId));
            } catch (error) {
                request.log.warn({ err: error }, 'logout: invalid refresh token');
            }
        }

        reply.clearCookie('refreshToken');
        return reply.code(200).send({ message: 'Logged out.' });
    });

    fastify.post('/auth/logout-all', async (request, reply) => {
        const refreshToken = request.cookies.refreshToken;
        if (!refreshToken) {
            return reply.code(401).send({ message: "Unauthorized" });
        }

        let decoded: { deviceId: string };
        try {
            decoded = fastify.jwt.verify<{ deviceId: string }>(refreshToken);
        } catch {
            reply.clearCookie('refreshToken');
            return reply.code(401).send({ message: "Session expired." });
        }

        const [device] = await fastify.db
            .select({ userId: userDevices.userId })
            .from(userDevices)
            .where(eq(userDevices.id, decoded.deviceId));

        if (device) {
            await fastify.db
                .delete(userDevices)
                .where(eq(userDevices.userId, device.userId));
        }

        reply.clearCookie('refreshToken');
        return reply.code(200).send({ message: 'Logged out of all devices.' });
    });
}