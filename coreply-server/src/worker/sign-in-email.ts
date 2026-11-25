import { html } from "hono/html";

export function createSignInEmail(otp: string) {
  return {
    subject: "Your Coreply Cloud sign-in code",
    text: `Your Coreply Cloud sign-in code is ${otp}.\n\nEnter this code in the app or browser where you started signing in. It expires in 5 minutes.\n\nNever share this code. If you didn't request it, you can ignore this email.`,
    html: html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your Coreply Cloud sign-in code</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8f7f7;color:#191e1d;font-family:sans-serif;-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your sign-in code expires in 5 minutes.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f7f7;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;border:1px solid #c7d9d3;border-top:3px solid #339d85;background-color:#ffffff;">
            <tr>
              <td style="padding:32px 24px;">
                <h1 style="margin:0 0 16px;font-size:26px;line-height:34px;font-weight:600;">Your Coreply Cloud sign-in code</h1>
                <p style="margin:0 0 24px;color:#415951;font-size:16px;line-height:25px;">Use this code to sign in to Coreply Cloud in the app or browser where you started signing in.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding:24px 8px;border:1px solid #c7d9d3;background-color:#e6f1ec;">
                      <p style="margin:0;font-family:monospace;font-size:28px;line-height:36px;letter-spacing:3px;font-weight:700;white-space:nowrap;">${otp}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;color:#415951;font-size:14px;line-height:22px;">This code expires in <strong>5 minutes</strong>. Never share it with anyone.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;border-top:1px solid #c7d9d3;">
                <p style="margin:0;color:#415951;font-size:14px;line-height:22px;">Didn't request this code? You can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.toString(),
  };
}
