/// Groups [ChordType] values into musically coherent categories used by the
/// Chord Reference screen to render sectioned catalogs.
///
/// Declaration order is the display order used by [ChordReferenceScreen].
enum ChordCategory {
  triads,
  suspended,
  added,
  sixths,
  sevenths,
  ninths,
  elevenths,
  thirteenths,
  alteredDominants,
  hybrid,
}

const _displayNames = <ChordCategory, String>{
  ChordCategory.triads: 'Triads',
  ChordCategory.suspended: 'Suspended',
  ChordCategory.added: 'Added-tone',
  ChordCategory.sixths: 'Sixths',
  ChordCategory.sevenths: 'Sevenths',
  ChordCategory.ninths: 'Ninths',
  ChordCategory.elevenths: 'Elevenths',
  ChordCategory.thirteenths: 'Thirteenths',
  ChordCategory.alteredDominants: 'Altered Dominants',
  ChordCategory.hybrid: 'Hybrid / Misc',
};

extension ChordCategoryX on ChordCategory {
  /// Human-readable section title used by the Chord Reference screen.
  String get displayName => _displayNames[this]!;
}
