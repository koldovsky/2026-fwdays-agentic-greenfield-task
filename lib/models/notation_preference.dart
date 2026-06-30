enum NotationPreference { sharps, flats }

typedef _NotationMeta = ({String glyph, String prefsValue, String displayName});

const _meta = <NotationPreference, _NotationMeta>{
  NotationPreference.sharps: (
    glyph: '♯',
    prefsValue: 'sharps',
    displayName: 'Sharps',
  ),
  NotationPreference.flats: (
    glyph: '♭',
    prefsValue: 'flats',
    displayName: 'Flats',
  ),
};

extension NotationPreferenceX on NotationPreference {
  String get glyph => _meta[this]!.glyph;
  String get prefsValue => _meta[this]!.prefsValue;
  String get displayName => _meta[this]!.displayName;
}
