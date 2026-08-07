const WELCOME_FROM = "fragclip-d5d8aa8b@ctomail.io";
const WELCOME_SUBJECT = "Welcome to FragClip — start clipping your best moments";

// The hosting runtime provides sendEmail as a server capability. Keep the
// declaration local so the app remains buildable without a mail SDK locally.
declare global {
  // eslint-disable-next-line no-var
  var sendEmail:
    | ((message: {
        from: string;
        to: string;
        subject: string;
        text: string;
      }) => Promise<unknown>)
    | undefined;
}

const WELCOME_BODY = `Welcome to FragClip!

You're ready to start clipping your best FPS moments. Getting started is easy:
1. Upload a gameplay video.
2. Mark your highlights on the timeline.
3. Generate clips to share your best plays.

Open FragClip: https://wwwfragclip.com/app

The companion desktop app is coming soon, making it even easier to mark moments while you play.

Your free tier includes 10 clips per month. When you need more, Pro is $5/month for unlimited clips.

Have fun, and happy clipping!
The FragClip team`;

export async function sendWelcomeEmail(to: string): Promise<void> {
  if (typeof globalThis.sendEmail !== "function") {
    throw new Error("sendEmail capability is unavailable");
  }

  await globalThis.sendEmail({
    from: WELCOME_FROM,
    to,
    subject: WELCOME_SUBJECT,
    text: WELCOME_BODY,
  });
}
