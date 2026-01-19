type EmailAddress = { email: string; name?: string };

export async function sendEmailViaMailChannels(opts: {
  from: EmailAddress;
  to: EmailAddress[];
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await (globalThis as any).fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: opts.to }],
      from: opts.from,
      subject: opts.subject,
      content: [
        { type: "text/plain", value: opts.text },
        ...(opts.html ? [{ type: "text/html", value: opts.html }] : []),
      ],
    }),
  });

  let bodyText = '';
  try {
    bodyText = await res.text();
  } catch (e) {
    bodyText = String(e);
  }

  console.log('MailChannels response:', { status: res.status, body: bodyText });

  return { ok: res.ok, status: res.status, body: bodyText };
}


