# Badges and studio places

Status: approved in chat. One change covers the badge pages and the studio open menu.

## Badge progress

Each of the 15 badges has an integer progress and a target. The counting rules stay in `practice/badges.js`.

| Badge | One step | Target |
| --- | --- | --- |
| First Steps, Boss Beater | The whole badge | 1 |
| Unit completer | Fill, Letters, Match for that unit | 3 |
| Inference Ace | A correct Chat Quest mystery | 3, editable 1–99 |
| The other cross-unit and Mixed badges | One unit or one activity | 4 |

Only Inference Ace may change its target, and that change is the unlock threshold. A badge that is already earned stays earned if the target later rises. If a published target drop means the saved count already qualifies, the next successful settings load grants it once and shows the unlock popup.

An empty published field keeps the built-in name, English name, description, or picture.

## Student pages

- On the account profile, a Badges button sits under the avatar grid.
- For a signed-in reader, a Badges button sits to the left of the profile capsule, before Edit lessons.
- A badge card shows the picture, Chinese name, English name, how to earn it, a progress bar, and `n / target`. Earned cards are full and keep the earned date. Locked built-in art stays the gray file. A replaced picture uses a grayscale of that same picture.
- A practice that crosses a published pep step shows one dialog: gray picture, name, how to earn it, progress, and that sentence. The same step is shown once. Reaching the target shows one confetti dialog for every badge unlocked in that session, then the pep dialogs one at a time. Closing the tab keeps the queue on this device until it is dismissed. Sign-out clears it. Seen steps sync with the account. Loading synced progress does not replay old steps.

## Studio places

The first studio control is Open: Home, Unit, Resources, Site.

- Home is the book home: title and Hear it, See it, Read it. No unit and no section.
- Unit is Unit 1–6, then Doors, Revision, or Practice. Doors are the unit title and four doors. Mixed topic and Boss round are practice sources, not units.
- Resources stays on the book.
- Site holds Badges and Ignore words. Ignore words remain one site-wide list.

New paths:

- `…/home/hear`
- `…/unit1/doors/revision-vocab`
- `…/p6/resources`
- `…/practice/vocab/mixed/letters`
- `…/practice/grammar/boss`
- `site/badges/starter`
- `site/letter-ignore`

Old paths still open: `…/home/pages/hear`, `…/unit1/pages/revision-grammar`, and `…/mixed/practice/vocab/letters`.

Game stays a student tab with no studio editor. Word of the day stays automatic.
