import { getHtml } from './layout';

// ---- Template prop contracts ----

export type EmailTemplates = {
  otp: { code: string; projectName: string };
  url: { url: string; projectName: string };
  forgotPassword: { url: string; projectName: string };
  passwordReset: { projectName: string };
};

export type EmailTemplateName = keyof EmailTemplates;

// ---- Individual bodies ----

const otpBody = ({ code, projectName }: EmailTemplates['otp']) =>
  getHtml({
    projectName,
    title: 'Your verification code',
    preheader: 'Your one-time code is inside. It expires in 10 minutes.',
    body: `
          <tr>
            <td align="center" style="padding:8px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.3; font-weight:700; color:#111827;">
                Verify your email
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:12px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#4b5563;">
                Use the code below to finish signing in. It expires in
                <strong style="color:#111827;">10 minutes</strong>.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#f3f4f6; border:1px solid #e5e7eb; border-radius:10px; padding:18px 28px;">
                    <div style="font-family:'SF Mono',Menlo,Consolas,monospace; font-size:34px; letter-spacing:10px; font-weight:700; color:#111827; padding-left:10px;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                If you didn't request this code, you can safely ignore this email.
                Never share this code with anyone — our team will never ask for it.
              </p>
            </td>
          </tr>`,
  });

const urlBody = ({ url, projectName }: EmailTemplates['url']) =>
  getHtml({
    projectName,
    title: 'Verify your email address',
    preheader: 'Confirm your email to activate your account. This link expires in 24 hours.',
    body: `
          <tr>
            <td align="center" style="padding:8px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.3; font-weight:700; color:#111827;">
                Confirm your email
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:12px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#4b5563;">
                Thanks for signing up! Click the button below to verify your
                email address and activate your account.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#111827; border-radius:10px;">
                    <a href="${url}"
                       target="_blank"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:8px 0 0 0; font-size:13px; line-height:1.6; color:#2563eb; word-break:break-all;">
                ${url}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 8px 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                This link expires in <strong style="color:#111827;">24 hours</strong>.
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>`,
  });

const forgotPasswordBody = ({ url, projectName }: EmailTemplates['forgotPassword']) =>
  getHtml({
    projectName,
    title: 'Reset your password',
    preheader: 'Reset link inside — it expires in 30 minutes.',
    body: `
          <tr>
            <td align="center" style="padding:8px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.3; font-weight:700; color:#111827;">
                Reset your password
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:12px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#4b5563;">
                We received a request to reset the password for your
                <strong style="color:#111827;">${projectName}</strong> account.
                Click the button below to choose a new one.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#111827; border-radius:10px;">
                    <a href="${url}"
                       target="_blank"
                       style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">
                      Choose a new password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:8px 0 0 0; font-size:13px; line-height:1.6; color:#2563eb; word-break:break-all;">
                ${url}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 8px 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                This link expires in <strong style="color:#111827;">30 minutes</strong>.
                If you didn't request a password reset, you can safely ignore this
                email — your password will not be changed.
              </p>
            </td>
          </tr>`,
  });

const passwordResetBody = ({ projectName }: EmailTemplates['passwordReset']) =>
  getHtml({
    projectName,
    title: 'Your password was changed',
    preheader: 'Your password was successfully changed.',
    body: `
          <tr>
            <td align="center" style="padding:8px 32px 0 32px;">
              <h1 style="margin:0; font-size:24px; line-height:1.3; font-weight:700; color:#111827;">
                Password changed
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:12px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#4b5563;">
                The password for your <strong style="color:#111827;">${projectName}</strong>
                account was successfully changed.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:12px 32px 0 32px;">
              <p style="margin:0; font-size:15px; line-height:1.6; color:#4b5563;">
                For your security, all other sessions have been signed out.
                You'll need to log in again on any other devices.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 8px 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                If you made this change, no further action is needed.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 8px 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                If you did <strong style="color:#111827;">not</strong> change your password,
                your account may be compromised. Reset your password immediately and
                contact our support team.
              </p>
            </td>
          </tr>`,
  });
// ---- Registry (single source of truth) ----

const templates = {
  otp: otpBody,
  url: urlBody,
  forgotPassword: forgotPasswordBody,
  passwordReset: passwordResetBody
} as const;

// ---- Public render function ----

export const renderEmail = <T extends EmailTemplateName>(
  name: T,
  props: EmailTemplates[T],
): string => {
  const fn = templates[name];
  if (!fn) {
    throw new Error(`Unknown email template: ${name}`);
  }
  return fn(props as never);
};