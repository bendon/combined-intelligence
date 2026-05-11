import { ProseLayout } from "../../components/PageLayout.jsx";

export function EditorialStandardsPage() {
  return (
    <ProseLayout
      title="Editorial Standards"
      subtitle="How we verify, review, and publish analytical content"
    >
      <p>
        Combined Intelligence operates to the following editorial standards. These are not
        aspirational — they are the actual process every piece of published content goes through
        before release.
      </p>

      <h2>Source verification</h2>
      <p>
        Every quantitative claim in a published report must trace back to a primary source: a
        central bank publication, a national statistics release, a regulatory filing, an exchange
        disclosure, or a peer-reviewed dataset. Secondary sources — news articles, analyst
        summaries, third-party reports — may be used to identify leads but are never cited as
        the primary authority for a data point.
      </p>
      <p>
        We maintain a sources registry for each report. Where primary data is unavailable or
        contested, we disclose this explicitly and apply uncertainty language ("estimated",
        "approximately", "provisional") to the relevant claims.
      </p>

      <h2>Analytical review</h2>
      <p>
        The AI-assisted synthesis process produces an initial structured draft. This draft is
        then reviewed by a human analyst who:
      </p>
      <ul>
        <li>Independently verifies each data point against its cited source</li>
        <li>Stress-tests the correlations identified by the synthesis engine</li>
        <li>Challenges the predictions for internal consistency</li>
        <li>Reviews confidence levels against our historical calibration data</li>
        <li>Checks that the BISE framework has been applied symmetrically across all four dimensions</li>
      </ul>
      <p>
        A report is not published until this review is complete. The analyst's sign-off is
        recorded internally and linked to the published version.
      </p>

      <h2>Prediction standards</h2>
      <p>
        Predictions in our reports must meet the following criteria before publication:
      </p>
      <ul>
        <li><strong>Specificity:</strong> The prediction must be falsifiable — it must be possible to determine, on the target date, whether it came true.</li>
        <li><strong>Target date:</strong> Every prediction must have an explicit resolution date.</li>
        <li><strong>Confidence level:</strong> Every prediction must have a stated probability (0–1) representing the analyst's degree of belief.</li>
        <li><strong>Tier disclosure:</strong> The access tier that gates the full context of each prediction must be disclosed.</li>
      </ul>

      <h2>Conflict of interest policy</h2>
      <p>
        Combined Intelligence does not accept advertising, sponsorship, or commercial relationships
        with entities whose activities we analyse. Analysts are required to disclose any personal
        financial interests in markets, sectors, or companies referenced in their reports.
      </p>
      <p>
        Reports covering countries or sectors in which an analyst holds a material financial
        interest are reassigned to a different analyst. Where reassignment is not possible, the
        conflict is disclosed in the report and the analyst's involvement is limited to factual
        data verification only.
      </p>

      <h2>Corrections policy</h2>
      <p>
        We correct factual errors promptly. When an error is identified in a published report,
        we update the report with a clearly dated correction notice specifying what was changed
        and why. We do not silently update content.
      </p>
      <p>
        If a correction materially affects a prediction's validity, we revisit the prediction's
        confidence level and update the ledger entry with a note explaining the revision.
      </p>

      <h2>AI disclosure</h2>
      <p>
        We use AI systems to accelerate the synthesis and structuring of analytical content.
        All published content is reviewed and verified by human analysts before release. We do not
        publish AI-generated content without human review and sign-off. The use of AI in our
        process is disclosed in our <a href="/legal/methodology">methodology note</a>.
      </p>
    </ProseLayout>
  );
}
