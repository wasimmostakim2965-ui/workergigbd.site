import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve('dist');
const ORIGIN = 'https://www.workergigbd.site';

const routes = [
  ['/', 'WORKER GIG BD | Micro Jobs & Online Work in Bangladesh', 'বাংলাদেশে ছোট অনলাইন কাজ খুঁজুন বা বৈধ micro-task পোস্ট করুন। WORKER GIG BD-তে workers ও employers-এর জন্য task, proof এবং marketplace workflow সম্পর্কে জানুন।', 'বাংলাদেশের Micro Job ও ছোট অনলাইন কাজের প্ল্যাটফর্ম', 'WORKER GIG BD বাংলাদেশ-কেন্দ্রিক micro-task marketplace। কর্মীরা বৈধ ছোট কাজ খুঁজতে পারেন এবং employers নির্দিষ্ট নিয়ম, reward ও proof requirements দিয়ে কাজ পোস্ট করতে পারেন। কাজ নেওয়ার আগে instructions, reward এবং proof requirements বুঝে নেওয়া গুরুত্বপূর্ণ।'],
  ['/for-employers', 'বাংলাদেশে Micro Job পোস্ট করুন | WORKER GIG BD', 'বাংলাদেশের কর্মীদের জন্য বৈধ micro-task পোস্ট করুন। কাজের নিয়ম, reward ও proof requirements সেট করে submission যাচাই করুন।', 'বাংলাদেশে ছোট কাজ করানোর জন্য worker খুঁজছেন?', 'Survey, research, website বা app testing, data collection এবং অন্যান্য বৈধ micro-task-এর জন্য clear instructions, reward, worker count ও proof requirements সেট করুন। Employer হিসেবে measurable completion criteria ব্যবহার করলে workerরা কাজটি সহজে বুঝতে পারে এবং submission review করা সহজ হয়।'],
  ['/blog', 'Micro Job ও Online Work Guide | WORKER GIG BD', 'বাংলাদেশে micro job, online work, task submission, নিরাপদ কাজ ও marketplace ব্যবহার নিয়ে WORKER GIG BD-এর guide পড়ুন।', 'Micro Job ও Online Work Guide', 'কাজ খোঁজা, task বুঝে নেওয়া, proof submission, approval, withdrawal এবং employer job posting নিয়ে practical guide পড়ুন। Workers-এর জন্য earning basics ও safety এবং employers-এর জন্য clear task design ও submission review নিয়ে আলাদা তথ্য রয়েছে।'],
  ['/blog/earn-money-online-bangladesh-micro-tasks', 'How to Earn Money Online in Bangladesh with Micro Tasks | WORKER GIG BD', 'বাংলাদেশে micro-task করে online earning শুরু করার guide: account, task requirements, proof submission ও withdrawal basics।', 'How to Earn Money Online in Bangladesh with Micro Tasks', 'Micro-task হলো ছোট ও নির্দিষ্ট digital কাজ। শুরু করার আগে instructions ও reward বুঝুন, কাজটি সত্যভাবে সম্পন্ন করুন এবং চাওয়া proof পরিষ্কারভাবে submit করুন। Approval employer review ও platform rules-এর ওপর নির্ভর করে। Accuracy, সততা এবং পরিষ্কার proof ভালো workflow-এর মূল অংশ।'],
  ['/blog/withdraw-earnings-bkash-nagad-rocket', 'How to Withdraw Earnings via bKash, Nagad and Rocket | WORKER GIG BD', 'bKash, Nagad ও Rocket-এ earnings withdrawal করার আগে balance, wallet number ও request status কীভাবে যাচাই করবেন।', 'bKash, Nagad ও Rocket-এ Earnings Withdrawal Guide', 'Withdrawal করার আগে current minimum requirement, available balance এবং wallet number ঠিক আছে কি না যাচাই করুন। Dashboard-এর withdrawal workflow অনুসরণ করে request submit করুন এবং status দেখুন। Payment timing current rules ও review-এর ওপর নির্ভর করতে পারে।'],
  ['/blog/post-a-job-get-work-done', 'How to Post a Job and Get Work Done Fast | WORKER GIG BD', 'বাংলাদেশে micro job পোস্ট করার guide: clear instructions, reward, worker count এবং proof requirements কীভাবে সেট করবেন।', 'How to Post a Job and Get Work Done Fast', 'ভালো micro-task job-এর title, উদ্দেশ্য, step-by-step instructions, reward, worker সংখ্যা এবং proof requirement পরিষ্কার হওয়া উচিত। Survey, research, testing, data collection ও অন্যান্য বৈধ ছোট কাজের জন্য measurable completion criteria ব্যবহার করুন এবং submissions নিয়মিত review করুন।'],
  ['/blog/avoid-scams-keep-account-safe', '7 Rules to Avoid Scams and Keep Your Account Safe | WORKER GIG BD', 'Micro-task marketplace নিরাপদে ব্যবহার করার guide: password, OTP, suspicious tasks, fake proof ও unsafe payment request সম্পর্কে জানুন।', '7 Rules to Avoid Scams and Keep Your Account Safe', 'Online earning platform ব্যবহারের সময় password বা OTP কারও সঙ্গে share করবেন না। সন্দেহজনক task বা payment request দেখলে platform-এর report বা support channel ব্যবহার করুন। Proof সত্য এবং নিজের সম্পন্ন করা কাজের হওয়া উচিত। Fake accounts বা misleading activity এড়িয়ে চলুন।'],
  ['/blog/free-vs-premium-membership', 'Free vs Premium Membership: Which One Is Right for You? | WORKER GIG BD', 'Free ও Premium membership বেছে নেওয়ার আগে current features, pricing, eligibility ও terms যাচাই করার guide।', 'Free vs Premium Membership', 'Membership বেছে নেওয়ার আগে current benefits, eligibility, pricing এবং terms যাচাই করুন। নতুন worker-এর জন্য free experience দিয়ে workflow বোঝা উপকারী হতে পারে। Premium সুবিধা ব্যবহার করার আগে dashboard-এ বর্তমানে কী কী সুবিধা সক্রিয় আছে তা দেখে সিদ্ধান্ত নিন। কোনো membership থেকে নির্দিষ্ট income guaranteed নয়।'],
  ['/blog/how-task-approval-works', 'How Task Approval Works and Why Your Proof Matters | WORKER GIG BD', 'Task approval workflow বুঝুন: instructions, screenshot proof, rejection reasons এবং support process সম্পর্কে জানুন।', 'How Task Approval Works', 'একটি task সাধারণত instructions পড়া, কাজ সম্পন্ন করা, required proof submit করা এবং review-এর মধ্য দিয়ে যায়। Screenshot যেন প্রয়োজনীয় action পরিষ্কারভাবে দেখায়। Task-এর কোনো অংশ বাদ গেলে বা proof requirement পূরণ না হলে submission reject হতে পারে।'],
  ['/blog/referral-program-earn-inviting-friends', 'Referral Program: Earn by Inviting Friends | WORKER GIG BD', 'Referral program কীভাবে কাজ করে, referral link কোথায় পাওয়া যায় এবং real users invite করা কেন গুরুত্বপূর্ণ তা জানুন।', 'Referral Program: Earn by Inviting Friends', 'Referral program ব্যবহার করলে নিজের referral link দিয়ে real users-কে platform সম্পর্কে জানানো যায়। Current terms, eligibility ও reward dashboard-এ যাচাই করুন। Fake accounts, self-referrals বা misleading claims ব্যবহার না করে পরিচিত মানুষকে honest information দিন।'],
  ['/blog/beginners-guide-micro-jobs-first-payment', "A Beginner's Guide to Micro-Jobs: From Signup to First Payment | WORKER GIG BD", 'Micro-job beginner guide: signup থেকে প্রথম task, proof submission, approval এবং withdrawal পর্যন্ত workflow বুঝে শুরু করুন।', "A Beginner's Guide to Micro-Jobs: From Signup to First Payment", 'নতুন হলে account তৈরি করে platform rules ও task instructions পড়ুন। সহজ requirement-এর কাজ দিয়ে শুরু করুন। কাজ শেষে required proof ঠিকভাবে submit করুন এবং approval status দেখুন। Withdrawal করার আগে current balance requirement ও payment method-এর rules যাচাই করুন।'],
  ['/about', 'About WORKER GIG BD | Bangladesh Micro-Task Platform', 'WORKER GIG BD কী এবং কীভাবে বাংলাদেশে workers ও employers-কে micro-task workflow-তে যুক্ত করে তা জানুন।', 'WORKER GIG BD সম্পর্কে', 'WORKER GIG BD-এর লক্ষ্য হলো বাংলাদেশে ছোট, বৈধ ও স্পষ্টভাবে নির্দেশিত কাজের জন্য workers এবং employers-এর মধ্যে একটি সহজ marketplace তৈরি করা। Workers task requirements দেখে কাজ বেছে নিতে পারেন এবং employers নির্দিষ্ট completion criteria দিয়ে workflow পরিচালনা করতে পারেন।'],
  ['/contact', 'Contact WORKER GIG BD | Support', 'WORKER GIG BD সম্পর্কে প্রশ্ন, account support বা marketplace সংক্রান্ত সহায়তার জন্য যোগাযোগের তথ্য দেখুন।', 'WORKER GIG BD-তে যোগাযোগ করুন', 'অ্যাকাউন্ট, কাজ, employer workflow বা platform সংক্রান্ত সহায়তার প্রয়োজন হলে contact page ব্যবহার করুন। যোগাযোগের সময় সমস্যার সংক্ষিপ্ত বিবরণ ও প্রাসঙ্গিক task information দিন। কখনও password বা OTP শেয়ার করবেন না।'],
  ['/privacy-policy', 'Privacy Policy | WORKER GIG BD', 'WORKER GIG BD কীভাবে account, platform এবং website ব্যবহারের সঙ্গে সম্পর্কিত তথ্য পরিচালনা করে তা privacy policy-তে পড়ুন।', 'Privacy Policy', 'WORKER GIG BD ব্যবহারের সময় তথ্য ও গোপনীয়তা সম্পর্কিত নীতিমালা এখানে দেওয়া হয়েছে। account information, platform usage এবং support interactions সম্পর্কিত বর্তমান policy বুঝে সেবা ব্যবহার করুন।'],
  ['/terms-of-service', 'Terms of Service | WORKER GIG BD', 'WORKER GIG BD marketplace ব্যবহারের নিয়ম, user responsibilities এবং service terms এখানে দেখুন।', 'Terms of Service', 'WORKER GIG BD ব্যবহারের শর্ত, user responsibilities এবং platform rules সম্পর্কে বিস্তারিত জানতে এই পেজটি দেখুন। Task নেওয়া, proof submit করা, account ব্যবহার এবং employer workflow-এর ক্ষেত্রে বর্তমান service terms অনুসরণ করুন।']
];

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const base = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');

