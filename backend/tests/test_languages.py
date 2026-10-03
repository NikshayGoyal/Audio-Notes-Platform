from app.languages import (
    LANGUAGE_BY_CODE,
    SUPPORTED_LANGUAGES,
    language_name,
    normalize_language_name,
)


def test_language_catalog_has_unique_bcp47_codes() -> None:
    codes = [language.code for language in SUPPORTED_LANGUAGES]
    assert len(codes) == len(set(codes))
    assert all("-IN" in code for code in codes)
    assert LANGUAGE_BY_CODE["hi-IN"].name == "Hindi"
    assert language_name("en-IN") == "English (India)"


def test_provider_language_names_normalize_to_gnani_codes() -> None:
    assert normalize_language_name("English (United States)") == "en-IN"
    assert normalize_language_name("Bangla") == "bn-IN"
    assert normalize_language_name("Spanish") is None
