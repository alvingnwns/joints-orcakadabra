import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, StringConstraints
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_workspace
from app.models import Task, Workspace
from app.services.chat import answer_question, schedule_context, task_context
from app.services.llm import LLMClient, LLMInvalidOutput, LLMUnavailable, get_llm

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatQuery(BaseModel):
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
    today: date  # the user's local date (Q1)
    locale: Literal["en", "id"] = "en"
    task_id: uuid.UUID | None = None  # set by "Why is this here?" (CP15)


class ChatAnswer(BaseModel):
    answer: str


@router.post(
    "/query",
    response_model=ChatAnswer,
    responses={404: {"description": "Task not found"}, 502: {"description": "ai_unavailable"}},
)
def chat_query(
    body: ChatQuery,
    db: Annotated[Session, Depends(get_db)],
    workspace: Annotated[Workspace, Depends(get_workspace)],
    llm: Annotated[LLMClient, Depends(get_llm)],
) -> ChatAnswer:
    """Answers a question about the user's own schedule. Nothing is stored."""
    tasks = list(db.scalars(select(Task).where(Task.workspace_id == workspace.id)))

    if body.task_id is None:
        context = schedule_context(tasks, body.today, workspace.daily_capacity_minutes)
    else:
        task = next((task for task in tasks if task.id == body.task_id), None)
        if task is None:  # another workspace's task looks like it does not exist
            raise HTTPException(status_code=404, detail="Task not found")
        context = task_context(task, tasks, body.today)

    try:
        answer = answer_question(llm, body.question, context, body.today, body.locale)
    except LLMUnavailable as error:
        raise HTTPException(status_code=502, detail="ai_unavailable") from error
    except LLMInvalidOutput as error:
        raise HTTPException(status_code=502, detail="ai_invalid_output") from error
    return ChatAnswer(answer=answer)
