"""
Rule-based enrollment assistant + optional OpenAI augmentation.
"""
import re
from typing import Optional

from app.config import get_settings

settings = get_settings()


def rule_based_reply(message: str) -> str:
    m = message.lower().strip()
    if re.search(r"phase|step|process|flow", m):
        return (
            "Enrollment has three phases: (1) Complete and submit your enrollment form. "
            "(2) New students are reviewed by the Registrar; returning students (2nd–4th year) "
            "must upload payment for Accounting verification. (3) Student Affairs validates your ID. "
            "You cannot advance until each phase is approved."
        )
    if re.search(r"deadline|cut|late|when", m):
        return (
            "Deadlines are set by the institution per phase. If the cut-off has passed for a phase, "
            "the system will block submission — check the Announcements panel for official dates."
        )
    if re.search(r"payment|receipt|accounting", m):
        return (
            "Returning students should upload a clear scan or photo of the official payment receipt "
            "in the Payment section. Accounting will verify and update your enrollment status."
        )
    if re.search(r"registrar|new student", m):
        return (
            "New students are routed to the Registrar after submitting the enrollment form. "
            "Wait for Registrar approval before Student Affairs validation."
        )
    if re.search(r"id|sao|student affairs", m):
        return (
            "Student Affairs Office (SAO) validates your school ID and related documents in Phase 3, "
            "after prior phases are approved."
        )
    if re.search(r"hello|hi|hey", m):
        return "Hello! I am the SEAIT Enrollment Assistant. Ask me about phases, payments, or deadlines."
    return (
        "I can help with enrollment phases, payment uploads, deadlines, and office routing. "
        "Try asking: “What are the enrollment steps?” or “How does payment verification work?”"
    )


async def maybe_openai_reply(message: str) -> Optional[str]:
    if not settings.openai_api_key:
        return None
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise, helpful assistant for a Philippine college enrollment system. "
                        "Answer in plain English, max 120 words."
                    ),
                },
                {"role": "user", "content": message},
            ],
        )
        return r.choices[0].message.content
    except Exception:
        return None


async def get_reply(message: str) -> str:
    ai = await maybe_openai_reply(message)
    if ai:
        return ai
    return rule_based_reply(message)
