"""Thin OpenRouter client (OpenAI-compatible chat completions) over httpx. No vendor SDK (A3).

Never logs the API key or the user's text: only error kinds and status codes.
"""

import json
import logging
from typing import Any

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base error. The API maps every subclass to a calm, friendly response."""


class LLMUnavailable(LLMError):
    """No key, timeout, network failure, or an error status from the provider."""


class LLMInvalidOutput(LLMError):
    """The model answered, but not with the JSON we asked for."""


class LLMClient:
    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None):
        self._settings = settings
        self._transport = transport  # tests inject httpx.MockTransport

    def complete_json(
        self, *, messages: list[dict[str, str]], schema_name: str, schema: dict[str, Any]
    ) -> Any:
        """Asks the parsing model for JSON that follows `schema` and returns it parsed."""
        body = {
            "model": self._settings.llm_model,
            "messages": messages,
            "temperature": 0,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": schema_name, "strict": True, "schema": schema},
            },
            # Only route to providers that honour response_format, so the schema is enforced.
            "provider": {"require_parameters": True},
            # Parsing a list doesn't need thinking; it only adds latency and tokens.
            "reasoning": {"enabled": False},
        }
        content = self._post(body)
        try:
            return json.loads(content)
        except json.JSONDecodeError as error:
            raise LLMInvalidOutput("The model did not return valid JSON.") from error

    def _post(self, body: dict[str, Any]) -> str:
        if not self._settings.llm_api_key:
            raise LLMUnavailable("LLM_API_KEY is not set.")

        with httpx.Client(
            base_url=self._settings.llm_base_url,
            timeout=self._settings.llm_timeout_seconds,
            transport=self._transport,
            headers={"Authorization": f"Bearer {self._settings.llm_api_key}"},
        ) as client:
            response = self._send_with_one_retry(client, body)

        if response.status_code != 200:
            logger.warning("LLM request failed with status %s", response.status_code)
            raise LLMUnavailable(f"The provider answered with status {response.status_code}.")
        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as error:
            raise LLMInvalidOutput("Unexpected response shape from the provider.") from error
        if not isinstance(content, str) or not content.strip():
            raise LLMInvalidOutput("The model returned no content.")
        return content

    @staticmethod
    def _send_with_one_retry(client: httpx.Client, body: dict[str, Any]) -> httpx.Response:
        try:
            return client.post("/chat/completions", json=body)
        except httpx.TransportError as first:  # includes timeouts
            logger.warning("LLM request failed (%s), retrying once", type(first).__name__)
        try:
            return client.post("/chat/completions", json=body)
        except httpx.TransportError as error:
            logger.warning("LLM retry failed (%s)", type(error).__name__)
            raise LLMUnavailable("Could not reach the AI provider.") from error


def get_llm() -> LLMClient:
    """FastAPI dependency; tests override it with a fake."""
    return LLMClient(get_settings())
