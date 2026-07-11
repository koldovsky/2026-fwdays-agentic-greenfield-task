"""NLTK language coverage — the D-09 /health/nltk data shape.

NLTK ships ``punkt_tab`` as a bundled all-or-nothing data package
(not a per-language model) covering exactly 19 languages. The legacy
``punkt`` package is marked deprecated by NLTK and is NOT installed.
The hard-coded mapping below is the closed set per CONTEXT D-09 +
ADR 0010 + RESEARCH §Package Legitimacy Audit.

The ``compute_health()`` helper is the single source of truth for the
``GET /api/v1/health/nltk`` response shape. The HTTP route itself ships
in plan 02-03 (router wiring); this module ships the data + the helper
so the route is a one-liner.

The 19 supported languages (ISO 639-1 codes) per NLTK's bundled pickles::

    cs da nl en et fi fr de el it ml no pl pt ru sl es sv tr
"""

from __future__ import annotations

from typing import TypedDict

import nltk

# Locked set per D-09 + ADR 0010. NLTK ships these 19 as the bundled
# punkt_tab data package; no per-language download exists.
SUPPORTED_LANGUAGES: frozenset[str] = frozenset(
    {
        "cs",  # Czech
        "da",  # Danish
        "nl",  # Dutch
        "en",  # English
        "et",  # Estonian
        "fi",  # Finnish
        "fr",  # French
        "de",  # German
        "el",  # Greek
        "it",  # Italian
        "ml",  # Malayalam
        "no",  # Norwegian
        "pl",  # Polish
        "pt",  # Portuguese
        "ru",  # Russian
        "sl",  # Slovene
        "es",  # Spanish
        "sv",  # Swedish
        "tr",  # Turkish
    },
)

# NLTK's pickle filenames → ISO 639-1 codes. Used by ``compute_health``
# to map installed pickle files back to language codes (a closed-set
# walk, never an enumeration of arbitrary pickles).
ISO_639_1_BY_NLTK_NAME: dict[str, str] = {
    "czech": "cs",
    "danish": "da",
    "dutch": "nl",
    "english": "en",
    "estonian": "et",
    "finnish": "fi",
    "french": "fr",
    "german": "de",
    "greek": "el",
    "italian": "it",
    "malayalam": "ml",
    "norwegian": "no",
    "polish": "pl",
    "portuguese": "pt",
    "russian": "ru",
    "slovene": "sl",
    "spanish": "es",
    "swedish": "sv",
    "turkish": "tr",
}

# Reverse map used by the SentenceChunker: NLTK 3.9.4 ``PunktTokenizer``
# expects the full English name (e.g. ``"english"``) at construction
# time, not the ISO 639-1 code. We translate the ISO code → NLTK name
# once here so the chunker accepts the public ISO 639-1 surface.
NLTK_NAME_BY_ISO_639_1: dict[str, str] = {
    iso: nltk_name for nltk_name, iso in ISO_639_1_BY_NLTK_NAME.items()
}


def nltk_name_for(iso_639_1: str) -> str:
    """Return the NLTK full-name for an ISO 639-1 code, or the code itself.

    Falls back to the input string for unknown codes — those languages
    take the regex fallback path anyway, but keeping the round-trip
    safe avoids surprising ``KeyError`` in the chunker.
    """
    return NLTK_NAME_BY_ISO_639_1.get(iso_639_1, iso_639_1)


# The ≥55 ISO 639-1 target languages the SPA exposes in the
# `<TargetLanguageSelect>` dropdown (PRD F2 "≥55 targets" AC). The
# D-09 ``/health/nltk`` endpoint reports ``fallback_languages`` as the
# set difference ``TARGET_LANGUAGES - supported_languages``.
#
# Codes are the 75+ ISO 639-1 entries documented in `docs/PRD.md §9
# Appendix A` (Afrikaans → Zulu). The list is intentionally over the
# 55 minimum so the AC remains satisfied as languages are added.
TARGET_LANGUAGES: frozenset[str] = frozenset(
    {
        "af",  # Afrikaans
        "ar",  # Arabic
        "az",  # Azerbaijani
        "be",  # Belarusian
        "bg",  # Bulgarian
        "bn",  # Bengali
        "bs",  # Bosnian
        "ca",  # Catalan
        "ceb",  # Cebuano
        "co",  # Corsican
        "cs",  # Czech
        "cy",  # Welsh
        "da",  # Danish
        "de",  # German
        "el",  # Greek
        "en",  # English
        "eo",  # Esperanto
        "es",  # Spanish
        "et",  # Estonian
        "eu",  # Basque
        "fa",  # Persian
        "fi",  # Finnish
        "fr",  # French
        "fy",  # Western Frisian
        "ga",  # Irish
        "gd",  # Scottish Gaelic
        "gl",  # Galician
        "gu",  # Gujarati
        "he",  # Hebrew
        "hi",  # Hindi
        "hr",  # Croatian
        "ht",  # Haitian
        "hu",  # Hungarian
        "hy",  # Armenian
        "id",  # Indonesian
        "is",  # Icelandic
        "it",  # Italian
        "ja",  # Japanese
        "jv",  # Javanese
        "ka",  # Georgian
        "kk",  # Kazakh
        "km",  # Khmer
        "kn",  # Kannada
        "ko",  # Korean
        "ku",  # Kurdish
        "ky",  # Kyrgyz
        "la",  # Latin
        "lb",  # Luxembourgish
        "lo",  # Lao
        "lt",  # Lithuanian
        "lv",  # Latvian
        "mg",  # Malagasy
        "mhr",  # Mari
        "mi",  # Maori
        "mk",  # Macedonian
        "ml",  # Malayalam
        "mn",  # Mongolian
        "mr",  # Marathi
        "mrj",  # Hill Mari
        "ms",  # Malay
        "mt",  # Maltese
        "my",  # Burmese
        "ne",  # Nepali
        "nl",  # Dutch
        "no",  # Norwegian
        "pa",  # Punjabi
        "pl",  # Polish
        "pt",  # Portuguese
        "ro",  # Romanian
        "ru",  # Russian
        "sah",  # Yakut
        "si",  # Sinhala
        "sk",  # Slovak
        "sl",  # Slovene
        "sr",  # Serbian
        "sv",  # Swedish
        "sw",  # Swahili
        "ta",  # Tamil
        "te",  # Telugu
        "tg",  # Tajik
        "th",  # Thai
        "tr",  # Turkish
        "tt",  # Tatar
        "uk",  # Ukrainian
        "ur",  # Urdu
        "uz",  # Uzbek
        "vi",  # Vietnamese
        "xh",  # Xhosa
        "yi",  # Yiddish
        "zh",  # Chinese
        "zu",  # Zulu
    }
)


