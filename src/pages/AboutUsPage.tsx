import { LegalPage } from '@/pages/LegalPage';

export function AboutUsPage() {
  return (
    <LegalPage
      title="About WORKER GIG BD"
      description="WORKER GIG BD is a Bangladeshi micro-task marketplace connecting earners with employers. Learn about our mission, how the platform works, and how we keep payments safe."
      path="/about"
      updated="August 2026"
    >
      <h2>Our Mission</h2>
      <p>
        WORKER GIG BD was built with one simple goal: to give every Bangladeshi with a smartphone
        and an internet connection a real, honest way to earn money online. Millions of people in
        Bangladesh want to work online but do not know where to start, and thousands of businesses
        need small digital tasks done quickly. We connect these two sides in one trusted marketplace.
      </p>

      <h2>What We Do</h2>
      <p>
        We are a micro-job marketplace. Employers post small tasks — such as following a page,
        watching a video, installing an app, writing a short review, or testing a website — and
        set a reward for each completed task. Workers browse the marketplace, complete the tasks,
        submit proof (usually a screenshot), and get paid once the employer approves the work.
        From social media engagement to surveys and sign-ups, there are more than 45 categories
        of tasks available every day.
      </p>

      <h2>How Payments Work</h2>
      <p>
        Trust is everything in online earning. That is why every employer must deposit funds into
        the platform <strong>before</strong> a job goes live, so the money for a task is already
        secured before a worker starts it. Workers can withdraw their earnings through bKash,
        Nagad, and Rocket — the mobile banking services Bangladeshis already use every day.
        Deposits and withdrawals are reviewed by our team to keep both sides safe.
      </p>

      <h2>Safety and Fairness</h2>
      <p>
        We verify users, monitor task quality, and act on reports from both workers and employers.
        Duplicate or fake proof submissions are automatically detected, accounts that break the
        rules are suspended, and every payment leaves an auditable transaction record. Our support
        team is reachable through the in-platform ticket system and live chat, and you can always
        reach us through the details on our <a href="/contact">Contact page</a>.
      </p>

      <h2>Who We Serve</h2>
      <p>
        Whether you are a student looking for part-time income, a homemaker earning from your
        phone, or a business owner who needs a thousand real people to engage with your brand —
        WORKER GIG BD is built for you. We are proud to be a Bangladeshi platform, made for
        Bangladesh, and available nationwide.
      </p>

      <p>
        Have questions? Visit our <a href="/contact">Contact Us</a> page, read the{' '}
        <a href="/terms-of-service">Terms of Service</a>, or explore earning guides on our{' '}
        <a href="/blog">blog</a>.
      </p>
    </LegalPage>
  );
}
