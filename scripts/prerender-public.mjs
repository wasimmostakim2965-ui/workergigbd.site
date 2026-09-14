import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve('dist');
const ORIGIN = 'https://www.workergigbd.site';

const routes = [
  {
    path: '/',
    title: 'WORKER GIG BD | Micro Jobs & Online Work in Bangladesh',
    description: 'বাংলাদেশে ছোট অনলাইন কাজ খুঁজুন বা বৈধ micro-task পোস্ট করুন। WORKER GIG BD-তে কাজ, proof submission এবং employer tools সম্পর্কে জানুন।',
    heading: 'বাংলাদেশের Micro Job ও ছোট অনলাইন কাজের প্ল্যাটফর্ম',
    text: 'WORKER GIG BD বাংলাদেশ-কেন্দ্রিক micro-task marketplace। কর্মীরা বৈধ ছোট কাজ খুঁজতে পারেন এবং employers নির্দিষ্ট নিয়ম, reward ও proof requirements দিয়ে কাজ পোস্ট করতে পারেন।',
    links: '<a href="/signup">সাইন আপ</a> · <a href="/for-employers">কাজ পোস্ট করতে চান?</a> · <a href="/blog">গাইড ও ব্লগ</a>'
  },
  {
    path: '/for-employers',
    title: 'বাংলাদেশে Micro Job পোস্ট করুন | WORKER GIG BD',
    description: 'বাংলাদেশের কর্মীদের জন্য বৈধ micro-task পোস্ট করুন। কাজের নিয়ম, reward ও proof requirements সেট করে WORKER GIG BD-তে submission যাচাই করুন।',
    heading: 'বাংলাদেশে ছোট কাজ করানোর জন্য worker খুঁজছেন?',
    text: 'Survey, research, website/app testing, data collection এবং অন্যান্য বৈধ micro-task-এর জন্য কাজের নির্দেশনা ও proof requirements নির্ধারণ করে workerদের কাছে পৌঁছান।',
    links: '<a href="/signup">Employer হিসেবে শুরু করুন</a> · <a href="/">হোম</a> · <a href="/contact">যোগাযোগ</a>'
  },
  {
    path: '/blog',
    title: 'Micro Job ও Online Work Guide | WORKER GIG BD',
    description: 'বাংলাদেশে micro job, online work, task submission, নিরাপদ কাজ এবং marketplace ব্যবহার নিয়ে WORKER GIG BD-এর গাইড ও তথ্য পড়ুন।',
    heading: 'Micro Job ও Online Work Guide',
    text: 'কাজ খোঁজা, task বুঝে নেওয়া, proof submission এবং micro-task marketplace ব্যবহারের জন্য আমাদের গাইড ও তথ্য পড়ুন।',
    links: '<a href="/signup">সাইন আপ</a> · <a href="/for-employers">কাজ পোস্ট করুন</a>'
  },
  {
    path: '/about',
    title: 'About WORKER GIG BD | Bangladesh Micro-Task Platform',
    description: 'WORKER GIG BD কী, কার জন্য এবং কীভাবে বাংলাদেশে workers ও employers-কে micro-task workflow-তে যুক্ত করে তা জানুন।',
    heading: 'WORKER GIG BD সম্পর্কে',
    text: 'WORKER GIG BD-এর লক্ষ্য হলো বাংলাদেশে ছোট, বৈধ ও স্পষ্টভাবে নির্দেশিত কাজের জন্য workers এবং employers-এর মধ্যে একটি সহজ marketplace তৈরি করা।',
    links: '<a href="/for-employers">Employers-এর জন্য</a> · <a href="/blog">গাইড পড়ুন</a> · <a href="/contact">যোগাযোগ</a>'
  },
  {
    path: '/contact',
    title: 'Contact WORKER GIG BD | Support',
    description: 'WORKER GIG BD সম্পর্কে প্রশ্ন, account support বা marketplace সংক্রান্ত সহায়তার জন্য যোগাযোগের তথ্য দেখুন।',
    heading: 'WORKER GIG BD-তে যোগাযোগ করুন',
    text: 'অ্যাকাউন্ট, কাজ, employer workflow বা platform সংক্রান্ত সহায়তার প্রয়োজন হলে আমাদের contact page ব্যবহার করুন।',
    links: '<a href="/">হোম</a> · <a href="/for-employers">Employers</a> · <a href="/blog">Blog</a>'
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | WORKER GIG BD',
    description: 'WORKER GIG BD কীভাবে account, platform এবং website ব্যবহারের সঙ্গে সম্পর্কিত তথ্য পরিচালনা করে তা privacy policy-তে পড়ুন।',
    heading: 'Privacy Policy',
    text: 'WORKER GIG BD ব্যবহারের সময় তথ্য ও গোপনীয়তা সম্পর্কিত নীতিমালা এখানে দেওয়া হয়েছে। সম্পূর্ণ policy দেখতে পেজটি ব্যবহার করুন।',
    links: '<a href="/">হোম</a> · <a href="/terms-of-service">Terms of Service</a> · <a href="/contact">যোগাযোগ</a>'
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service | WORKER GIG BD',
    description: 'WORKER GIG BD marketplace ব্যবহারের নিয়ম, user responsibilities এবং service terms এখানে দেখুন।',
    heading: 'Terms of Service',
    text: 'WORKER GIG BD ব্যবহারের শর্ত, user responsibilities এবং platform rules সম্পর্কে বিস্তারিত জানতে এই পেজটি দেখুন।',
    links: '<a href="/">হোম</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/contact">যোগাযোগ</a>'
  },
  {
    path: '/blog/earn-money-online-bangladesh-micro-tasks',
    title: 'How to Earn Money Online in Bangladesh with Micro Tasks | WORKER GIG BD',
    description: 'বাংলাদেশে micro task করে online earning শুরু করার practical guide: account, task selection, proof submission ও withdrawal basics।',
    heading: 'How to Earn Money Online in Bangladesh with Micro Tasks',
    text: 'বাংলাদেশে micro-task marketplace ব্যবহার করে কাজ খোঁজা, task requirements বোঝা, truthful proof জমা দেওয়া এবং earning workflow সম্পর্কে জানুন।',
    links: '<a href="/signup">সাইন আপ</a> · <a href="/blog">সব গাইড</a> · <a href="/for-employers">কাজ পোস্ট করুন</a>'
  },
  {
    path: '/blog/withdraw-earnings-bkash-nagad-rocket',
    title: 'How to Withdraw Earnings via bKash, Nagad and Rocket | WORKER GIG BD',
    description: 'bKash, Nagad ও Rocket-এ micro-task earnings withdrawal করার আগে balance, wallet number ও request status কীভাবে যাচাই করবেন।',
    heading: 'How to Withdraw Your Earnings via bKash, Nagad and Rocket',
    text: 'Withdrawal request দেওয়ার আগে বর্তমান minimum amount, payment method এবং wallet information যাচাই করার একটি সহজ guide।',
    links: '<a href="/signup">অ্যাকাউন্ট শুরু করুন</a> · <a href="/blog">সব গাইড</a> · <a href="/contact">সহায়তা</a>'
  },
  {
    path: '/blog/post-a-job-get-work-done',
    title: 'How to Post a Job and Get Work Done Fast | WORKER GIG BD',
    description: 'বাংলাদেশে micro job পোস্ট করার guide: clear instructions, reward, worker count ও proof requirements কীভাবে সেট করবেন।',
    heading: 'How to Post a Job and Get Real Work Done',
    text: 'Employer হিসেবে একটি clear, legitimate micro-task তৈরি করা, budget নির্ধারণ করা এবং worker submissions review করার মূল বিষয়গুলো জানুন।',
    links: '<a href="/for-employers">Employer guide</a> · <a href="/signup">শুরু করুন</a> · <a href="/blog">সব গাইড</a>'
  },
  {
    path: '/blog/avoid-scams-keep-account-safe',
    title: '7 Rules to Avoid Scams and Keep Your Account Safe | WORKER GIG BD',
    description: 'Online micro-task করার সময় scam, fake proof, password/OTP sharing এবং unsafe payment requests এড়ানোর practical safety guide।',
    heading: '7 Rules to Avoid Scams and Keep Your Account Safe',
    text: 'Micro-task marketplace-এ নিরাপদ থাকার জন্য account security, truthful proof, suspicious requests report করা এবং payment safety সম্পর্কে জানুন।',
    links: '<a href="/signup">সাইন আপ</a> · <a href="/contact">যোগাযোগ</a> · <a href="/blog">সব গাইড</a>'
  },
  {
    path: '/blog/free-vs-premium-membership',
    title: 'Free vs Premium Membership: Which One Is Right for You? | WORKER GIG BD',
    description: 'WORKER GIG BD-এর free ও premium membership বেছে নেওয়ার আগে available features, costs ও current terms যাচাই করার guide।',
    heading: 'Free vs Premium Membership',
    text: 'Free ও premium membership-এর বর্তমান সুবিধা বুঝে নিজের ব্যবহার অনুযায়ী সিদ্ধান্ত নেওয়ার জন্য এই guide পড়ুন।',
    links: '<a href="/signup">সাইন আপ</a> · <a href="/blog">সব গাইড</a> · <a href="/contact">প্রশ্ন করুন</a>'
  },
  {
    path: '/blog/how-task-approval-works',
    title: 'How Task Approval Works and Why Your Proof Matters | WORKER GIG BD',
    description: 'Task proof কীভাবে review হয়, rejection এড়াতে কী দেখাতে হবে এবং submission দেওয়ার আগে কী কী যাচাই করবেন।',
    heading: 'How Task Approval Works and Why Your Proof Matters',
    text: 'Task requirements অনুসরণ, clear proof submission এবং employer review workflow সম্পর্কে সহজভাবে জানুন।',
    links: '<a href="/signup">কাজ শুরু করুন</a> · <a href="/blog">সব গাইড</a> · <a href="/contact">সহায়তা</a>'
  },
  {
    path: '/blog/referral-program-earn-inviting-friends',
    title: 'Referral Program: Earn by Inviting Friends | WORKER GIG BD',
    description: 'Referral link কীভাবে ব্যবহার করবেন, honest sharing কীভাবে করবেন এবং referral program-এর বর্তমান rules কীভাবে বুঝবেন।',
    heading: 'Referral Program: Earn by Inviting Friends',
    text: 'Referral program ব্যবহার করার সময় real users-এর সঙ্গে honest sharing, platform rules এবং account safety মেনে চলার guide।',
    links: '<a href="/signup">সাইন আপ</a> · <a href="/blog">সব গাইড</a> · <a href="/contact">যোগাযোগ</a>'
  },
  {
    path: '/blog/beginners-guide-micro-jobs-first-payment',
    title: "A Beginner's Guide to Micro-Jobs: From Signup to First Payment | WORKER GIG BD",
    description: 'Micro-job beginners-এর roadmap: signup, suitable task বাছাই, proof submission, approval এবং withdrawal-এর basic steps।',
    heading: "A Beginner's Guide to Micro-Jobs: From Signup to First Payment",
    text: 'নতুন workers-এর জন্য account setup থেকে প্রথম legitimate task এবং withdrawal request পর্যন্ত একটি practical starting guide।',
    links: '<a href="/signup">সাইন আপ</a> · <a href="/blog">সব গাইড</a> · <a href="/for-employers">Employer guide</a>'
  }
];

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const base = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');

function render(route) {
  const canonical = `${ORIGIN}${route.path === '/' ? '/' : route.path}`;
  const body = `<main style="padding:32px 20px;font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto"><h1>${escapeHtml(route.heading)}</h1><p>${escapeHtml(route.text)}</p><nav aria-label="Quick links" style="display:flex;gap:16px;flex-wrap:wrap">${route.links}</nav></main>`;

  let html = base
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(/<meta name="title" content="[^"]*"\s*\/>/, `<meta name="title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(route.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(route.description)}" />`)
    .replace(/<meta name="twitter:url" content="[^"]*"\s*\/>/, `<meta name="twitter:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`)
    .replace(/"logo":\s*"[^"]*"/, `"logo": "${ORIGIN}/og-image.png"`)
    .replace(/<div id="root"><\/div>/, `<div id="root">${body}</div>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, '');

  return html;
}

for (const route of routes) {
  const dir = route.path === '/' ? DIST : path.join(DIST, route.path.slice(1));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), render(route), 'utf8');
}

console.log(`Prerendered ${routes.length} public routes.`);
