-- Boss Round mixes Units 1–4, so a boss draft is stored once for the grade.
-- unit_id "mixed" is only for that practice row. Revision cards stay on unit1–unit6.

alter table public.practice_items drop constraint practice_items_unit_check;
alter table public.practice_items
  add constraint practice_items_unit_check
  check (unit_id in ('unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6', 'mixed'));
