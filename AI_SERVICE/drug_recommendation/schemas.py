"""Pydantic schemas for the Drug & Disease Recommendation service.

Contract-first definitions strictly matching the API specification.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PatientInfo(BaseModel):
    """Patient metadata for clinical context and safety warnings."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "age": 28,
                "gender": "male",
                "allergies": ["penicillin"],
            }
        },
    )

    age: int | None = Field(default=None, ge=0, le=120, description="Patient age in years (0-120)")
    gender: str | None = Field(default=None, description="Patient gender (male, female, other)")
    allergies: list[str] = Field(
        default_factory=list, description="Known drug allergies or sensitivities"
    )

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = v.strip().lower()
        if not clean:
            return None
        if clean in ("male", "nam", "m"):
            return "male"
        if clean in ("female", "nu", "nữ", "f"):
            return "female"
        if clean in ("other", "khac", "khác", "o"):
            return "other"
        raise ValueError("Giới tính không hợp lệ. Chỉ chấp nhận: male (nam), female (nữ), other (khác).")

    @field_validator("allergies")
    @classmethod
    def validate_allergies(cls, v: list[str]) -> list[str]:
        cleaned: list[str] = []
        for a in v:
            s = str(a).strip()
            if s and s not in cleaned:
                cleaned.append(s[:100])
        return cleaned[:50]


class DiseasePredictionRequest(BaseModel):
    """Request payload for POST /internal/predict-disease."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "symptoms": "Bệnh nhân bị sốt nhẹ, đau họng, ho khan từ 2 ngày nay",
                "diagnosis": "",
                "patient": {
                    "age": 28,
                    "gender": "male",
                    "allergies": ["penicillin"],
                },
                "topK": 5,
            }
        },
    )

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
        default=5,
        ge=1,
        le=20,
        description="Number of disease candidates to return (default 5)",
    )

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) < 2:
            raise ValueError("Mô tả triệu chứng quá ngắn hoặc để trống (cần tối thiểu 2 ký tự).")
        has_alpha = any(c.isalpha() for c in trimmed)
        if not has_alpha:
            raise ValueError(
                "Mô tả triệu chứng không hợp lệ (phải chứa từ ngữ mô tả triệu chứng lâm sàng, không chỉ gồm số hoặc ký tự đặc biệt)."
            )
        return trimmed

    @field_validator("diagnosis")
    @classmethod
    def validate_diagnosis(cls, v: str | None) -> str:
        if v is None:
            return ""
        return v.strip()


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
    allSymptoms: list[str] = Field(
        default_factory=list,
        description="Toàn bộ các triệu chứng đặc trưng của bệnh lý này trong cơ sở tri thức y khoa",
    )
    diets: list[str] = Field(
        default_factory=list,
        description="Chế độ ăn uống dinh dưỡng gợi ý cho bệnh lý này",
    )
    precautions: list[str] = Field(
        default_factory=list,
        description="Các biện pháp phòng ngừa và tự chăm sóc",
    )
    workouts: list[str] = Field(
        default_factory=list,
        description="Chế độ vận động và thói quen sinh hoạt",
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
        description="Clinical usage indication description",
    )
    dosage: str = Field(
        default="",
        description="Liều dùng tham khảo theo phác đồ lâm sàng",
    )
    instruction: str = Field(
        default="",
        description="Hướng dẫn sử dụng và thời điểm dùng thuốc an toàn",
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


class LifestyleAdvice(BaseModel):
    """Clinical lifestyle, dietary, and precaution recommendations."""

    model_config = ConfigDict(extra="ignore")

    disease: str = Field(default="", description="Disease name")
    diets: list[str] = Field(default_factory=list, description="Recommended dietary guidance")
    precautions: list[str] = Field(default_factory=list, description="Preventive precautions")
    workouts: list[str] = Field(
        default_factory=list, description="Recommended exercise and physical activity"
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
    lifestyleAdvice: LifestyleAdvice | None = Field(
        default=None,
        description="Lời khuyên dinh dưỡng, phòng ngừa và sinh hoạt cho bệnh nghi ngờ cao nhất",
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


class DiseaseMedicineSearchItem(BaseModel):
    """Medicine details when queried for a specific disease."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    activeIngredient: str = Field(default="", description="Active pharmaceutical ingredient")
    group: str = Field(default="", description="Pharmacological drug group")
    usage: str = Field(default="", description="Clinical indication and usage")
    dosage: str = Field(default="", description="Standard clinical dosage")
    instruction: str = Field(default="", description="Safe administration instructions")
    prescriptionRequired: bool = Field(
        default=True, description="True for Rx (prescription required), False for OTC"
    )
    contraindications: list[str] = Field(
        default_factory=list, description="Contraindicated substances or allergies"
    )
    line: int = Field(default=1, description="Treatment line (1: First-line, 2: Second-line)")
    weight: float = Field(default=0.5, description="Evidence weight of recommendation")
    note: str = Field(default="", description="Clinical recommendation notes")


