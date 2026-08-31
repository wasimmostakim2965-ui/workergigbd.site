export interface BlogBlock {
  type: 'h2' | 'p' | 'ul';
  text?: string;
  items?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  category: string;
  content: BlogBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'earn-money-online-bangladesh-micro-tasks',
    title: 'How to Earn Money Online in Bangladesh with Micro Tasks',
    excerpt:
      'No degree, no investment, no experience — just a phone and internet. Here is exactly how micro-task earning works and how to make your first taka this week.',
    date: '2026-08-01',
    readingTime: '5 min',
    category: 'Getting Started',
    content: [
      {
        type: 'p',
        text: 'Earning money online in Bangladesh no longer requires freelancing skills like graphic design or programming. Micro-task platforms like WORKER GIG BD let anyone earn by completing small digital jobs — following a Facebook page, watching a YouTube video, installing an app, or leaving a review. Each task takes one to five minutes and pays a small reward instantly to your in-platform balance.',
      },
      { type: 'h2', text: 'How it works, step by step' },
      {
        type: 'ul',
        items: [
          'Create a free account with your Google account — it takes under a minute.',
          'Browse the job feed and filter by category or reward amount.',
          'Read the task instructions carefully before starting.',
          'Complete the task and upload the required screenshot proof.',
          'The employer reviews your proof and approves the payment to your balance.',
        ],
      },
      { type: 'h2', text: 'How much can you realistically earn?' },
      {
        type: 'p',
        text: 'Earnings depend on how much time you invest. Casual users who spend 30-60 minutes a day typically earn enough for mobile recharge and small expenses. Power users who complete many tasks daily and refer friends earn significantly more. The key is consistency: new tasks are posted every day, and workers with a clean approval history get the best results.',
      },
      { type: 'h2', text: 'Tips to earn faster' },
      {
        type: 'ul',
        items: [
          'Check the platform every morning — good tasks fill up fast.',
          'Always take fresh, clear screenshots; blurry proof gets rejected.',
          'Complete your profile and get verified to unlock more jobs.',
          'Avoid submitting fake proof — it leads to a permanent ban.',
        ],
      },
      {
        type: 'p',
        text: 'Ready to start? Create your free account today and complete your first task within the next ten minutes.',
      },
    ],
  },
  {
    slug: 'withdraw-earnings-bkash-nagad-rocket',
    title: 'How to Withdraw Your Earnings via bKash, Nagad and Rocket',
    excerpt:
      'A complete guide to cashing out your WORKER GIG BD balance to your mobile banking account — limits, timing, and how to avoid common mistakes.',
    date: '2026-08-03',
    readingTime: '4 min',
    category: 'Payments',
    content: [
      {
        type: 'p',
        text: 'The best part of earning online is getting the money in your hands. WORKER GIG BD supports the three most popular mobile banking services in Bangladesh: bKash, Nagad, and Rocket. This guide walks you through the full withdrawal process.',
      },
      { type: 'h2', text: 'Before you withdraw' },
      {
        type: 'ul',
        items: [
          'Make sure your balance meets the minimum withdrawal amount.',
          'Double-check the mobile number you enter — payments go to exactly the number you type.',
          'Use a personal wallet number, not a merchant/agent number, unless instructed otherwise.',
        ],
      },
      { type: 'h2', text: 'Withdrawal steps' },
      {
        type: 'ul',
        items: [
          'Go to Dashboard → Withdraw.',
          'Choose your method: bKash, Nagad, or Rocket.',
          'Enter your wallet number and the amount.',
          'Submit the request and wait for admin approval.',
        ],
      },
      {
        type: 'p',
        text: 'Every withdrawal is reviewed manually by our team to protect users from fraud. Most requests are processed within 24 hours. You can track the status of every request on the Deposit & Withdrawal history page, and you receive a notification as soon as it is approved.',
      },
      { type: 'h2', text: 'Common mistakes to avoid' },
      {
        type: 'ul',
        items: [
          'Typing the wrong wallet number — always copy-paste or double-check digit by digit.',
          'Requesting more than your available balance.',
          'Submitting multiple requests for the same balance — one pending request at a time.',
        ],
      },
      {
        type: 'p',
        text: 'If a withdrawal takes longer than 48 hours, open a support ticket from your dashboard and our team will resolve it.',
      },
    ],
  },
  {
    slug: 'post-a-job-get-work-done',
    title: 'How to Post a Job and Get Real Work Done Fast',
    excerpt:
      'Need a thousand real people to follow your page, install your app, or review your business? Here is how to post a job that workers love and complete quickly.',
    date: '2026-08-05',
    readingTime: '5 min',
    category: 'For Employers',
    content: [
      {
        type: 'p',
        text: 'WORKER GIG BD is not only for earners — it is the fastest way for businesses, YouTubers, and app developers in Bangladesh to get real human engagement at scale. Thousands of active workers are ready to complete your task within hours.',
      },
      { type: 'h2', text: 'Step 1: Deposit your budget' },
      {
        type: 'p',
        text: 'Jobs are prepaid. You deposit your budget via bKash, Nagad, or Rocket, and our team approves the deposit. This protects workers and is the reason they trust our platform — which means your jobs get done faster.',
      },
      { type: 'h2', text: 'Step 2: Create the job' },
      {
        type: 'ul',
        items: [
          'Write a clear, honest title (e.g. "Follow our Facebook page and like 3 posts").',
          'Describe the exact steps in the instructions — workers should never have to guess.',
          'State exactly what proof you need (e.g. "Screenshot showing the followed button").',
          'Set the number of workers and the reward per worker.',
        ],
      },
      { type: 'h2', text: 'Step 3: Review submissions' },
      {
        type: 'p',
        text: 'As workers submit proof, you approve or reject each one from your dashboard. Approve promptly — fast approval builds your reputation, and workers prioritize employers who pay quickly. If you do not review a submission in time, it is auto-approved after the review window, so your job never stalls.',
      },
      { type: 'h2', text: 'Tips for maximum results' },
      {
        type: 'ul',
        items: [
          'Keep tasks under 3 minutes — short tasks get filled first.',
          'Price fairly; a fair reward attracts better, more careful workers.',
          'Add a sample screenshot image to your job to remove all confusion.',
        ],
      },
      {
        type: 'p',
        text: 'Your first campaign can be live within minutes of your deposit being approved. Post your job today.',
      },
    ],
  },
  {
    slug: 'avoid-scams-keep-account-safe',
    title: '7 Rules to Avoid Scams and Keep Your Account Safe',
    excerpt:
      'Online earning attracts scammers. Follow these seven rules and you will never lose your earnings, your account, or your personal information.',
    date: '2026-08-08',
    readingTime: '4 min',
    category: 'Safety',
    content: [
      {
        type: 'p',
        text: 'The vast majority of tasks and employers on WORKER GIG BD are genuine, but online earning always attracts a few bad actors. These seven rules will keep you, your money, and your account completely safe.',
      },
      {
        type: 'ul',
        items: [
          'Never pay anyone to get a job. On our platform, workers never pay — employers deposit first. Anyone asking a worker for money is a scammer.',
          'Never share your password or OTP with anyone, including people claiming to be admins. Our team will never ask for them.',
          'Do all communication inside the platform. If someone moves you to Telegram/WhatsApp and asks for money, report them immediately.',
          'Never submit fake or duplicate screenshots. Our system detects reused proof, and it leads to a permanent ban.',
          'Withdraw only to your own bKash/Nagad/Rocket number.',
          'Do not create multiple accounts — it is detected and all linked accounts are banned.',
          'Read task instructions fully before starting; honest mistakes cause most rejections.',
        ],
      },
      { type: 'h2', text: 'If something goes wrong' },
      {
        type: 'p',
        text: 'Use the Report button on any suspicious job, or open a support ticket. Our team reviews every report. You can also reach us directly through the Contact page via email or WhatsApp. We would rather answer a hundred questions than see one user get scammed.',
      },
    ],
  },
  {
    slug: 'free-vs-premium-membership',
    title: 'Free vs Premium Membership: Which One Is Right for You?',
    excerpt:
      'Premium members unlock higher-paying jobs and extra benefits. Here is an honest breakdown of what you get and who should upgrade.',
    date: '2026-08-10',
    readingTime: '4 min',
    category: 'Membership',
    content: [
      {
        type: 'p',
        text: 'WORKER GIG BD is free to join and free to use — forever. Every user can browse jobs, complete tasks, and withdraw earnings without paying anything. Premium membership is an optional upgrade for workers who want more.',
      },
      { type: 'h2', text: 'What free members get' },
      {
        type: 'ul',
        items: [
          'Full access to all standard jobs, with no daily limit.',
          'Withdrawals to bKash, Nagad, and Rocket.',
          'Support tickets, notifications, and referral earnings.',
        ],
      },
      { type: 'h2', text: 'What premium adds' },
      {
        type: 'ul',
        items: [
          'Access to premium-only jobs, which pay higher rewards and have less competition.',
          'Priority placement — premium jobs appear at the top of your feed.',
          'A premium badge on your profile, which employers notice when reviewing proof.',
        ],
      },
      { type: 'h2', text: 'Who should upgrade?' },
      {
        type: 'p',
        text: 'If you complete tasks daily and have built a good approval history, premium usually pays for itself quickly because premium-only jobs pay noticeably more per task. If you are just starting out, stay free, learn the platform, and upgrade once you are earning consistently.',
      },
      {
        type: 'p',
        text: 'You can see the current premium price and upgrade from the Premium page in your dashboard. Payment uses your deposited balance, and upgrades are activated by our team after a quick review.',
      },
    ],
  },
  {
    slug: 'how-task-approval-works',
    title: 'How Task Approval Works (and Why Your Proof Matters)',
    excerpt:
      'Why was your submission rejected? How long does approval take? Everything about the review process, auto-approval, and how to get every task approved.',
    date: '2026-08-12',
    readingTime: '4 min',
    category: 'Getting Started',
    content: [
      {
        type: 'p',
        text: 'Every task on WORKER GIG BD follows the same lifecycle: you accept the task, complete the work, submit proof, and the employer reviews it. Understanding this process is the difference between a 95% approval rate and constant frustration.',
      },
      { type: 'h2', text: 'The review timeline' },
      {
        type: 'p',
        text: 'Employers are asked to review submissions promptly. If an employer does not review your proof within the review window, the platform auto-approves it — you never lose money because an employer went inactive.',
      },
      { type: 'h2', text: 'What makes proof get approved' },
      {
        type: 'ul',
        items: [
          'Follow the instructions exactly — if the job says "subscribe and like", do both.',
          'Take a fresh, full screenshot where the required action is clearly visible.',
          'Upload the number of screenshots the job asks for (some jobs need 2 or 3).',
          'Make sure text in the screenshot is readable — do not crop too tightly.',
        ],
      },
      { type: 'h2', text: 'Why submissions get rejected' },
      {
        type: 'ul',
        items: [
          'The screenshot does not show the required action.',
          'Reused or edited screenshots (our system detects duplicates automatically).',
          'The task was only partially completed.',
        ],
      },
      {
        type: 'p',
        text: 'If you believe a rejection was a mistake, open a support ticket with your task details. Fair workers always win disputes when they have done the work honestly.',
      },
    ],
  },
  {
    slug: 'referral-program-earn-inviting-friends',
    title: 'Referral Program: Earn by Inviting Friends',
    excerpt:
      'Share your link, earn a bonus for every friend who joins and works. How the referral system works and how to grow your referral income.',
    date: '2026-08-14',
    readingTime: '3 min',
    category: 'Earning Tips',
    content: [
      {
        type: 'p',
        text: 'The fastest way to grow your income on WORKER GIG BD without completing more tasks yourself is the referral program. Every account has a unique referral link — you will find it on the Share & Earn page in your dashboard.',
      },
      { type: 'h2', text: 'How it works' },
      {
        type: 'ul',
        items: [
          'Copy your personal referral link from the Share & Earn page.',
          'Share it on Facebook, WhatsApp, YouTube, or anywhere your friends are.',
          'When someone joins through your link and becomes active, you receive a referral bonus in your balance.',
        ],
      },
      { type: 'h2', text: 'How to get more referrals' },
      {
        type: 'ul',
        items: [
          'Post your honest earning experience — real screenshots of your withdrawals convince people.',
          'Answer questions from people who join through you; active referrals are the ones that pay.',
          'Share in Bangladeshi earning/freelancing groups where people are already looking for this.',
        ],
      },
      {
        type: 'p',
        text: 'One important rule: self-referrals and fake accounts are detected automatically and lead to a ban for both accounts. Refer real people — that is what makes the program sustainable for everyone.',
      },
    ],
  },
  {
    slug: 'beginners-guide-micro-jobs-first-payment',
    title: "A Beginner's Guide to Micro-Jobs: From Signup to First Payment",
    excerpt:
      'Your complete first-week roadmap: creating an account, picking the right first tasks, submitting perfect proof, and making your first withdrawal.',
    date: '2026-08-16',
    readingTime: '6 min',
    category: 'Getting Started',
    content: [
      {
        type: 'p',
        text: 'Starting something new is always the hardest part. This guide takes you from a brand-new account to your first bKash withdrawal, avoiding every common beginner mistake along the way.',
      },
      { type: 'h2', text: 'Day 1: Set up properly' },
      {
        type: 'ul',
        items: [
          'Sign up with your Google account.',
          'Complete your profile — a real name and photo builds trust with employers.',
          'Read the Terms of Service once; knowing the rules protects your earnings.',
        ],
      },
      { type: 'h2', text: 'Day 1-2: Your first tasks' },
      {
        type: 'p',
        text: 'Start with simple, low-reward tasks like page follows or video watches. They approve quickly and build your history. Sort the job feed by "Latest" and pick tasks with clear instructions. Complete 5-10 small tasks before trying bigger ones.',
      },
      { type: 'h2', text: 'The golden rule of proof' },
      {
        type: 'p',
        text: 'Ninety percent of beginner rejections come from bad screenshots. Before submitting, ask yourself: "If I were the employer, would this screenshot convince me the work is done?" If yes, submit. If not, retake it.',
      },
      { type: 'h2', text: 'Day 3-7: Build momentum' },
      {
        type: 'ul',
        items: [
          'Log in daily — new jobs appear every day and fill fast.',
          'Keep your approval rate high; employers prefer proven workers.',
          'Share your referral link once you have earned your first withdrawal.',
        ],
      },
      { type: 'h2', text: 'Your first withdrawal' },
      {
        type: 'p',
        text: 'Once your balance reaches the minimum, go to Withdraw, choose bKash, Nagad, or Rocket, and enter your number carefully. Your first payment usually arrives within 24 hours. That moment — seeing online work turn into real money in your pocket — is when most of our earners get hooked. Welcome aboard.',
      },
    ],
  },
];
