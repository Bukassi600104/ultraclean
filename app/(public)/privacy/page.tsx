import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "UltraTidy Cleaning Services Privacy Policy. Learn how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy | UltraTidy Cleaning Services",
    description:
      "UltraTidy Cleaning Services Privacy Policy. Learn how we collect, use, and protect your personal information.",
    url: "https://ultratidy.ca/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Header */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-4 text-muted-foreground">
              Last updated: February 1, 2025
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-neutral prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            <p>
              UltraTidy Cleaning Services (&ldquo;UltraTidy,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
              operates the website located at{" "}
              <Link href="/" className="text-primary">
                ultratidy.ca
              </Link>{" "}
              and provides professional cleaning services throughout the Greater
              Toronto Area and Brantford, Ontario. We take your privacy
              seriously. This Privacy Policy explains what information we collect
              from visitors and clients, why we collect it, how we use it, and
              the choices available to you regarding that information.
            </p>
            <p>
              By accessing our website or engaging our services, you acknowledge
              that you have read, understood, and agree to the terms outlined in
              this policy.
            </p>

            <h2>1. Information We Collect</h2>

            <h3>1.1 Information You Provide Directly</h3>
            <p>
              When you fill out our contact form, request a quote, schedule a
              cleaning, or otherwise communicate with us, we may collect the
              following:
            </p>
            <ul>
              <li>
                <strong>Name</strong> — so we know who we are speaking with and
                can address you personally.
              </li>
              <li>
                <strong>Phone number</strong> — to confirm appointments, discuss
                service details, and follow up on your inquiry.
              </li>
              <li>
                <strong>Email address</strong> — to send you a quote, booking
                confirmations, appointment reminders, and follow-up
                correspondence.
              </li>
              <li>
                <strong>Service details</strong> — such as the type of cleaning
                you need, property type, square footage, preferred dates and
                times, cleaning frequency, and any special requests or
                instructions.
              </li>
              <li>
                <strong>Referral source</strong> — how you heard about us, which
                helps us understand what is working in our outreach efforts.
              </li>
            </ul>

            <h3>1.2 Information Collected Automatically</h3>
            <p>
              When you visit our website, certain technical information is
              collected automatically through standard web technologies:
            </p>
            <ul>
              <li>
                <strong>IP address</strong> — used for rate limiting to prevent
                abuse of our contact form and to understand general geographic
                regions of our visitors.
              </li>
              <li>
                <strong>Browser type and version</strong>, operating system, and
                device type.
              </li>
              <li>
                <strong>Pages visited</strong>, time spent on pages, referring
                URLs, and other standard web analytics data.
              </li>
            </ul>
            <p>
              We do not use tracking cookies for advertising purposes. Any
              cookies set by our website are strictly functional (for example, to
              maintain session state).
            </p>

            <h3>1.3 Information We Do Not Collect</h3>
            <p>
              We do not collect payment card numbers, banking details, social
              insurance numbers, or government identification numbers through our
              website. Payment for services is handled separately and in person
              or through secure third-party payment processors.
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Respond to your inquiries and provide requested quotes.</li>
              <li>
                Schedule, confirm, and manage your cleaning appointments.
              </li>
              <li>
                Send you appointment reminders and follow-up communications
                related to services you have requested.
              </li>
              <li>
                Improve our website, services, and the overall client
                experience.
              </li>
              <li>
                Maintain records of client interactions for quality assurance and
                operational purposes.
              </li>
              <li>
                Comply with legal obligations under Canadian federal and
                provincial law.
              </li>
            </ul>
            <p>
              We will never sell, rent, or lease your personal information to
              third parties for their own marketing purposes.
            </p>

            <h2>3. How We Share Your Information</h2>
            <p>
              Your personal information may be shared only in the following
              limited circumstances:
            </p>
            <ul>
              <li>
                <strong>Service providers</strong> — We use trusted third-party
                services to support our operations, including our hosting
                provider (Vercel), database provider (Supabase), and email
                service (Resend). These providers process data solely on our
                behalf and are bound by their own privacy obligations.
              </li>
              <li>
                <strong>Legal requirements</strong> — We may disclose your
                information if required to do so by law, court order, or
                governmental regulation, or if we believe in good faith that
                such disclosure is necessary to protect our rights, your safety,
                or the safety of others.
              </li>
              <li>
                <strong>Business transfers</strong> — In the unlikely event of a
                merger, acquisition, or sale of all or a portion of our
                business, client information may be transferred as part of that
                transaction. We would notify affected individuals before their
                information becomes subject to a different privacy policy.
              </li>
            </ul>

            <h2>4. Canada&apos;s Anti-Spam Legislation (CASL)</h2>
            <p>
              We comply fully with Canada&apos;s Anti-Spam Legislation (CASL).
              When you submit a quote request or contact form, we consider that
              an implied consent to receive communications directly related to
              your inquiry (appointment confirmations, quotes, reminders, and
              follow-ups).
            </p>
            <p>Every email we send includes:</p>
            <ul>
              <li>
                Clear identification of UltraTidy Cleaning Services as the
                sender.
              </li>
              <li>
                Our business contact information, including our physical mailing
                address.
              </li>
              <li>
                A working unsubscribe mechanism that is honoured within ten (10)
                business days.
              </li>
            </ul>
            <p>
              If you wish to stop receiving communications from us at any time,
              click the unsubscribe link in any of our emails or contact us
              directly at{" "}
              <a href="mailto:hello@ultratidycleaning.com">hello@ultratidycleaning.com</a> or{" "}
              <a href="tel:+15483286260">+1 (548) 328-6260</a>.
            </p>

            <h2>5. Data Retention</h2>
            <p>
              We retain your personal information for as long as it is necessary
              to fulfil the purposes outlined in this policy, unless a longer
              retention period is required or permitted by law. Specifically:
            </p>
            <ul>
              <li>
                <strong>Quote requests and inquiries</strong> are retained for up
                to twenty-four (24) months after the last interaction, then
                permanently deleted.
              </li>
              <li>
                <strong>Client service records</strong> are retained for the
                duration of our business relationship and for a reasonable period
                afterward for record-keeping and tax purposes.
              </li>
              <li>
                <strong>Website analytics data</strong> is retained in aggregate
                form and cannot be traced back to individual visitors.
              </li>
            </ul>

            <h2>6. Data Security</h2>
            <p>
              We take reasonable and appropriate measures to protect your
              personal information from unauthorized access, alteration,
              disclosure, or destruction. These measures include:
            </p>
            <ul>
              <li>
                Encrypted data transmission using HTTPS/TLS across our entire
                website.
              </li>
              <li>
                Secure, access-controlled database storage with row-level
                security policies.
              </li>
              <li>
                Rate limiting on our contact form to prevent automated abuse.
              </li>
              <li>
                Restricted access to personal data — only authorized personnel
                who need the information to perform their job responsibilities
                have access.
              </li>
            </ul>
            <p>
              No method of electronic transmission or storage is completely
              secure. While we strive to use commercially acceptable means to
              protect your information, we cannot guarantee its absolute
              security.
            </p>

            <h2>7. Your Rights</h2>
            <p>
              Under Canadian privacy law, including the Personal Information
              Protection and Electronic Documents Act (PIPEDA) and applicable
              provincial legislation, you have the right to:
            </p>
            <ul>
              <li>
                <strong>Access</strong> the personal information we hold about
                you and request a copy of it.
              </li>
              <li>
                <strong>Correct</strong> any information that is inaccurate or
                incomplete.
              </li>
              <li>
                <strong>Withdraw consent</strong> for us to use your personal
                information, subject to legal or contractual restrictions and
                reasonable notice.
              </li>
              <li>
                <strong>Request deletion</strong> of your personal information,
                except where we are required by law to retain it.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the
              information provided below. We will respond to your request within
              thirty (30) days.
            </p>

            <h2>8. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites, including
              social media platforms (Instagram, Facebook) and review sites
              (Google). We are not responsible for the privacy practices or
              content of those external sites. We encourage you to review the
              privacy policies of any third-party site you visit.
            </p>

            <h2>9. Children&apos;s Privacy</h2>
            <p>
              Our website and services are not directed at individuals under the
              age of eighteen (18). We do not knowingly collect personal
              information from minors. If we become aware that we have
              inadvertently collected information from a child, we will take
              steps to delete that information promptly.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, legal requirements, or other
              factors. When we make material changes, we will update the
              &ldquo;Last updated&rdquo; date at the top of this page. We
              encourage you to review this page periodically.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or our handling of your personal information, please
              reach out to us:
            </p>
            <ul>
              <li>
                <strong>Business Name:</strong> UltraTidy Cleaning Services
              </li>
              <li>
                <strong>Email:</strong>{" "}
                <a href="mailto:hello@ultratidycleaning.com">hello@ultratidycleaning.com</a>
              </li>
              <li>
                <strong>Phone:</strong>{" "}
                <a href="tel:+15483286260">+1 (548) 328-6260</a>
              </li>
              <li>
                <strong>Location:</strong> Toronto, Ontario, Canada
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
