import { ProseLayout } from "../../components/PageLayout.jsx";

const EFFECTIVE = "1 January 2026";

export function TermsPage() {
  return (
    <ProseLayout title="Terms of Service" subtitle={`Effective ${EFFECTIVE}`}>
      <p>
        By accessing or using combinedintelligence.us (the "Service"), you agree to these Terms
        of Service. If you do not agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        Combined Intelligence provides strategic analytical reports, predictions, and related
        content on frontier and emerging markets. Content is provided for informational purposes
        only and does not constitute financial, legal, or investment advice.
      </p>

      <h2>2. Accounts and access</h2>
      <p>
        Access to members and paid content requires a registered account, created via Google
        OAuth2 authentication. You are responsible for maintaining the confidentiality of your
        account and for all activity that occurs under it.
      </p>

      <h2>3. Subscriptions</h2>
      <p>
        Paid subscriptions are billed on a monthly or annual basis. You may cancel at any time;
        cancellation takes effect at the end of the current billing period. We do not offer
        refunds for partial subscription periods.
      </p>

      <h2>4. Intellectual property</h2>
      <p>
        All content published on the Service — including reports, analyses, predictions,
        statistics, and visual elements — is the intellectual property of Combined Intelligence
        Desk. You may not reproduce, distribute, or create derivative works without written
        permission, except for personal, non-commercial use with attribution.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Reproduce or redistribute paid-tier content outside your subscription</li>
        <li>Use automated tools to scrape, harvest, or systematically extract content</li>
        <li>Represent our analysis as your own work or as financial advice</li>
        <li>Attempt to circumvent access controls or tier restrictions</li>
      </ul>

      <h2>6. Disclaimers</h2>
      <p>
        The Service is provided "as is." We make no warranties, express or implied, regarding
        the accuracy, completeness, or fitness for any purpose of the content. Predictions and
        forecasts represent probabilistic assessments, not guarantees.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        Combined Intelligence Desk shall not be liable for any damages arising from use of or
        reliance on the Service, including but not limited to investment losses, business
        interruption, or data loss.
      </p>

      <h2>8. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the Service after changes
        are posted constitutes acceptance of the revised terms. We will notify registered users
        of material changes via email.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Delaware, United States, without
        regard to conflict of law provisions.
      </p>

      <h2>Contact</h2>
      <p>
        Legal enquiries: <a href="mailto:legal@combinedintelligence.us">legal@combinedintelligence.us</a>
      </p>
    </ProseLayout>
  );
}
