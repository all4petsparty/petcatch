export const metadata = { title: "Privacy Policy — PetDexter" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p><b>Last updated:</b> July 2026</p>

      <h2>1. Data Controller and Compliance Focus</h2>
      <p>
        The Data Controller responsible for your personal information is <b>All4Pets</b>, located
        in <b>Pasig City, Philippines</b>. We are completely committed to protecting your personal
        information in strict accordance with the <b>Philippine Data Privacy Act of 2012 (R.A. 10173)</b>,
        its Implementing Rules and Regulations (IRR), and international privacy conventions.
      </p>
      <ul>
        <li><b>Contact Email:</b> all4petspawty@gmail.com</li>
      </ul>

      <h2>2. Data We Collect and Process</h2>
      <p>To properly run the PetDexter mobile ecosystem, we collect several categories of information:</p>
      <ul>
        <li><b>Registration Data:</b> Name, email address, and profile image shared when establishing an account through Google or Apple Sign-In authentication parameters. Your name and email are retained separately from your public in-app profile and are used, among other things, to send you account, service, and — where you have not opted out — product update and promotional communications (see Sections 3 and 8).</li>
        <li><b>Gameplay and Collection Records:</b> Dynamic statistics, pet species/breed classifications, user-assigned custom names, and visual cards created over the course of application interaction.</li>
        <li><b>On-Device Biometric Signatures (Animal Specific):</b> A mathematically processed vector fingerprint generated from standard 2D camera photos of an animal&apos;s face or fur patterns. <i>Note: This mechanism isolates animal morphology strictly to ensure database uniqueness and does not parse or map human facial geometry.</i></li>
        <li><b>Precise Geolocation Data:</b> Real-time spatial coordinates (latitude and longitude) captured via the browser&apos;s native API <i>only</i> while actively mapping a spot, executing a check-in, or performing a capture. We do not run background location tracking.</li>
        <li><b>Technical Identifiers:</b> Anonymized device tokens for optional push notifications, mobile browser configurations, active operating system versions, and diagnostic crash reports.</li>
      </ul>

      <h2>3. Purpose and Legal Basis for Processing</h2>
      <p>We process personal information under the following legitimate circumstances:</p>
      <ul>
        <li><b>Contract Fulfillment:</b> To render the application mechanics functional, load the interactive discovery map, and save customized cards to your profile.</li>
        <li><b>Consent:</b> When you check the terms authorization during account generation to enable localized web notifications, access location services, or allow anonymized tracking performance.</li>
        <li><b>Legitimate Interest:</b> To preserve competitive gameplay integrity by matching extracted vector metadata against existing entries to recognize unique discoveries and block spoofing attempts.</li>
        <li><b>Direct Marketing (Consent, Opt-Out Available):</b> We may email your registered address about new features, tips, milestones, partner venues/events, and similar product updates. This is separate from required account/service emails (e.g. sign-in links, security notices), which are sent regardless of marketing preference. Every marketing email includes an unsubscribe link, and you may withdraw consent at any time — see Section 8.</li>
      </ul>

      <h2>4. Data Sharing and Third-Party Processors</h2>
      <p>
        To keep server maintenance lean and optimize application reliability, we use a selection of
        standard modern service layers to manage infrastructure. All data transfers are structurally
        safeguarded via strict confidentiality commitments:
      </p>
      <ul>
        <li><b>Database and Hosting:</b> Cloud data services (such as Supabase, Vercel, or cloud storage buckets) to hold account records, transaction tables, and compressed pet images securely.</li>
        <li><b>Map Tiles:</b> MapTiler API to securely fetch custom-designed playful visual themes on MapLibre map renders.</li>
        <li><b>Analytics and Crash Logs:</b> Tools to capture anonymized performance anomalies to identify bugs across mobile browser versions.</li>
        <li><b>Advertising Networks:</b> Google AdMob to deliver rewarded video units and banner spaces to support the free platform.</li>
        <li><b>Email Delivery:</b> Transactional and marketing email providers used solely to deliver sign-in links, account notices, and (where you have not opted out) product update emails to your registered address. These providers do not use your data for their own purposes.</li>
      </ul>

      <h2>5. On-Device AI Processing Mechanics</h2>
      <ul>
        <li><b>Local Execution:</b> The operational extraction of animal breed classifications and signature vectors occurs entirely on your device via client-side libraries (e.g., Transformers.js or TensorFlow.js) before hitting network protocols.</li>
        <li><b>Incidental Elements:</b> While the camera targets animals, human faces could occasionally sit within wide background fields. We do not evaluate, track, compile, or monetize accidental human visual signatures.</li>
      </ul>

      <h2>6. Information Sharing with Other Users</h2>
      <p>
        By default, your profile name, general statistics, and collection entries are displayed
        across high-score boards and community leaderboards. Approximated pet capture locations are
        visible publicly on the global game map to let other collectors discover where target breeds
        spawn. You may manage specific field visibility parameters through individual Account
        Profile settings.
      </p>

      <h2>7. Retention and Data Deletion Rights</h2>
      <ul>
        <li><b>Account Deletion:</b> You have the legal right to close your user account at any time. Upon doing so, personal identifiers, login data, and contact coordinates will be securely purged from production databases within 30 days.</li>
        <li><b>Game Integrity Exemption:</b> To protect map consistency and safeguard the historical record of community leaderboards, the anonymized pet cards, breed statistics, and location tags you discovered will persist inside the database, but will be permanently de-linked from your identity.</li>
      </ul>

      <h2>8. Your Legal Rights Under the Philippine Data Privacy Act</h2>
      <p>
        As a data subject in the Philippines, you hold explicit rights that you can assert by
        emailing our data team at <b>all4petspawty@gmail.com</b>:
      </p>
      <ul>
        <li><b>Right to Be Informed:</b> Knowing whether your data is being processed.</li>
        <li><b>Right to Access:</b> Requesting an export of your specific account records.</li>
        <li><b>Right to Object:</b> Refusing the processing of your data for marketing or advertising purposes. You can unsubscribe from any marketing email instantly via the link in that email, or by emailing our data team — required account/service emails will continue regardless.</li>
        <li><b>Right to Erasure or Blocking:</b> Ordering the removal of your personal profiles from active frameworks.</li>
        <li><b>Right to Rectification:</b> Instantly updating inaccurate details on your user dashboard.</li>
      </ul>

      <h2>9. Amendments to this Privacy Policy</h2>
      <p>
        All4Pets reserves the right to adjust this Privacy Policy to match new security standards or
        application update rollouts. The latest active version will always remain accessible on the
        web-app portal. Continued play after updates go live constitutes active acceptance of
        revised provisions.
      </p>
    </>
  );
}
