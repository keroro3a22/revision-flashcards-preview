# Boss round battle

Status: built from the agreed design. The boss round stays a 12-question grammar quiz. Answering becomes a fight on one screen.

## Battle screen

The quiz fills the screen. Phone portrait, tablet, and computer all show the boss, the question picture, the sentence, and the four choices together. The page does not scroll.

From top to bottom:

- A small back control, the same destination as today.
- One row: the existing red demon, small, beside a health bar of 12 segments; the player's 3 hearts; the question number, such as `3 / 12`; a mute control.
- The question picture, as large as the leftover space allows, beside or above the sentence. A long sentence uses a slightly smaller type so the choices stay on screen.
- Four choices, pinned along the bottom.

The old row of progress dots is not on this screen. The 12 segments and the question number show progress. Clear, Check, and Next are gone. Tapping a choice attacks at once.

Tapping the picture opens it large over the fight. The fight waits. Closing the picture, by its close control or the dark surround, returns to the same question. A missing picture leaves the sentence and choices usable, and there is nothing to enlarge.

A `Harder` mark stays on the sentence when the question has one.

## One question

The player has 3 hearts for the whole round. The demon has 12 health, one segment per question. The questions, pictures, and answer text are the ones the round already uses.

- A correct tap hits the demon. The same picture flashes and recoils, and one segment empties. The existing reason shows in at most two lines under the sentence. The picture shrinks to make that room, and the choices stay put. About two seconds later the next question appears on its own. After the 12th hit, that pause plays, the demon drops, and the victory screen replaces the fight.
- A wrong tap is a hit from the demon. The picture lunges, one heart is lost, and the chosen option goes dim and cannot be tapped again. The right answer is not shown. The other options stay available.
- The third heart ends the fight at once. That question is not retried.

The first tap locks until the hit has registered. A new question starts with every option available again.

Leaving the fight early does not save hearts or the demon's health, and it does not move the round on to the next set of questions.

## Victory and defeat

Victory shows the word Victory and a picture. The picture is a simple paper-cut celebration in the same flat colours, saved at `assets/boss/victory.png`. Replacing that file is enough for a later picture. The word is page text, so the picture does not need to contain it. One button, Grammar practice, goes to the grammar hub. There is no Try again button. A real clear still earns the Boss Beater badge. A preview opened with `?set=` does not.

Defeat shows the demon and encourages another try. Try again starts the next authored set of 12, which is what finishing a round already does. A second button goes to the grammar hub. Remaining answers are not listed.

Both screens fit without scrolling. Finishing a round, win or lose, still advances the saved set for the next visit. A forced `?set=` preview does not advance it.

Try again reloads the quiz in place. Grammar practice and Back to packs leave the quiz and open on the main page.

## Sound and motion

The fight has a looping tune and four short sounds: a hit on the demon, a hit on the player, victory, and defeat. They are short original tones played by the page, not separate music files. The tune starts when the fight appears. If the browser blocks that, it starts on the first tap. Mute is in the top row, silences the tune and the sounds, and is remembered on this device. Victory and defeat stop the tune and play their short sound.

The demon uses the existing picture. While waiting it bobs slightly. Hits, the lunge, and the fall are motion on that picture.

When the device asks for reduced motion, the demon stays still, the cave arrow does not bounce, and the health bar and hearts still change. Sound is unchanged.

## Cave entrance

The entrance card stays as it is: Ready for the boss, the current sentence, I'm ready, and Practice. Practice still opens the revision cards.

The waiting picture is the cave, not the demon. An arrow points at the dark mouth and bounces toward it. It sits clear of the card. The arrow and I'm ready do the same thing: the cave zooms in, as if the player walks into the mouth, then the fight appears with the fade the entrance already uses. Reduced motion still opens the quiz directly.

The sign-in control stays off the quiz, as it does now.
