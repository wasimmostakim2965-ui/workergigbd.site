/*
# Seed Categories and Admin Settings

## Overview
Seeds the categories table with the full task category list and creates default admin feature toggles.

## Data Inserted
1. 14 task categories with subcategories (Facebook, Twitter, Instagram, YouTube, TikTok, Sign Up, Ads Click, Survey, Gmail, Mobile App, Article, Comment, LinkedIn, Reddit)
2. Admin feature toggle settings (deposit enabled, withdrawal enabled, registration enabled, etc.)
*/

-- ==================== CATEGORIES ====================
INSERT INTO public.categories (name, icon, subcategories, display_order) VALUES
('Facebook', 'facebook', '{"Picture Like","Page Like","Follower","Join Group","Like + Comment"}', 1),
('Twitter', 'twitter', '{"Follow","Favourite","Retweet"}', 2),
('Instagram', 'instagram', '{"Follow","Like","Comment"}', 3),
('YouTube/Toffe', 'youtube', '{"Subscribe","Watch Video","Comment","Share"}', 4),
('TikTok', 'tiktok', '{"Video Watch","Follow","Like"}', 5),
('Sign Up', 'user-plus', '{"Simple","Complex"}', 6),
('Ads Click', 'mouse-pointer-click', '{"Click 1x","Click 2x","Click 3x","Click 4x","Click 5x","Click 6x","Click 7x","Click 8x"}', 7),
('Survey', 'clipboard-list', '{"Short","Long"}', 8),
('Gmail Account', 'mail', '{"New Gmail","Old Gmail"}', 9),
('Mobile Application', 'smartphone', '{"Download","Download + Install","Download + Install + Review"}', 10),
('Write an Article', 'pen-tool', '{"75 words","150 words","300 words","500 words"}', 11),
('Comment', 'message-square', '{"Facebook","YouTube","Reddit"}', 12),
('LinkedIn', 'linkedin', '{"Connect","Follow","Profile Create"}', 13),
('Reddit', 'reddit', '{"Upvote","Downvote","Comment"}', 14)
ON CONFLICT DO NOTHING;

-- ==================== ADMIN SETTINGS ====================
INSERT INTO public.admin_settings (key, value, category, description, is_boolean) VALUES
('deposit_enabled', 'true', 'features', 'Allow users to submit deposit requests', true),
('withdrawal_enabled', 'true', 'features', 'Allow users to submit withdrawal requests', true),
('registration_enabled', 'true', 'features', 'Allow new user registration', true),
('job_posting_enabled', 'true', 'features', 'Allow users to post new jobs', true),
('ads_enabled', 'true', 'features', 'Allow advertisement submissions', true),
('premium_enabled', 'true', 'features', 'Allow premium subscription purchases', true),
('referral_enabled', 'true', 'features', 'Allow referral bonus system', true),
('min_deposit', '100', 'limits', 'Minimum deposit amount in BDT', false),
('min_withdrawal', '500', 'limits', 'Minimum withdrawal amount in BDT', false),
('referral_bonus', '10', 'limits', 'Referral bonus amount in BDT', false),
('premium_price', '500', 'limits', 'Premium subscription price in BDT', false),
('premium_duration_days', '30', 'limits', 'Premium subscription duration in days', false),
('site_name', 'Worker Gig BD', 'general', 'Website name', false),
('site_domain', 'workergigbd.site', 'general', 'Website domain', false),
('support_email', 'support@workergigbd.site', 'general', 'Support email address', false)
ON CONFLICT (key) DO NOTHING;
