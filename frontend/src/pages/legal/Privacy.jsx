import { ProseLayout } from "../../components/PageLayout.jsx";

const EFFECTIVE = "1 January 2026";

export function PrivacyPage() {
  return (
    <ProseLayout title="Privacy Policy" subtitle={`Effective ${EFFECTIVE}`}>
      <p>
        This policy describes what data Combined Intelligence collects, how it is used, and
        your rights with respect to that data.
      </p>

      <h2>Data we collect</h2>
      <h3>Account data</h3>
      <p>
        When you sign in via Google OAuth2, we receive and store your Google account ID, email
        address, display name, and profile picture URL. We do not receive or store your Google
        password. This data is used solely to authenticate you and manage your subscription.
      </p>

      <h3>Usage data</h3>
      <p>
        We log server-side access logs (IP address, user agent, requested URL, timestamp) for
        security and operational purposes. These logs are retained for 30 days and are not used
        for behavioural tracking or advertising.
      </p>

      <h3>Push notification subscriptions</h3>
      <p>
        If you opt in to push notifications, we store your browser's push subscription endpoint
        and encryption keys. This data is used only to deliver report notifications you have
        requested. You may unsubscribe at any time via your browser settings.
      </p>

      <h3>Payment data</h3>
      <p>
        Payment processing is handled by third-party payment processors. We do not store card
        numbers, bank details, or other payment credentials on our systems.
      </p>

      <h2>How we use your data</h2>
      <ul>
        <li>To authenticate you and control access to subscription content</li>
        <li>To manage your subscription and send transactional emails</li>
        <li>To deliver push notifications you have opted in to</li>
        <li>To maintain security and detect abuse</li>
      </ul>
      <p>
        We do not sell your data. We do not use your data for advertising. We do not share
        your data with third parties except as required to operate the Service (e.g., payment
        processors, cloud infrastructure providers).
      </p>

      <h2>Data retention</h2>
      <p>
        Account data is retained for as long as your account is active. If you request account
        deletion, we will delete your account data within 30 days, except where retention is
        required by law.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a single HTTP-only authentication cookie (<code>ci_token</code>) to maintain
        your session. This cookie is necessary for the Service to function. We do not use
        tracking cookies, advertising cookies, or third-party analytics cookies.
      </p>

      <h2>Your rights</h2>
      <p>
        You have the right to access, correct, or delete the personal data we hold about you.
        To exercise these rights, email <a href="mailto:privacy@combinedintelligence.us">privacy@combinedintelligence.us</a>.
        We will respond within 30 days.
      </p>
      <p>
        If you are located in the EEA or UK, you also have rights under GDPR/UK GDPR,
        including the right to lodge a complaint with a supervisory authority.
      </p>

      <h2>Security</h2>
      <p>
        Authentication tokens are stored in HTTP-only, Secure, SameSite=Lax cookies to
        mitigate XSS and CSRF risks. All data is transmitted over TLS. Passwords are not
        stored (authentication is delegated to Google).
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We will notify registered users of material changes to this policy via email at least
        14 days before the changes take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy enquiries: <a href="mailto:privacy@combinedintelligence.us">privacy@combinedintelligence.us</a>
      </p>
    </ProseLayout>
  );
}
