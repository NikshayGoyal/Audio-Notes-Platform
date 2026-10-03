from dataclasses import dataclass


@dataclass(frozen=True)
class Language:
    code: str
    name: str


SUPPORTED_LANGUAGES = (
    Language("en-IN", "English (India)"),
    Language("hi-IN", "Hindi"),
    Language("kn-IN", "Kannada"),
    Language("ta-IN", "Tamil"),
    Language("te-IN", "Telugu"),
    Language("bn-IN", "Bengali"),
    Language("mr-IN", "Marathi"),
    Language("gu-IN", "Gujarati"),
    Language("ml-IN", "Malayalam"),
    Language("pa-IN", "Punjabi"),
    Language("or-IN", "Odia"),
)
LANGUAGE_BY_CODE = {language.code: language for language in SUPPORTED_LANGUAGES}
LANGUAGE_ALIASES = {
    "english": "en-IN",
    "hindi": "hi-IN",
    "kannada": "kn-IN",
    "tamil": "ta-IN",
    "telugu": "te-IN",
    "bengali": "bn-IN",
    "bangla": "bn-IN",
    "marathi": "mr-IN",
    "gujarati": "gu-IN",
    "malayalam": "ml-IN",
    "punjabi": "pa-IN",
    "panjabi": "pa-IN",
    "odia": "or-IN",
    "oriya": "or-IN",
}
AUTO_LANGUAGE = "auto"
SAME_LANGUAGE = "same"


def language_name(code: str) -> str:
    return LANGUAGE_BY_CODE[code].name


def normalize_language_name(name: str) -> str | None:
    normalized = name.casefold()
    return next(
        (code for alias, code in LANGUAGE_ALIASES.items() if alias in normalized),
        None,
    )
