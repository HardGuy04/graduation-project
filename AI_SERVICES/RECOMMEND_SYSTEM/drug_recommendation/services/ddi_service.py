"""Drug-Drug Interaction (DDI) analysis service.

Evaluates pharmacological conflicts, severity ratings, clinical mechanisms,
and evidence-based safe alternative guidance.
"""

import logging

from drug_recommendation.knowledge.ddi_checker import DDIChecker
from drug_recommendation.schemas import (
    DDICheckData,
    DDIInteractionItem,
    DDISeveritySummary,
)

logger = logging.getLogger("ai_service.ddi_service")


class DDIService:
    """Service responsible for pairwise combinatorial analysis of drug-drug interactions."""

    def __init__(self, ddi_checker: DDIChecker) -> None:
        self.ddi_checker = ddi_checker

    def check_drug_interactions(self, drugs: list[str]) -> DDICheckData:
        """Evaluate a list of drugs for potential pharmacological drug-drug interactions."""
        res = self.ddi_checker.check_interactions(drugs)
        summary = DDISeveritySummary(**res["severitySummary"])
        items = [DDIInteractionItem(**item) for item in res["interactions"]]
        return DDICheckData(
            drugsAnalyzed=res["drugsAnalyzed"],
            totalInteractions=res["totalInteractions"],
            hasCriticalConflict=res["hasCriticalConflict"],
            severitySummary=summary,
            interactions=items,
            message=res["message"],
            disclaimer=res["disclaimer"],
        )
