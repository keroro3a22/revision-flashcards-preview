-- Door notes that are still the old default use the approved sentences.
-- An edited note is left alone. An empty note keeps the sentence in site-pages.js.

update public.site_pages
set
  note = case note
    when 'Open the word cards.' then 'Review the words in this unit.'
    when 'Open the grammar cards.' then 'Review the grammar in this unit.'
    when 'Open the quizzes.' then 'Try the word quizzes.'
    when 'Open the grammar games.' then 'Practise the grammar in games.'
    else note
  end,
  published = case
    when published is null then null
    else jsonb_set(
      published,
      '{note}',
      to_jsonb(
        case published->>'note'
          when 'Open the word cards.' then 'Review the words in this unit.'
          when 'Open the grammar cards.' then 'Review the grammar in this unit.'
          when 'Open the quizzes.' then 'Try the word quizzes.'
          when 'Open the grammar games.' then 'Practise the grammar in games.'
          else coalesce(published->>'note', '')
        end
      )
    )
  end
where slot in ('revision-vocab', 'revision-grammar', 'practice-vocab', 'practice-grammar')
  and (
    note in (
      'Open the word cards.',
      'Open the grammar cards.',
      'Open the quizzes.',
      'Open the grammar games.'
    )
    or published->>'note' in (
      'Open the word cards.',
      'Open the grammar cards.',
      'Open the quizzes.',
      'Open the grammar games.'
    )
  );