function render([route, title, description, heading, text]) {
  const canonical = `${ORIGIN}${route}`;
  const related = route.startsWith('/blog/')
    ? '<a href="/blog">সব গাইড</a> · <a href="/signup">সাইন আপ</a> · <a href="/for-employers">কাজ পোস্ট করুন</a>'
    : route === '/for-employers'
      ? '<a href="/signup">Employer হিসেবে শুরু করুন</a> · <a href="/blog/post-a-job-get-work-done">Job posting guide</a> · <a href="/contact">যোগাযোগ</a>'
      : '<a href="/signup">সাইন আপ</a> · <a href="/for-employers">কাজ পোস্ট করুন</a> · <a href="/blog">গাইড ও ব্লগ</a>';
  const body = `<main style="padding:32px 20px;font-family:system-ui,-apple-system,sans-serif;max-width:920px;margin:0 auto"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(text)}</p><p>WORKER GIG BD-তে কাজ করার আগে platform-এর বর্তমান rules, task requirements, reward এবং proof requirements যাচাই করুন। Workers-এর জন্য honest completion এবং clear proof গুরুত্বপূর্ণ; employers-এর জন্য clear instructions ও fair completion criteria গুরুত্বপূর্ণ।</p><nav aria-label="Related links" style="display:flex;gap:16px;flex-wrap:wrap">${related}</nav></main>`;
  return base
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="title" content="[^"]*"\s*\/>/, `<meta name="title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:url" content="[^"]*"\s*\/>/, `<meta name="twitter:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/"logo":\s*"[^"]*"/g, `"logo": "${ORIGIN}/og-image.png"`)
    .replace(/<div id="root"><\/div>/, `<div id="root">${body}</div>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, '');
}

for (const route of routes) {
  const dir = route[0] === '/' ? DIST : path.join(DIST, route[0].slice(1));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), render(route), 'utf8');
}

console.log(`Prerendered ${routes.length} public routes.`);
