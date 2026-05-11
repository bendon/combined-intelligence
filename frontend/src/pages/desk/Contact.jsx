import { ProseLayout } from "../../components/PageLayout.jsx";

export function ContactPage() {
  return (
    <ProseLayout
      title="Contact"
      subtitle="Get in touch with the Combined Intelligence Desk"
    >
      <p>
        We welcome correspondence from readers, analysts, institutions, and potential collaborators.
        Use the appropriate channel below.
      </p>

      <h2>Editorial enquiries</h2>
      <p>
        For questions about specific reports, corrections, or editorial matters:
        <br />
        <a href="mailto:desk@combinedintelligence.us">desk@combinedintelligence.us</a>
      </p>

      <h2>Subscriptions and access</h2>
      <p>
        For questions about membership tiers, billing, or institutional subscriptions:
        <br />
        <a href="mailto:subscriptions@combinedintelligence.us">subscriptions@combinedintelligence.us</a>
      </p>

      <h2>Data tips and source leads</h2>
      <p>
        If you have access to primary data, official statistics, or leads relevant to markets
        we cover, we are interested to hear from you. All sources are handled confidentially
        and verified before use.
        <br />
        <a href="mailto:tips@combinedintelligence.us">tips@combinedintelligence.us</a>
      </p>

      <h2>Institutional and API access</h2>
      <p>
        For institutional subscriptions, bulk licensing, or API access for data integration:
        <br />
        <a href="mailto:partnerships@combinedintelligence.us">partnerships@combinedintelligence.us</a>
      </p>

      <h2>Response times</h2>
      <p>
        We aim to respond to all enquiries within three business days. For urgent editorial
        matters (corrections, legal notices), we aim to respond within 24 hours.
      </p>

      <blockquote>
        Combined Intelligence is a small independent desk. We read everything sent to us, but we
        cannot guarantee individual responses to all unsolicited pitches or submissions.
      </blockquote>
    </ProseLayout>
  );
}