class DiseaseDetailSearchItem(BaseModel):
    """Disease metadata returned in disease medicine search."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_en: str = Field(default="", description="English disease name")
    specialty: str = Field(default="", description="Clinical specialty")
    description: str = Field(default="", description="Clinical overview")
    symptoms: list[str] = Field(default_factory=list, description="Characteristic symptoms")
    diets: list[str] = Field(default_factory=list, description="Dietary recommendations")
    precautions: list[str] = Field(default_factory=list, description="Preventive precautions")
    workouts: list[str] = Field(default_factory=list, description="Lifestyle and physical activities")


class DiseaseMedicineSearchData(BaseModel):
    """Payload returned for disease medicine search."""

    model_config = ConfigDict(extra="ignore")

    found: bool = False
    query: str = ""
    message: str | None = None
    disease: DiseaseDetailSearchItem | None = None
    totalMedicines: int = 0
    medicines: list[DiseaseMedicineSearchItem] = Field(default_factory=list)
    suggestedDiseases: list[dict[str, Any]] = Field(default_factory=list)


class DiseaseMedicineSearchResponse(BaseModel):
    """Response model for GET /internal/medicines-by-disease."""

    model_config = ConfigDict(extra="ignore")

    success: bool = True
    data: DiseaseMedicineSearchData


class MedicineDiseaseIndicationItem(BaseModel):
    """Disease indicated for a medicine."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    name_en: str = Field(default="", description="English disease name")
    specialty: str = Field(default="", description="Clinical specialty")
    description: str = Field(default="", description="Disease clinical overview")
    line: int = Field(default=1, description="Treatment line (1: First-line, 2: Second-line)")
    weight: float = Field(default=0.5, description="Evidence weight of recommendation")
    note: str = Field(default="", description="Recommendation note")


class MedicineDetailSearchItem(BaseModel):
    """Comprehensive medicine metadata returned in reverse search."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    activeIngredient: str = Field(default="", description="Active pharmaceutical ingredient")
    group: str = Field(default="", description="Pharmacological drug group")
    usage: str = Field(default="", description="Clinical indication and mechanism")
    dosage: str = Field(default="", description="Standard clinical dosage")
    instruction: str = Field(default="", description="Safe administration instructions")
    prescriptionRequired: bool = Field(
        default=True, description="True for Rx, False for OTC"
    )
    contraindications: list[str] = Field(
        default_factory=list, description="Contraindicated substances or allergies"
    )


class MedicineSearchData(BaseModel):
    """Payload returned for reverse medicine search (finding diseases indicated for medicine)."""

    model_config = ConfigDict(extra="ignore")

    found: bool = False
    query: str = ""
    message: str | None = None
    medicine: MedicineDetailSearchItem | None = None
    totalDiseases: int = 0
    indicatedDiseases: list[MedicineDiseaseIndicationItem] = Field(default_factory=list)
    suggestedMedicines: list[dict[str, Any]] = Field(default_factory=list)


class MedicineSearchResponse(BaseModel):
    """Response model for GET /internal/diseases-by-medicine."""

    model_config = ConfigDict(extra="ignore")

    success: bool = True
    data: MedicineSearchData


class DDICheckRequest(BaseModel):
    """Request payload for Drug-Drug Interaction check."""

    model_config = ConfigDict(extra="ignore")

    drugs: list[str] = Field(
        ...,
        min_length=2,
        max_length=20,
        description="List of at least 2 medicine names or IDs to check for clinical interactions",
    )

    @field_validator("drugs")
    @classmethod
    def validate_drugs(cls, v: list[str]) -> list[str]:
        cleaned = [d.strip() for d in v if d and d.strip()]
        if len(cleaned) < 2:
            raise ValueError("Cần tối thiểu 2 tên thuốc để kiểm tra tương tác.")
        return cleaned


class DDIInteractionItem(BaseModel):
    """Single detected drug-drug interaction item."""

    model_config = ConfigDict(extra="ignore")

    id: str
    drug1: str
    drug2: str
    matchedRuleDrug1: str = ""
    matchedRuleDrug2: str = ""
    severity: str = Field(..., description="contraindicated | major | moderate | minor")
    severityLabel: str = Field(default="", description="Vietnamese localized severity title")
    mechanism: str = Field(default="", description="Pharmacological mechanism")
    clinicalEffect: str = Field(default="", description="Clinical consequences and risks")
    recommendation: str = Field(default="", description="Clinical management guidance")


class DDISeveritySummary(BaseModel):
    """Counts of interactions grouped by clinical severity."""

    model_config = ConfigDict(extra="ignore")

    contraindicated: int = 0
    major: int = 0
    moderate: int = 0
    minor: int = 0
    total: int = 0


class DDICheckData(BaseModel):
    """Payload returned by DDI check."""

    model_config = ConfigDict(extra="ignore")

    drugsAnalyzed: list[str] = Field(default_factory=list)
    totalInteractions: int = 0
    hasCriticalConflict: bool = False
    severitySummary: DDISeveritySummary = Field(default_factory=DDISeveritySummary)
    interactions: list[DDIInteractionItem] = Field(default_factory=list)
    message: str = ""
    disclaimer: str = ""


class DDICheckResponse(BaseModel):
    """Response wrapper for DDI checking API."""

    model_config = ConfigDict(extra="ignore")

    success: bool = True
    data: DDICheckData

