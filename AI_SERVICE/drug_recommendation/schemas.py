"""Pydantic schemas for the Drug & Disease Recommendation service.

Contract-first definitions strictly matching the API specification.
"""

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
