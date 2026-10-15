"""Duration estimate for one task. The model reasons about what the task really involves.

It only suggests a number and a reason. The person decides whether to use it, and priorities
are never affected by the model (they come from app/services/priority.py).
"""

from pydantic import BaseModel, Field, ValidationError

from app.services.llm import LLMClient, LLMInvalidOutput
from app.services.prompts import Locale, estimate_system_prompt, estimate_user_message

ESTIMATE_SCHEMA = {
    "type": "object",
    "properties": {
        "estimated_minutes": {"type": "integer"},
        "estimate_reason": {"type": "string"},
    },
    "required": ["estimated_minutes", "estimate_reason"],
    "additionalProperties": False,
}


class Estimate(BaseModel):
    estimated_minutes: int
    estimate_reason: str = Field(min_length=1, max_length=300)


def estimate_task(llm: LLMClient, title: str, description: str | None, locale: Locale) -> Estimate:
    raw = llm.complete_json(
        messages=[
            {"role": "system", "content": estimate_system_prompt(locale)},
            {"role": "user", "content": estimate_user_message(title, description)},
        ],
        schema_name="task_estimate",
        schema=ESTIMATE_SCHEMA,
    )
    try:
        estimate = Estimate.model_validate(raw)
    except ValidationError as error:
        raise LLMInvalidOutput("The model output did not match the estimate schema.") from error

    # Stay inside the task limits (5-720) and on the 5-minute grid, instead of failing.
    minutes = min(max(estimate.estimated_minutes, 5), 720)
    estimate.estimated_minutes = round(minutes / 5) * 5
    return estimate
