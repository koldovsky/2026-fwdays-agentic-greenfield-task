// Sample Bookshelf library data — books, notes, shelves.
window.BS_DATA = (function () {
  const books = [
    { id: 'human-condition', title: 'The Human Condition', author: 'Hannah Arendt', cover: 'coral',
      rating: 9, status: 'finished', tags: ['philosophy', 're-read'], year: 1958, pages: 349,
      summary: 'Arendt distinguishes labor, work, and action as the three fundamental human activities, arguing that genuine politics lives in action — speech and deed among equals — and warning that modern life increasingly collapses all three into mere labor.' },
    { id: 'invisible-cities', title: 'Invisible Cities', author: 'Italo Calvino', cover: 'teal',
      rating: 10, status: 'finished', tags: ['fiction', 'favorites'], year: 1972, pages: 165,
      summary: 'Marco Polo describes 55 impossible cities to Kublai Khan — each a meditation on memory, desire, and the way every place we imagine is really a version of the one we came from.' },
    { id: 'on-photography', title: 'On Photography', author: 'Susan Sontag', cover: 'amber',
      rating: 8, status: 'reading', tags: ['essays', 'art'], year: 1977, pages: 207,
      summary: '' },
    { id: 'pale-fire', title: 'Pale Fire', author: 'Vladimir Nabokov', cover: 'purple',
      rating: 9, status: 'finished', tags: ['fiction', 'favorites'], year: 1962, pages: 246,
      summary: 'A 999-line poem wrapped in the deranged commentary of a neighbor who believes it is secretly about him — a novel that turns the act of reading into the plot.' },
    { id: 'thinking-fast', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', cover: 'blue',
      rating: 7, status: 'finished', tags: ['psychology'], year: 2011, pages: 499, summary: '' },
    { id: 'art-of-loving', title: 'The Art of Loving', author: 'Erich Fromm', cover: 'green',
      rating: 8, status: 'finished', tags: ['philosophy'], year: 1956, pages: 192, summary: '' },
    { id: 'silent-spring', title: 'Silent Spring', author: 'Rachel Carson', cover: 'ink',
      rating: 0, status: 'toread', tags: ['science'], year: 1962, pages: 378, summary: '' },
    { id: 'gilead', title: 'Gilead', author: 'Marilynne Robinson', cover: 'amber',
      rating: 0, status: 'toread', tags: ['fiction'], year: 2004, pages: 247, summary: '' },
  ];

  const notes = [
    { id: 'n1', bookId: 'human-condition', color: 'coral', page: 88, links: 3, tags: ['ethics', 're-read'],
      excerpt: "The opposite of love is not hate, it's indifference.",
      note: 'Connects to Fromm — attention as the real currency of care. Indifference is a refusal to act, and for Arendt action is where we become human.' },
    { id: 'n2', bookId: 'human-condition', color: 'blue', page: 176, links: 1, tags: ['politics'],
      excerpt: 'Action, the only activity that goes on directly between men.',
      note: 'The whole book hinges here — plurality is the condition of action.' },
    { id: 'n3', bookId: 'human-condition', color: 'yellow', page: 247, links: 0, tags: [],
      excerpt: 'Forgiving releases us from the consequences of what we have done.',
      note: 'Forgiveness as a political faculty, not just a private one. Unexpected.' },
    { id: 'n4', bookId: 'invisible-cities', color: 'teal', page: 44, links: 2, tags: ['favorites'],
      excerpt: 'Cities, like dreams, are made of desires and fears.',
      note: 'Every city Polo describes is really Venice. The whole book is a hall of mirrors.' },
    { id: 'n5', bookId: 'invisible-cities', color: 'purple', page: 164, links: 4, tags: ['ethics'],
      excerpt: 'Seek and learn to recognize who and what, in the midst of the inferno, are not inferno.',
      note: 'The closing line. The one instruction the book actually gives you.' },
    { id: 'n6', bookId: 'on-photography', color: 'amber', page: 3, links: 1, tags: ['art'],
      excerpt: 'To collect photographs is to collect the world.',
      note: 'Sontag opens by framing photography as acquisition. Ties to Benjamin.' },
  ];

  const shelves = [
    { tag: 'philosophy', label: 'Philosophy', color: 'var(--hl-coral)' },
    { tag: 'fiction', label: 'Fiction', color: 'var(--hl-teal)' },
    { tag: 'essays', label: 'Essays', color: 'var(--hl-amber)' },
    { tag: 'favorites', label: 'Favorites', color: 'var(--hl-pink)' },
    { tag: 'science', label: 'Science', color: 'var(--hl-green)' },
    { tag: 'psychology', label: 'Psychology', color: 'var(--hl-blue)' },
  ];

  return { books, notes, shelves };
})();
