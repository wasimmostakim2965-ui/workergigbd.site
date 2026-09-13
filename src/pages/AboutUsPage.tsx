import { LegalPage } from '@/pages/LegalPage';

export function AboutUsPage() {
  return (
    <LegalPage
      title="About WORKER GIG BD"
      description="WORKER GIG BD is a Bangladeshi micro-task marketplace connecting earners with employers. Learn about our mission, how the platform works, and how we keep payments safe."
      path="/about"
      updated="August 2026"
    >
      <p>
        WORKER GIG BD is operated as an online marketplace for users in Bangladesh. The
        information on this page describes the service as it is intended to work; it is not a
        promise of income, task availability, approval, or withdrawal timing.
      </p>

      <h2>Our Mission</h2>
      <p>
        WORKER GIG BD aims to make small online tasks easier to discover and manage for workers and
        employers in Bangladesh. We try to explain task requirements, proof requirements, payment
        status, and account rules clearly so that users can make informed decisions.
      </p>

      <h2>What We Do</h2>
      <p>
        We are a micro-job marketplace. Employers post tasks, set requirements and set a reward.
        Workers review the instructions, decide whether a task is suitable, submit the requested
        proof, and wait for review under the platform rules. Task availability, rewards, approval
        decisions, and processing times can change and should always be checked on the task page.
      </p>

      <h2>How Payments Work</h2>
      <p>
        Employers are required to deposit funds before an eligible job goes live. Workers may
        request withdrawals through the available mobile-financial-service options after meeting
        the current requirements. Requests can be reviewed, delayed, rejected, or changed under
        the Terms of Service; users should not treat a balance or a task reward as guaranteed cash
        until the withdrawal is completed.
      </p>

      <h2>Safety and Fairness</h2>
      <p>
        We review reports from workers and employers and may restrict accounts or tasks that break
        the rules. Users should report suspicious instructions, requests for passwords or payment,
        duplicate proof, impersonation, and misleading tasks. Our support team is reachable through
        the in-platform ticket system and the details on our <a href="/contact">Contact page</a>.
      </p>

      <h2>Who We Serve</h2>
      <p>
        The service is intended for adults and businesses that can follow the platform rules and
        applicable laws. It is not employment, financial advice, or a guarantee of income. Users
        are responsible for checking whether a task is lawful, truthful, safe, and consistent with
        the rules of any third-party service involved.
      </p>

      <p>
        Have questions? Visit our <a href="/contact">Contact Us</a> page, read the{' '}
        <a href="/terms-of-service">Terms of Service</a>, or explore earning guides on our{' '}
        <a href="/blog">blog</a>.
      </p>
    </LegalPage>
  );
}
