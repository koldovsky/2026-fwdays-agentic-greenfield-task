"""Generate the canonical 100-sentence English chapter fixture.

Produces ``tests/fixtures/chapters/100_english_sentences.html``: a single
``<p>`` containing 100 lorem-style sentences separated by ``. `` and
ended with a final period. The fixture is calibrated to satisfy the
BDD acceptance contract:

- NLTK punkt_tab branch (language="en"): 100 sentences → 100 chunks.
- Regex fallback branch (language="ja", forces fallback): 100 sentences
  → 100 chunks via ``r'(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ])'``.

The text uses Petersburgh-typographical conventions (no ``Mr.`` /
``U.S.A.`` abbreviations that would split mid-sentence).
"""

from __future__ import annotations

import sys
from pathlib import Path

# 100 hand-crafted English sentences. Each ends in ``.`` and the next
# starts with an ASCII capital letter. No abbreviations, no dialog
# em-dashes, no nested quotation marks.
SENTENCES: tuple[str, ...] = (
    "The old library stood at the edge of the meadow where the path curved past the willows.",
    "Inside its walls were books bound in leather and parchment, smelling faintly of cedar and dust.",
    "On summer afternoons the windows were thrown open and the swallows darted between the shelves.",
    "A boy named Theo came every Wednesday with a small basket of bread and a bowl of cherries.",
    "He had learned to read in this room when he was only six years old, perched on a green stool.",
    "The librarian, a tall woman with silver hair, always set aside the newest volumes for him.",
    "She said he had a gift for languages and a hunger for stories from distant lands.",
    "Theo would sit for hours turning pages and tracing the maps of countries he had never seen.",
    "When autumn came the swallows left and the windows were closed against the cold rain.",
    "The boy brought his heaviest coat and a thermos of tea that his mother had brewed at dawn.",
    "Outside the wind shook the willows and the long grass lay flat under the grey sky.",
    "The librarian lit the small copper lamp on her desk and the room glowed amber and warm.",
    "She told him stories of her own childhood in a village by the southern sea.",
    "Her grandmother had been a weaver and her grandfather a sailor who painted pictures of fish.",
    "Theo listened without moving, the book forgotten open on his lap.",
    "One evening a stranger arrived at the library door, his coat dripping from the storm.",
    "He carried a leather case no bigger than a book and asked to see the oldest map in the collection.",
    "The librarian led him past the reading room to a narrow door at the back of the hall.",
    "Inside, on a low wooden table, lay a single sheet of parchment yellowed with age.",
    "The stranger unrolled the map and studied it under the lamplight without speaking.",
    "Theo watched from the doorway, curious and a little afraid of the man's pale eyes.",
    "The stranger traced a route with his finger and then folded the map away in his case.",
    "He thanked the librarian politely and left into the rain without another word.",
    "Theo asked who the man was and the librarian only shook her head and said she did not know.",
    "She locked the back room and put the key in the drawer of her desk as she always did.",
    "The boy walked home through the wet streets, his boots leaving dark prints on the stones.",
    "He thought about the map and the route the stranger had followed with his finger.",
    "At home his mother had prepared a stew of lentils and root vegetables from the garden.",
    "His father was away that week, working at the lighthouse on the northern cliffs.",
    "Theo ate his supper in silence and then went to bed with the curtains open to the moon.",
    "He dreamed of maps and ships and a man whose pale eyes held no warmth at all.",
    "When he woke the rain had stopped and a thin mist lay over the meadow outside.",
    "He went back to the library the next morning before anyone else was awake.",
    "The librarian was not yet at her desk and the back room was still locked as before.",
    "He sat on his green stool and tried to read but the words swam before his eyes.",
    "An hour passed and then the door opened and the librarian came in with a basket of apples.",
    "She saw Theo and smiled and set the basket on the table and poured him a cup of cold milk.",
    "She asked if he had slept well and he said he had dreamed of the stranger and the map.",
    "The librarian was quiet for a long moment and then she said that some maps are not safe to follow.",
    "She said that the parchment in the back room was older than the library itself.",
    "It showed a place that did not exist on any other chart, a city of glass beneath the sea.",
    "Many people had tried to find it over the centuries, she said, and none had ever returned.",
    "Theo asked what had happened to them and the librarian said the sea had taken them quietly.",
    "He asked if the stranger had been a sailor and she said she thought he had been a scholar.",
    "She said he had visited the library once before, twenty years ago, when she was a young girl.",
    "Theo listened carefully and did not interrupt, the way she had taught him to listen.",
    "When she finished speaking the room was very quiet and the light through the window had changed.",
    "The boy asked if he could see the map and the librarian was silent for a long time.",
    "Then she rose and unlocked the back room and led him in and showed him the parchment.",
    "It was covered with fine lines and strange symbols and the names of places in an unknown tongue.",
    "Theo traced the route the stranger had followed the night before with a trembling finger.",
    "The line led from the cliffs of the north down through a river delta to a cove on the southern coast.",
    "From the cove a dotted line ran out to sea and ended at a small circle labeled in the unknown tongue.",
    "Theo asked what the word meant and the librarian said it meant the place that has no name.",
    "She said that people used to call it the city of glass, though no one knew who had given it that name.",
    "The boy asked if anyone had ever reached it and she said the legends said yes, but no one now living.",
    "She said the stranger had asked the same questions twenty years ago and had left the same way.",
    "He had come back the next winter and again the winter after that, each time thinner and paler.",
    "On his fourth visit he had not spoken at all but had simply stood and looked at the parchment for an hour.",
    "Then he had left and had never been seen again, and the librarian had locked the room for good.",
    "She had thought the matter was finished, she said, until the stranger returned the night before.",
    "Theo asked what he had wanted and the librarian said he had wanted the same thing he always wanted.",
    "He had wanted to know whether the city was real, she said, and whether he could reach it in his lifetime.",
    "She said she had told him it was not for mortals to find and he had nodded and gone out into the rain.",
    "Theo said he thought the man was sad and the librarian said yes, she thought so too.",
    "She said that some hungers cannot be satisfied by any meal or any book or any human love.",
    "The boy looked at the map again and the dotted line seemed to shimmer faintly in the lamplight.",
    "He asked if the city was beautiful and the librarian said the legends said it was unbearable in its beauty.",
    "She said that those who saw it forgot everything else and could not bear to return to the world above.",
    "Theo asked if that was why the sailors had not come back and she said yes, that was the reason.",
    "He asked if she had ever wanted to see the city herself and she said once, when she was young, but no longer.",
    "She said that as she grew older she had come to love the world above the water more than any legend.",
    "The boy understood, though he was not yet sure what he himself loved more than anything else.",
    "He thanked her and she locked the back room again and led him out to the reading room.",
    "She gave him a small book of sea shanties and a tin of peppermints from the jar on her desk.",
    "Theo put the book in his basket and went home through the meadow under a high pale sky.",
    "He thought about the city of glass and the man with the pale eyes and the dotted line on the map.",
    "He did not know yet what he would do with the knowledge, but he knew he would not forget it.",
    "That winter the storms came early and the library was closed for several days at a time.",
    "Theo read the sea shanties by the fire and memorized the choruses and taught them to his sister.",
    "She was only four and clapped her hands and stamped her feet when he sang the refrains.",
    "His mother smiled from the doorway and his father wrote letters from the lighthouse on the cliffs.",
    "Theo did not mention the map or the stranger to anyone, not even his sister, not even his mother.",
    "Some things, he felt, were not for sharing, at least not yet, perhaps not ever.",
    "When the snow finally melted the librarian sent him a note asking if he would help catalogue the new arrivals.",
    "He went on the first Wednesday of spring and found the back room unlocked for the first time in years.",
    "The parchment was still on the table but the dotted line seemed fainter than he remembered.",
    "He did not touch it and he did not ask the librarian about it and she did not mention it either.",
    "They worked all morning in comfortable silence and at noon she gave him a bowl of soup and a slice of bread.",
    "He went home through the meadow with the smell of the library still on his hands and his coat.",
    "The willows were budding and the swallows had returned to nest under the eaves of the old building.",
    "Theo knew that the stranger would come again, perhaps that very summer, perhaps not for many years.",
    "He knew too that the city of glass was waiting beneath the sea for whoever was foolish enough to seek it.",
    "And he knew, with a certainty he could not name, that one day he would follow the dotted line himself.",
    "On the first warm evening of May the stranger appeared again at the library door as if no time had passed.",
    "He was thinner than before and his coat was threadbare at the cuffs and his shoes were worn through at the heels.",
    "The librarian let him in without a word and led him to the back room where the parchment still lay on the table.",
    "The stranger unrolled the map and studied it for a long time and then he folded it up and handed it to her.",
    "He said he did not need it any longer and that the city had called him at last and he intended to answer.",
    "The librarian asked if he was sure and he said he had never been more sure of anything in his life.",
)


def build_paragraph() -> str:
    """Return the 100-sentence paragraph wrapped in a single ``<p>`` element."""
    return "<p>" + " ".join(SENTENCES) + "</p>"


def main() -> None:
    out = Path(__file__).resolve().parent / "100_english_sentences.html"
    out.write_text(build_paragraph(), encoding="utf-8")
    print(f"wrote {out} ({len(SENTENCES)} sentences)")


if __name__ == "__main__":
    main()
    sys.exit(0)
