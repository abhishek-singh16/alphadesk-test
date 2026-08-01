# backend/app/eval.py

import re

import json
from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field


# -------------------------------------------------------------------------
# LLM Judge
# -------------------------------------------------------------------------

judge = ChatOpenAI(model="gpt-4.1-mini", temperature=0)


class JudgeResult(BaseModel):
    groundedness: float = Field(
        description="0-1 score indicating how well the answer is supported by the evidence."
    )

    correctness: float = Field(
        description="0-1 score indicating factual correctness."
    )

    hallucination: float = Field(
        description="0-1 score where 0 means no hallucination."
    )

    confidence: float = Field(
        description="Judge confidence from 0-1."
    )

    explanation: str = Field(
        description="Short explanation."
    )


# -------------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------------

def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _split_sentences(text: str) -> list[str]:
    if not text:
        return []

    parts = re.split(r"(?<=[.!?])\s+", text.strip())

    return [p.strip() for p in parts if p.strip()]


# -------------------------------------------------------------------------
# Retrieval Evaluation
# -------------------------------------------------------------------------

def evaluate_search_recall(
    retrieved: list[dict[str, Any]],
    relevant: list[dict[str, Any]],
    k: int = 5,
) -> dict[str, Any]:
    """
    Recall@K using source/page identity.
    """

    top_k = retrieved[:k]

    hits = 0

    for item in top_k:
        for gold in relevant:
            if (
                item.get("source") == gold.get("source")
                and item.get("page") == gold.get("page")
            ):
                hits += 1
                break

    relevant_total = len(relevant)

    return {
        "hits": hits,
        "relevant_total": relevant_total,
        "recall_at_k": round(
            hits / relevant_total,
            3,
        )
        if relevant_total
        else 0.0,
        "k": k,
    }


# -------------------------------------------------------------------------
# LLM-as-a-Judge
# -------------------------------------------------------------------------

def evaluate_answer_with_llm(
    *,
    question: str,
    answer: str,
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Evaluate answer quality using an LLM Judge.

    Works for BOTH:

    • RAG evidence
    • Tool outputs
    """

    if not answer.strip():
        return {
            "groundedness": 0.0,
            "correctness": 0.0,
            "hallucination": 1.0,
            "confidence": 1.0,
            "explanation": "No answer generated.",
        }

    if evidence:
        import json
        evidence_text = "\n\n".join(
            f"[{i+1}] {json.dumps(item, indent=2)}"
            for i, item in enumerate(evidence)
        )
    else:
        evidence_text = "NO EVIDENCE PROVIDED"

    prompt = f"""
You are an expert evaluator for Retrieval-Augmented Generation (RAG) systems.

Your task is to judge whether the answer is supported by the supplied evidence.

Question:
{question}

Evidence:
{evidence_text}

Answer:
{answer}

Evaluate the answer.

Return scores between 0 and 1.

Definitions:

Groundedness:
How well every factual claim is supported by the evidence.

Correctness:
Whether the answer correctly answers the question.

Hallucination:
0 means no hallucination.
1 means the answer is entirely hallucinated.

Confidence:
How confident you are in your evaluation.

Return ONLY structured JSON.
"""

    result = judge.with_structured_output(JudgeResult).invoke(prompt)

    return result.model_dump()


# -------------------------------------------------------------------------
# Pretty Printer (optional)
# -------------------------------------------------------------------------

def format_evaluation(result: dict[str, Any]) -> str:
    """
    Nicely formats evaluation for logging/debugging.
    """

    return (
        f"Groundedness : {result['groundedness']:.2f}\n"
        f"Correctness  : {result['correctness']:.2f}\n"
        f"Hallucination: {result['hallucination']:.2f}\n"
        f"Confidence   : {result['confidence']:.2f}\n"
        f"Reason       : {result['explanation']}"
    )