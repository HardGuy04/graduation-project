"""Pydantic schemas for the Drug & Disease Recommendation service.

Contract-first definitions strictly matching the API specification.
"""

from pydantic import BaseModel, ConfigDict, Field


class PatientInfo(BaseModel):
    """Patient metadata for clinical context and safety warnings."""

    model_config = ConfigDict(extra="ignore")

    age: int | None = Field(default=None, ge=0, le=150, description="Patient age in years")
    gender: str | None = Field(default=None, description="Patient gender (male, female, other)")
    allergies: list[str] = Field(
        default_factory=list, description="Known drug allergies or sensitivities"
    )


class DiseasePredictionRequest(BaseModel):
    """Request payload for POST /internal/predict-disease."""

    model_config = ConfigDict(extra="ignore")

    symptoms: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Free-form Vietnamese symptom description (1-1000 chars)",
        examples=["Đau họng, sốt nhẹ, ho khan"],
    )
    diagnosis: str | None = Field(
        default="",
        max_length=500,
        description="Optional provisional diagnosis from the examining doctor",
    )
    patient: PatientInfo | None = Field(
        default=None, description="Optional patient details for allergy checking"
    )
    topK: int | None = Field(
        default=3,
        ge=1,
        le=20,
        description="Number of disease candidates to return (default 3)",
    )


class DiseaseItem(BaseModel):
    """Suggested disease candidate."""

    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., description="Disease name in Vietnamese")
    probability: int = Field(
        ...,
        ge=0,
        le=100,
        description="Model relevance score (0-100), not true clinical probability",
    )
    description: str = Field(default="", description="Clinical description of the disease")
    specialty: str = Field(..., description="Assigned clinical specialty among the 6 faculties")
    matchedSymptoms: list[str] = Field(
        default_factory=list,
        description="User-input symptoms matching this candidate disease",
    )


class MedicineItem(BaseModel):
    """Recommended medicine for the suggested diseases."""

    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., description="Medicine commercial/generic name")
    probability: int = Field(
        ...,
        ge=0,
        le=100,
        description="Composite relevance score based on disease weights",
    )
    usage: str = Field(
        ...,
        description="Clinical usage indication description (never specific dosages)",
    )
    forDiseases: list[str] = Field(
        default_factory=list,
        description="List of suggested diseases this medicine treats",
    )
    prescriptionRequired: bool = Field(
        default=True,
        description="Whether this medicine requires a formal prescription",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Safety warnings (e.g., patient allergy conflicts)",
    )


class DiseasePredictionData(BaseModel):
    """Data payload in successful prediction response."""

    model_config = ConfigDict(extra="ignore")

    diseases: list[DiseaseItem] = Field(
        default_factory=list,
        description="Ranked list of suspect diseases (sorted descending by probability)",
    )
    medicines: list[MedicineItem] = Field(
        default_factory=list,
        description="Ranked list of recommended medicines (sorted descending by score)",
    )
    recognizedSymptoms: list[str] = Field(
        default_factory=list,
        description="List of symptom names extracted from input",
    )
    unrecognizedTerms: list[str] = Field(
        default_factory=list,
        description="Input phrases/tokens that could not be mapped to known symptoms",
    )
    redFlags: list[str] = Field(
        default_factory=list,
        description="Emergency clinical red flags detected in input",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Operational or clinical caveats (e.g. low confidence)",
    )
    disclaimer: str = Field(
        default="Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.",
        description="Mandatory legal and clinical disclaimer",
    )
    modelVersion: str = Field(..., description="Version identifier of loaded model artifact")


class DiseasePredictionResponse(BaseModel):
    """Standard success response format."""

    model_config = ConfigDict(extra="ignore")

    success: bool = True
    data: DiseasePredictionData


class ErrorResponse(BaseModel):
    """Standard error response format matching system contract."""

    model_config = ConfigDict(extra="ignore")

    success: bool = False
    message: str = Field(..., description="Human-readable error description")
    error: str = Field(..., description="Machine-readable error type identifier")


class HealthResponse(BaseModel):
    """Health check response format."""

    model_config = ConfigDict(extra="ignore")

    status: str = "ok"
    model_loaded: bool = False
    model_version: str | None = None
