-- Get started can store the packs heading and each pack's picture and words.
-- An empty published field still keeps the picture and words students already see.

alter table public.site_pages drop constraint site_pages_slot_check;
alter table public.site_pages drop constraint site_pages_slot_place;

alter table public.site_pages add constraint site_pages_slot_check check (slot in (
  'title', 'revision-vocab', 'revision-grammar', 'practice-vocab', 'practice-grammar',
  'hero', 'hear', 'see', 'read',
  'packs', 'pack-unit1', 'pack-unit2', 'pack-unit3', 'pack-unit4', 'pack-unit5', 'pack-unit6'
));

alter table public.site_pages add constraint site_pages_slot_place check (
  (unit_id = 'home' and slot in (
    'hero', 'hear', 'see', 'read',
    'packs', 'pack-unit1', 'pack-unit2', 'pack-unit3', 'pack-unit4', 'pack-unit5', 'pack-unit6'
  ))
  or (unit_id <> 'home' and slot in (
    'title', 'revision-vocab', 'revision-grammar', 'practice-vocab', 'practice-grammar'
  ))
);
