class ProcessingError(RuntimeError):
    def __init__(self, code: str, user_message: str, *, retryable: bool) -> None:
        super().__init__(user_message)
        self.code = code
        self.user_message = user_message
        self.retryable = retryable


class NoSpeechDetectedError(ProcessingError):
    def __init__(self) -> None:
        super().__init__(
            "no_speech_detected",
            "We could not detect enough intelligible speech. Choose the language manually or upload clearer audio.",
            retryable=False,
        )


class UnsupportedLanguageError(ProcessingError):
    def __init__(self, language: str) -> None:
        super().__init__(
            "unsupported_language",
            f"The detected language ({language}) is not supported by the configured Gnani transcription workflow. Choose a supported language and retry.",
            retryable=False,
        )
