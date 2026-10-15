"""Brain dump -> task drafts (CP12). The model only extracts tasks; it never ranks them.

Drafts are returned for review and never saved here (the user approves them first).
The prompt itself lives in app/services/prompts.py.
"""

from datetime import date

from pydantic import BaseModel, Field, ValidationError

from app.schemas import Title
from app.services.llm import LLMClient, LLMInvalidOutput
from app.services.prompts import MAX_DRAFTS, Locale, parse_system_prompt, parse_user_message

# Strict-mode JSON schema: every key required, nulls allowed where a value may be unknown.
DRAFTS_SCHEMA = {
    "type": "object",
    "properties": {
        "drafts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "due_date": {"type": ["string", "null"]},
                    "estimated_minutes": {"type": ["integer", "null"]},
                    "estimate_is_guess": {"type": "boolean"},
                    "estimate_reason": {"type": ["string", "null"]},
                    "needs_confirmation": {"type": "boolean"},
                    "note": {"type": ["string", "null"]},
                },
                "required": [
                    "title",
                    "due_date",
                    "estimated_minutes",
                    "estimate_is_guess",
                    "estimate_reason",
                    "needs_confirmation",
                    "note",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["drafts"],
    "additionalProperties": False,
}


class Draft(BaseModel):
    title: Title
    due_date: date | None = None
    estimated_minutes: int | None = None
    # True when the AI worked the duration out itself; the reason is shown so it can be judged.
    estimate_is_guess: bool = False
    estimate_reason: str | None = Field(default=None, max_length=300)
    needs_confirmation: bool = False
    note: str | None = Field(default=None, max_length=300)


class _ModelOutput(BaseModel):
    drafts: list[Draft]


def build_messages(text: str, today: date, locale: Locale) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": parse_system_prompt(today, locale)},
        {"role": "user", "content": parse_user_message(text)},
    ]


def parse_brain_dump(llm: LLMClient, text: str, today: date, locale: Locale) -> list[Draft]:
    raw = llm.complete_json(
        messages=build_messages(text, today, locale),
        schema_name="task_drafts",
        schema=DRAFTS_SCHEMA,
    )
    try:
        drafts = _ModelOutput.model_validate(raw).drafts[:MAX_DRAFTS]
    except ValidationError as error:
        raise LLMInvalidOutput("The model output did not match the draft schema.") from error

    for draft in drafts:
        # Keep the estimate inside the task limits (5-720) instead of failing the whole result.
        if draft.estimated_minutes is not None:
            draft.estimated_minutes = min(max(draft.estimated_minutes, 5), 720)
        else:
            # Nothing to explain when there is no estimate.
            draft.estimate_is_guess = False
            draft.estimate_reason = None
        # A date in the past is almost always a misread ("Monday" resolved backwards).
        if draft.due_date is not None and draft.due_date < today:
            draft.needs_confirmation = True
    return drafts
