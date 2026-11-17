-- Book-name pictures on the first visit, after the publisher and before the level.
-- The same live view stays. An empty published picture keeps the built-in one.

alter table public.onboarding_images drop constraint onboarding_images_id_check;

alter table public.onboarding_images add constraint onboarding_images_id_check check (id in (
  'book-longman',
  'book-oxford',
  'series-oxford',
  'series-mypearson-express',
  'series-elect',
  'level-p1',
  'level-p2',
  'level-p3',
  'level-p4',
  'level-p5',
  'level-p6'
));
