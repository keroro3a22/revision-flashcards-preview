-- Let studio save the Chat Practiser badge.
-- Older unit-completer ids stay allowed so rows already stored still pass the check.

alter table public.badge_settings drop constraint badge_settings_id_check;

alter table public.badge_settings add constraint badge_settings_id_check check (id in (
  'starter',
  'match-pro',
  'timed-brave',
  'grammar-story',
  'grammar-join',
  'grammar-chat',
  'grammar-inference',
  'grammar-boss',
  'all-rounder',
  'letters-phrase',
  'hard-challenger',
  'unit-done:unit1',
  'unit-done:unit2',
  'unit-done:unit3',
  'unit-done:unit4',
  'unit-done:dictation3'
));