# Hard-coded punkt_tab install footprint (D-09). Both packages
# are required: ``PunktTokenizer`` imports from ``punkt_tab``.
_INSTALL_SIZE_MB_ESTIMATE: dict[str, int] = {"punkt_tab": 4}  # rounded
_SUGGEST_COMMAND_BASE: str = "python -m nltk.downloader "


class NltkHealthDict(TypedDict):
    """Typed shape of the D-09 ``/health/nltk`` response envelope.

    Used as the return type of ``compute_health()`` so pyrefly + callers
    can reason about each field's type without resorting to ``object``.
    """

    supported_languages: list[str]
    fallback_languages: list[str]
    suggest_command: str | None
    install_size_mb_estimate: int | None


def _nltk_resource_installed(resource: str) -> bool:
    """Return True if the NLTK ``resource`` is found in ``nltk.data.path``."""
    try:
        nltk.data.find(resource)
    except LookupError:
        return False
    return True


def _installed_supported_languages() -> frozenset[str]:
    """Return the subset of ``SUPPORTED_LANGUAGES`` whose NLTK punkt_tab data is installed.

    NLTK 3.9.4's ``punkt_tab`` data package stores each language's
    assets in a directory at ``tokenizers/punkt_tab/<name>/`` (e.g.
    ``tokenizers/punkt_tab/english/``), not as a single
    ``<name>.pickle`` file. The directory contains
    ``abbrev_types.txt``, ``collocations.tab``, ``ortho_context.tab``,
    and ``sent_starters.txt``. ``nltk.data.find("tokenizers/punkt_tab/<name>")``
    resolves the directory; we probe one file inside it as a
    stronger signal that the language is fully baked.

    Returns an empty set when nothing is baked.
    """
    installed: set[str] = set()
    for nltk_name, iso in ISO_639_1_BY_NLTK_NAME.items():
        # NLTK punkt_tab lays out per-language directories at
        # ``tokenizers/punkt_tab/<name>/``. Probing the directory
        # alone is the right resource path; the old ``.pickle``
        # suffix was a misread of the punkt (legacy) layout and
        # resolved to nothing under the punkt_tab-only install.
        resource = f"tokenizers/punkt_tab/{nltk_name}"
        if _nltk_resource_installed(resource):
            installed.add(iso)
            continue
    return frozenset(installed)


def compute_health() -> NltkHealthDict:
    """Return the locked D-09 ``/health/nltk`` response shape.

    Fields (Pydantic v2 ``extra="forbid"``):
    - ``supported_languages`` (list[str]): the 19 ISO 639-1 codes NLTK ships
      as bundled ``punkt_tab`` data (the closed set).
    - ``fallback_languages`` (list[str]): ``SUPPORTED_LANGUAGES -
      installed_supported``, sorted alphabetically. The frontend banner
      informs the user that these need an install to be ML-tokenized.
    - ``suggest_command`` (str | None): the single install command that
      flips the missing packages to installed; ``None`` when everything
      is already baked.
    - ``install_size_mb_estimate`` (int | None): the install footprint
      estimate for the missing packages; ``None`` when everything is
      already baked.
    """
    needs_packages = [
        pkg_name
        for pkg_name in _INSTALL_SIZE_MB_ESTIMATE
        if not _nltk_resource_installed(f"tokenizers/{pkg_name}")
    ]
    installed_supported = _installed_supported_languages()
    if needs_packages:
        suggest_command = _SUGGEST_COMMAND_BASE + " ".join(needs_packages)
        install_size_mb_estimate: int | None = sum(
            _INSTALL_SIZE_MB_ESTIMATE[pkg_name] for pkg_name in needs_packages
        )
    else:
        suggest_command = None
        install_size_mb_estimate = None
    return {
        "supported_languages": sorted(SUPPORTED_LANGUAGES),
        "fallback_languages": sorted(SUPPORTED_LANGUAGES - installed_supported),
        "suggest_command": suggest_command,
        "install_size_mb_estimate": install_size_mb_estimate,
    }
