import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Refund and cancellation policy · Sarathi" };

export default function Refunds() {
  return (
    <LegalPage title="Refund and cancellation policy" updated="4 October 2026">
      <p>Sarathi is free today. This policy applies to any paid features we introduce.</p>

      <h2>Subscriptions</h2>
      <ul>
        <li>Cancel any time from your account. You keep access until the end of the period you&apos;ve paid for, and you won&apos;t be charged again.</li>
        <li>If it&apos;s your first subscription and Sarathi isn&apos;t right for you, ask within 7 days of paying for a full refund.</li>
      </ul>

      <h2>One-time purchases</h2>
      <ul>
        <li>Short passes (for example, one week): a full refund if you ask within 48 hours and haven&apos;t used the paid features.</li>
        <li>Personal readings or keepsakes: a full refund if it wasn&apos;t delivered or didn&apos;t work because of a problem on our side.</li>
      </ul>

      <h2>Dakshina</h2>
      <p>
        Dakshina is a voluntary offering, so it isn&apos;t normally refunded. If you paid twice by mistake or entered the wrong
        amount, tell us within 7 days and we&apos;ll refund it.
      </p>

      <h2>How to ask for a refund</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email you sign in with, and include the payment ID from
        your receipt. Approved refunds go back to the original payment method (UPI, card or bank) within 5 to 7 working days,
        through Razorpay.
      </p>
    </LegalPage>
  );
}
