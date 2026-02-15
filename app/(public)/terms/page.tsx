import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for UltraTidy Cleaning Services. Read about our service terms, cancellation policy, liability, and client responsibilities.",
  openGraph: {
    title: "Terms of Service | UltraTidy Cleaning Services",
    description:
      "Terms of Service for UltraTidy Cleaning Services. Service terms, cancellation policy, liability, and client responsibilities.",
    url: "https://ultratidy.ca/terms",
  },
};

export default function TermsOfServicePage() {
  return (
    <>
      {/* Header */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
              Terms of Service
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
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
              the UltraTidy Cleaning Services website at{" "}
              <Link href="/" className="text-primary">
                ultratidy.ca
              </Link>{" "}
              and any cleaning services provided by UltraTidy Cleaning Services
              (&ldquo;UltraTidy,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;). By using this website or booking our services,
              you agree to be bound by these Terms.
            </p>
            <p>
              Please read them carefully. If you do not agree with any part of
              these Terms, you should not use our website or engage our services.
            </p>

            <h2>1. About Our Services</h2>
            <p>
              UltraTidy Cleaning Services provides professional residential,
              commercial, deep cleaning, move-in/move-out, post-construction,
              and Airbnb cleaning services throughout the Greater Toronto Area
              (GTA), Brantford, and surrounding areas within a 40-kilometre
              radius. Our services are carried out by trained, vetted, and
              insured cleaning professionals.
            </p>

            <h2>2. Service Quotes and Pricing</h2>
            <h3>2.1 Quotes</h3>
            <p>
              All quotes provided through our website, over the phone, by email,
              or in person are estimates based on the information you supply to
              us at the time of inquiry. Final pricing may vary depending on the
              actual condition, size, and scope of work required upon arrival at
              the property.
            </p>
            <h3>2.2 Starting Prices</h3>
            <p>
              The prices displayed on our website represent minimum starting
              prices for each service category. These figures serve as a
              guideline and do not constitute a fixed-price offer. Every property
              is different, and we provide personalized quotes based on your
              specific needs after gathering the relevant details.
            </p>
            <h3>2.3 Additional Charges</h3>
            <p>
              If we arrive at a property and discover that the scope of work
              materially exceeds what was described during the booking process
              (for example, significant undisclosed mess, hoarding conditions, or
              hazardous materials), we reserve the right to revise the price
              before commencing work. In such cases, we will notify you of the
              revised estimate and obtain your approval before proceeding.
            </p>

            <h2>3. Booking and Scheduling</h2>
            <h3>3.1 Appointment Confirmation</h3>
            <p>
              A booking is considered confirmed only after you receive a written
              confirmation from us by email or text message. Submitting a contact
              form or quote request on our website does not by itself constitute
              a confirmed appointment.
            </p>
            <h3>3.2 Access to Property</h3>
            <p>
              You are responsible for providing our team with safe and
              reasonable access to the property at the scheduled time. If we are
              unable to enter the premises at the scheduled time due to locked
              doors, building restrictions, or any other access issue not caused
              by us, a trip charge may apply.
            </p>
            <h3>3.3 Preparation</h3>
            <p>
              To allow our team to work efficiently, we ask that you remove
              personal valuables, fragile items, and clutter from surfaces and
              floors before our arrival. UltraTidy is not responsible for
              organizing or tidying personal belongings unless specifically
              agreed upon in advance.
            </p>

            <h2>4. Cancellation and Rescheduling</h2>
            <h3>4.1 Client Cancellations</h3>
            <p>
              We understand that plans change. We ask that you provide at least
              twenty-four (24) hours&apos; notice if you need to cancel or
              reschedule a confirmed appointment. Cancellations made with less
              than 24 hours&apos; notice may be subject to a cancellation fee of
              up to 50% of the quoted service price to cover costs incurred in
              preparing for your appointment.
            </p>
            <h3>4.2 No-Show</h3>
            <p>
              If our team arrives at the scheduled time and is unable to perform
              the service because no one is available to grant access and no
              alternative arrangements were made, this will be treated as a
              late cancellation and the cancellation fee described above will
              apply.
            </p>
            <h3>4.3 UltraTidy Cancellations</h3>
            <p>
              In rare circumstances (severe weather, staff emergencies, or other
              events beyond our reasonable control), we may need to cancel or
              reschedule your appointment. In such cases, we will notify you as
              early as possible and offer alternative dates at no additional
              cost. No cancellation fee applies when the cancellation is
              initiated by UltraTidy.
            </p>

            <h2>5. Payment Terms</h2>
            <p>
              Payment is due upon completion of the cleaning service unless
              other arrangements have been agreed to in writing. We accept cash,
              e-Transfer, and other payment methods as communicated at the time
              of booking. A receipt will be provided upon request.
            </p>
            <p>
              For recurring cleaning contracts, specific billing terms (weekly,
              bi-weekly, or monthly) will be outlined in a separate service
              agreement.
            </p>

            <h2>6. Satisfaction Guarantee</h2>
            <p>
              Your satisfaction is our priority. If you are not satisfied with
              any aspect of the cleaning service, please contact us within
              twenty-four (24) hours of the completed service. We will return to
              address the specific areas of concern at no additional charge.
            </p>
            <p>
              The re-clean must be reported within 24 hours and is limited to
              the original scope of work booked. It does not cover additional
              services beyond the original booking.
            </p>

            <h2>7. Liability and Insurance</h2>
            <h3>7.1 Insurance Coverage</h3>
            <p>
              UltraTidy Cleaning Services carries general liability insurance.
              In the unlikely event that our team causes damage to your property
              during the course of our work, please notify us within
              forty-eight (48) hours so we can assess the situation and process
              a claim.
            </p>
            <h3>7.2 Pre-Existing Conditions</h3>
            <p>
              We are not responsible for damage resulting from pre-existing
              conditions, normal wear and tear, defective fixtures, improperly
              secured items, or surfaces that are inherently fragile or
              compromised. Items such as loose tiles, weakened grout, chipped
              paint, or unsecured wall-mounted objects are cleaned at the
              homeowner&apos;s risk. If our team identifies a potential concern,
              we will bring it to your attention before proceeding.
            </p>
            <h3>7.3 Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by applicable law, UltraTidy
              Cleaning Services shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising
              out of or related to our services. Our total liability for any
              claim shall not exceed the amount you paid for the specific service
              that gave rise to the claim.
            </p>
            <h3>7.4 Valuables</h3>
            <p>
              We strongly recommend that you secure jewellery, cash,
              collectibles, sensitive documents, and other items of significant
              personal or monetary value before our team arrives. UltraTidy is
              not responsible for lost, misplaced, or damaged valuables that were
              not secured prior to the cleaning appointment.
            </p>

            <h2>8. Client Responsibilities</h2>
            <p>As a client, you agree to:</p>
            <ul>
              <li>
                Provide accurate information about the property and the scope of
                cleaning required when requesting a quote.
              </li>
              <li>
                Ensure a safe working environment for our team, free from
                hazards such as aggressive pets, unsanitary conditions beyond the
                scope of standard cleaning, or structural dangers.
              </li>
              <li>
                Disclose any known allergies, sensitivities, or chemical
                restrictions that may affect the products we use.
              </li>
              <li>
                Notify us of any security systems, alarm codes, or access
                procedures required to enter the property.
              </li>
              <li>
                Treat our cleaning professionals with courtesy and respect at
                all times.
              </li>
            </ul>
            <p>
              UltraTidy reserves the right to decline or terminate a service in
              progress if our team&apos;s safety is at risk or if the working
              conditions are materially different from what was agreed upon.
            </p>

            <h2>9. Pets</h2>
            <p>
              If you have pets, please ensure they are secured in a safe area
              during the cleaning appointment. This protects both the animals
              and our team. We are not responsible for pet-related incidents,
              including pets escaping through doors left open during the
              cleaning process.
            </p>

            <h2>10. Use of Our Website</h2>
            <h3>10.1 Permitted Use</h3>
            <p>
              Our website is provided for informational purposes and to
              facilitate service inquiries. You may browse, download, and print
              content from our website for your personal, non-commercial use
              only.
            </p>
            <h3>10.2 Prohibited Conduct</h3>
            <p>You agree not to:</p>
            <ul>
              <li>
                Submit false, misleading, or fraudulent information through our
                contact forms.
              </li>
              <li>
                Attempt to interfere with, compromise the security of, or
                disrupt the proper functioning of our website.
              </li>
              <li>
                Use automated systems (bots, scrapers, or crawlers) to access
                our website in a manner that exceeds reasonable use.
              </li>
              <li>
                Reproduce, distribute, or modify any part of our website without
                our prior written consent.
              </li>
            </ul>
            <h3>10.3 Intellectual Property</h3>
            <p>
              All content on this website — including text, images, logos,
              graphics, and design — is the property of UltraTidy Cleaning
              Services or its licensors and is protected under Canadian
              copyright and trademark law. The UltraTidy name and logo are
              trademarks of UltraTidy Cleaning Services.
            </p>

            <h2>11. Third-Party Links</h2>
            <p>
              Our website may contain links to external websites, including
              social media profiles and review platforms. These links are
              provided for your convenience. We do not control and are not
              responsible for the content, privacy practices, or terms of
              service of any third-party websites.
            </p>

            <h2>12. Service Area</h2>
            <p>
              Our services are currently available in the Greater Toronto Area
              (GTA) — including Toronto, Mississauga, Brampton, Markham,
              Vaughan, Oakville, Burlington, and Hamilton — as well as Brantford
              and surrounding communities within a 40-kilometre radius.
              Availability outside these areas is at our discretion and may be
              subject to additional travel charges.
            </p>

            <h2>13. Force Majeure</h2>
            <p>
              UltraTidy shall not be held liable for any delay or failure to
              perform its obligations under these Terms where such delay or
              failure is caused by circumstances beyond our reasonable control,
              including but not limited to natural disasters, severe weather,
              public health emergencies, government orders, labour disputes,
              utility outages, or acts of vandalism.
            </p>

            <h2>14. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the
              laws of the Province of Ontario and the federal laws of Canada
              applicable therein. Any dispute arising under these Terms shall be
              resolved in the courts of competent jurisdiction located in
              Ontario, Canada.
            </p>

            <h2>15. Severability</h2>
            <p>
              If any provision of these Terms is found to be invalid,
              unenforceable, or illegal by a court of competent jurisdiction,
              the remaining provisions shall continue in full force and effect.
              The invalid provision shall be modified to the minimum extent
              necessary to make it valid and enforceable while preserving the
              original intent.
            </p>

            <h2>16. Amendments</h2>
            <p>
              We reserve the right to update or modify these Terms at any time.
              Changes will be posted on this page with an updated &ldquo;Last
              updated&rdquo; date. Your continued use of our website or services
              after any changes constitutes your acceptance of the revised
              Terms.
            </p>

            <h2>17. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service or need to
              discuss a specific situation related to our services, please
              contact us:
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
                <a href="tel:+16478238262">+1 (647) 823-8262</a>
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
