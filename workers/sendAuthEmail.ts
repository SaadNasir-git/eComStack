import { createValkeyGlideClient, Worker, type Job } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import { resend } from '@/utils/resend';
import { eComConfig } from '@/ecom.config';
import { renderEmail } from '@/emails/templates';
import type { AuthJobMap, AuthJobName } from '@/plugins/bullMq';

type AuthJobData = AuthJobMap[AuthJobName];

export default async function startAuthWorker(instance: FastifyInstance) {
    const connection = createValkeyGlideClient(instance.valkey);

    const authWorker = new Worker<AuthJobData, void, AuthJobName>(
        'auth-email-queue',
        async (job: Job<AuthJobData, void, AuthJobName>) => {
            const projectName = eComConfig.projectName;
            const from = `${projectName} <onboarding@resend.dev>`;

            switch (job.name) {
                case 'url': {
                    const { email, token } = job.data as AuthJobMap['url'];
                    await resend.emails.send({
                        from,
                        to: email,
                        subject: 'Verify your email address',
                        html: renderEmail('url', {
                            projectName,
                            url: `${eComConfig.env.BASE_URL}/auth/verify-email?token=${token}`,
                        }),
                    });
                    return;
                }
                case 'otp': {
                    const { email, code } = job.data as AuthJobMap['otp'];
                    await resend.emails.send({
                        from,
                        to: email,
                        subject: 'Your verification code',
                        html: renderEmail('otp', {
                            projectName,
                            code,
                        }),
                    });
                    return;
                }
                case 'reset': {
                    const { email, forgotPasswordUrl } = job.data as AuthJobMap['reset'];
                    await resend.emails.send({
                        from,
                        to: email,
                        subject: 'Reset Password',
                        html: renderEmail('forgotPassword', {
                            projectName,
                            url: forgotPasswordUrl
                        })
                    });
                    return;
                }
                case 'resetWarn': {
                    const { email } = job.data as AuthJobMap['resetWarn'];
                    await resend.emails.send({
                        from,
                        to: email,
                        subject: 'Reset Password',
                        html: renderEmail('passwordReset', {
                            projectName
                        })
                    });
                    return;
                }
                default: {
                    const _exhaustive: never = job.name;
                    throw new Error(`Unknown auth job: ${_exhaustive}`);
                }
            }
        },
        {
            connection,
            concurrency: 20,
            limiter: {
                max: 100,
                duration: 1000,
            },
        },
    );

    instance.addHook('onClose', async () => {
        await authWorker.close();
    });

    return authWorker;
}