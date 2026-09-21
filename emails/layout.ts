type LayoutOptions = {
  projectName: string;
  title: string;
  preheader: string;
  body: string;
};

export const getHtml = ({ projectName, title, preheader, body }: LayoutOptions) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">

          <tr>
            <td align="center" style="padding:32px 32px 8px 32px;">
              <div style="font-size:20px; font-weight:700; color:#111827; letter-spacing:-0.2px;">
                ${projectName}
              </div>
            </td>
          </tr>

          ${body}

          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="height:1px; background-color:#e5e7eb;"></div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:20px 32px 32px 32px;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#9ca3af;">
                Sent by YourApp, Inc.<br />
                123 Example Street, Suite 100, City, Country
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;