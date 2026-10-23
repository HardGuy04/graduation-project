const selectedAllergies = new Set();
    let currentPrediction = null;
    let selectedDiseaseIndex = 0;
    let currentMedFilter = 'disease';

    const PRESETS = {
      1: {
        symptoms: "Bệnh nhân sốt cao liên tục, đau đầu dữ dội, đau nhức khớp, nhưng không nôn mửa",
        age: 28,
        gender: "Nam",
        allergies: ["penicillin"]
      },
      2: {
        symptoms: "Bệnh nhân đau thắt ngực dữ dội lan ra cánh tay trái, khó thở hụt hơi, vã mồ hôi lạnh",
        age: 58,
        gender: "Nam",
        allergies: []
      },
      3: {
        symptoms: "Bệnh nhân hắt hơi liên tục, ớn lạnh, ho, nghẹt mũi và đau mỏi người",
        age: 22,
        gender: "Nữ",
        allergies: []
      },
      4: {
        symptoms: "Đau nửa đầu dữ dội từng cơn đập theo mạch, sợ ánh sáng và tiếng ồn, buồn nôn",
        age: 34,
        gender: "Nữ",
        allergies: ["aspirin"]
      },
      5: {
        symptoms: "Đau rát bỏng vùng thượng vị sau ăn, ợ chua, buồn nôn, đầy bụng khó tiêu",
        age: 42,
        gender: "Nam",
        allergies: []
      },
      6: {
        symptoms: "Đau nhức các khớp ngón tay và khớp gối, sưng khớp, cứng khớp vào buổi sáng",
        age: 50,
        gender: "Nữ",
        allergies: []
      }
    };

    function applyPreset(id) {
      const p = PRESETS[id];
      if (!p) return;
      document.getElementById('symptomsInput').value = p.symptoms;
      document.getElementById('patientAge').value = p.age;
      document.getElementById('patientGender').value = p.gender;
      
      // Clear & set allergies
      selectedAllergies.clear();
      document.querySelectorAll('.allergy-chip').forEach(el => el.classList.remove('selected'));
      p.allergies.forEach(allergy => {
        document.querySelectorAll('.allergy-chip').forEach(el => {
          if (el.textContent.trim().toLowerCase() === allergy.toLowerCase()) {
            el.classList.add('selected');
            selectedAllergies.add(allergy);
          }
        });
      });

      // Auto trigger analysis
      handleAnalyze();
    }

    function toggleAllergy(el, allergyName) {
      if (selectedAllergies.has(allergyName)) {
        selectedAllergies.delete(allergyName);
        el.classList.remove('selected');
      } else {
        selectedAllergies.add(allergyName);
        el.classList.add('selected');
      }
    }

    async function handleAnalyze(e) {
      if (e && e.preventDefault) e.preventDefault();
      
      const symptoms = document.getElementById('symptomsInput').value.trim();
      if (!symptoms) return;

      const age = parseInt(document.getElementById('patientAge').value, 10) || 30;
      const gender = document.getElementById('patientGender').value;
      const internalKey = document.getElementById('internalKey').value.trim();

      // UI Loading state
      const submitBtn = document.getElementById('submitBtn');
      const btnIcon = document.getElementById('btnIcon');
      const btnText = document.getElementById('btnText');
      const btnSpinner = document.getElementById('btnSpinner');

      submitBtn.disabled = true;
      btnIcon.style.display = 'none';
      btnText.textContent = 'Đang phân tích lâm sàng...';
      btnSpinner.style.display = 'inline-block';

      try {
        const payload = {
          symptoms: symptoms,
          patientInfo: {
            age: age,
            gender: gender,
            allergies: Array.from(selectedAllergies)
          }
        };

        const res = await fetch('/internal/predict-disease', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': internalKey
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Lỗi hệ thống (${res.status})`);
        }

        const data = await res.json();
        if (data.success && data.data) {
          renderResults(data.data);
        } else {
          throw new Error(data.message || 'Không nhận được dữ liệu phản hồi.');
        }

      } catch (err) {
        alert('Lỗi: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        btnIcon.style.display = 'inline-block';
        btnText.textContent = 'Phân Tích & Khuyến Nghị Lâm Sàng';
        btnSpinner.style.display = 'none';
      }
    }

    function renderResults(res) {
      currentPrediction = res;
      selectedDiseaseIndex = 0;
      currentMedFilter = 'disease';

      document.getElementById('emptyStateCard').style.display = 'none';
      const resultsContent = document.getElementById('resultsContent');
      resultsContent.style.display = 'flex';

      // 1. Red Flags
      const redFlagBox = document.getElementById('redFlagBox');
      const redFlagList = document.getElementById('redFlagList');
      if (res.redFlags && res.redFlags.length > 0) {
        redFlagBox.style.display = 'flex';
        redFlagList.innerHTML = res.redFlags.map(rf => `<div class="red-flag-item">• ${escapeHtml(rf)}</div>`).join('');
      } else {
        redFlagBox.style.display = 'none';
      }

      // 2. Recognized Symptoms
      const recognizedBox = document.getElementById('recognizedSymptomsBox');
      const warningsBox = document.getElementById('warningsBox');
      let symHtml = '';
      if (res.recognizedSymptoms && res.recognizedSymptoms.length > 0) {
        symHtml += res.recognizedSymptoms.map(s => `<span class="symptom-tag recognized">✓ ${escapeHtml(s)}</span>`).join('');
      } else {
        symHtml = '<span style="font-size: 0.85rem; color: var(--slate-500);">Chưa nhận diện rõ triệu chứng y khoa.</span>';
      }
      recognizedBox.innerHTML = symHtml;

      // Negated / Warnings
      if (res.warnings && res.warnings.length > 0) {
        warningsBox.innerHTML = res.warnings.map(w => `<span class="symptom-tag negated">✗ ${escapeHtml(w)}</span>`).join('');
      } else {
        warningsBox.innerHTML = '';
      }

      // 3. Render Diseases list & auto-select Top 1
      renderDiseasesList();

      if (res.diseases && res.diseases.length > 0) {
        selectDisease(0);
      } else {
        document.getElementById('diseaseDetailCard').style.display = 'none';
        document.getElementById('medicinesList').innerHTML = '<p style="color: var(--slate-500); font-size: 0.85rem;">Không có bệnh nào đạt ngưỡng xác suất.</p>';
      }

      // 4. Disclaimer
      if (res.disclaimer) {
        document.getElementById('disclaimerText').textContent = res.disclaimer + ' • Phiên bản mô hình: ' + (res.modelVersion || '2026.10.0');
      }

      // Scroll to results on mobile
      if (window.innerWidth < 1024) {
        resultsContent.scrollIntoView({ behavior: 'smooth' });
      }
    }

    function renderDiseasesList() {
      const diseasesList = document.getElementById('diseasesList');
      if (!currentPrediction || !currentPrediction.diseases || currentPrediction.diseases.length === 0) {
        diseasesList.innerHTML = '<p style="color: var(--slate-500); font-size: 0.85rem;">Không có bệnh nào đạt ngưỡng xác suất.</p>';
        return;
      }

      diseasesList.innerHTML = currentPrediction.diseases.map((d, idx) => {
        const isSelected = idx === selectedDiseaseIndex;
        const prob = d.probability || 0;
        let barColor = '#0d9488';
        if (prob >= 70) barColor = '#16a34a';
        else if (prob >= 40) barColor = '#0284c7';
        else barColor = '#d97706';

        const actionBadge = isSelected
          ? '<span class="disease-badge-action active">✨ Đang xem chi tiết bệnh này</span>'
          : '<span class="disease-badge-action">👉 Nhấn để xem chi tiết bệnh này</span>';

        return `
          <div class="disease-item ${isSelected ? 'selected' : ''}" onclick="selectDisease(${idx}, true)">
            <div class="disease-header">
              <span class="disease-name">
                <span>${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : '🩺')}</span>
                ${escapeHtml(d.name)}
              </span>
              <span class="disease-specialty">${escapeHtml(d.specialty || 'Nội khoa')}</span>
            </div>
            <div class="disease-desc">${escapeHtml(d.description || '')}</div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${prob}%; background: ${barColor};"></div>
            </div>
            <div class="disease-footer">
              <span class="prob-text">Khả năng phù hợp: <strong>${prob}%</strong></span>
              ${actionBadge}
            </div>
          </div>
        `;
      }).join('');
    }

    function selectDisease(index, shouldScroll = false) {
      if (!currentPrediction || !currentPrediction.diseases || !currentPrediction.diseases[index]) {
        return;
      }
      selectedDiseaseIndex = index;
      renderDiseasesList();

      const d = currentPrediction.diseases[index];
      const detailCard = document.getElementById('diseaseDetailCard');
      detailCard.style.display = 'block';

      // 1. Header info
      document.getElementById('detailDiseaseTitle').textContent = d.name;
      document.getElementById('detailDiseaseSpecialty').textContent = d.specialty || 'Nội khoa';
      document.getElementById('detailDiseaseProb').textContent = `Độ tin cậy: ${d.probability}%`;
      document.getElementById('detailDiseaseDesc').textContent = d.description || 'Chưa có thông tin mô tả chi tiết.';

      // 2. All symptoms vs matched symptoms
      const matchedList = d.matchedSymptoms || [];
      const matchedSet = new Set(matchedList.map(s => s.trim().toLowerCase()));

      let allSyms = d.allSymptoms || [];
      if (!allSyms || allSyms.length === 0) {
        allSyms = matchedList;
      }

      const totalAllCount = allSyms.length;
      const matchedCount = matchedList.length;
      document.getElementById('diseaseSymptomRatio').innerHTML = `Khớp <strong>${matchedCount} / ${totalAllCount}</strong> triệu chứng đặc trưng`;

      // Split into matched vs other characteristic symptoms
      const otherSyms = allSyms.filter(s => !matchedSet.has(s.trim().toLowerCase()));

      let symptomsHtml = '';
      if (matchedList.length > 0) {
        symptomsHtml += matchedList.map(s => `
          <span class="symptom-tag matched" title="Bệnh nhân đang biểu hiện triệu chứng này">
            ✓ ${escapeHtml(s)} <small style="font-weight: 500; opacity: 0.85;">(Đang gặp)</small>
          </span>
        `).join('');
      }

      if (otherSyms.length > 0) {
        symptomsHtml += otherSyms.map(s => `
          <span class="symptom-tag characteristic" title="Triệu chứng đặc trưng khác của bệnh lý này">
            • ${escapeHtml(s)}
          </span>
        `).join('');
      }

      if (!symptomsHtml) {
        symptomsHtml = '<span style="font-size: 0.85rem; color: var(--slate-500);">Chưa có dữ liệu triệu chứng đặc trưng trong danh mục.</span>';
      }
      document.getElementById('diseaseAllSymptomsBox').innerHTML = symptomsHtml;

      // 3. Render Medicines for selected disease
      renderMedicinesForSelectedDisease();

      // 4. Render Lifestyle for selected disease
      renderLifestyleForSelectedDisease(d);

      // 5. Smoothly scroll into view if user clicked
      if (shouldScroll) {
        const target = document.getElementById('diseaseDetailCard');
        if (target) {
          const headerOffset = 85;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          target.classList.remove('card-highlight-pulse');
          setTimeout(() => target.classList.add('card-highlight-pulse'), 150);
        }
      }
    }

    function renderMedicinesForSelectedDisease() {
      const medicinesList = document.getElementById('medicinesList');
      const d = currentPrediction.diseases[selectedDiseaseIndex];
      if (!d) return;

      const totalMedsCount = currentPrediction.medicines ? currentPrediction.medicines.length : 0;
      document.getElementById('btnFilterAllMeds').textContent = `Tất cả thuốc (${totalMedsCount})`;
      document.getElementById('btnFilterDiseaseMeds').textContent = `Thuốc cho "${d.name}"`;

      let medsToDisplay = [];
      if (currentMedFilter === 'disease') {
        medsToDisplay = (currentPrediction.medicines || []).filter(m => {
          if (!m.forDiseases || m.forDiseases.length === 0) return false;
          return m.forDiseases.some(fd => 
            fd.toLowerCase() === d.name.toLowerCase() || 
            (d.raw_name && fd.toLowerCase() === d.raw_name.toLowerCase())
          );
        });

        document.getElementById('medicinesTitle').innerHTML = `💊 Phác Đồ Thuốc: <span style="color: #0f766e;">${escapeHtml(d.name)}</span>`;
        document.getElementById('medicinesSubtitle').textContent = `Khuyến nghị liều lượng và chỉ dẫn dùng thuốc cho bệnh ${d.name}`;
      } else {
        medsToDisplay = currentPrediction.medicines || [];
        document.getElementById('medicinesTitle').innerHTML = `💊 Toàn Bộ Phác Đồ Thuốc Trong Ca Khám (${medsToDisplay.length})`;
        document.getElementById('medicinesSubtitle').textContent = `Tổng hợp các thuốc khuyến nghị điều trị cho tất cả các khả năng chẩn đoán trong ca bệnh`;
      }

      if (medsToDisplay.length > 0) {
        medicinesList.innerHTML = medsToDisplay.map(m => {
          const isRx = m.prescriptionRequired;
          const rxBadge = isRx
            ? '<span class="med-rx-badge rx-required">Thuốc kê đơn (Rx)</span>'
            : '<span class="med-rx-badge rx-otc">Thuốc không kê đơn (OTC)</span>';

          const forDiseasesBadge = (m.forDiseases && m.forDiseases.length > 0)
            ? `<div style="font-size: 0.75rem; color: #0f766e; background: #ccfbf1; padding: 0.2rem 0.5rem; border-radius: 4px; display: inline-block; margin-top: 0.35rem; font-weight: 600;">🎯 Chỉ định điều trị: ${m.forDiseases.map(fd => escapeHtml(fd)).join(', ')}</div>`
            : '';

          const warnHtml = (m.warnings && m.warnings.length > 0)
            ? `<div class="med-warning-tag">⚠️ ${m.warnings.map(w => escapeHtml(w)).join(', ')}</div>`
            : '';

          return `
            <div class="medicine-card">
              <div class="med-header">
                <span class="med-name">💊 ${escapeHtml(m.name)}</span>
                ${rxBadge}
              </div>
              ${forDiseasesBadge}
              <div class="med-field">
                <span class="med-field-label">Tác dụng:</span>
                <span class="med-field-val">${escapeHtml(m.usage || 'Hỗ trợ điều trị')}</span>
              </div>
              <div class="med-field">
                <span class="med-field-label">Liều dùng:</span>
                <span class="med-field-val" style="font-weight: 700; color: #0f766e;">${escapeHtml(m.dosage || 'Theo chỉ định của bác sĩ')}</span>
              </div>
              <div class="med-field">
                <span class="med-field-label">Cách dùng:</span>
                <span class="med-field-val">${escapeHtml(m.instruction || 'Tuân thủ hướng dẫn trên nhãn thuốc')}</span>
              </div>
              ${warnHtml}
            </div>
          `;
        }).join('');
      } else {
        medicinesList.innerHTML = `
          <div class="empty-med-box">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">ℹ️</div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--slate-800); margin-bottom: 0.35rem;">
              Chưa có thuốc biệt dược đặc hiệu riêng trong danh mục cho bệnh <em>"${escapeHtml(d.name)}"</em>
            </div>
            <p style="font-size: 0.825rem; color: var(--slate-500); max-width: 520px; margin: 0 auto 1rem auto; line-height: 1.5;">
              Đối với bệnh lý này, hướng điều trị chủ yếu tập trung vào điều trị triệu chứng, nâng đỡ thể trạng và theo dõi sát diễn tiến theo chỉ định lâm sàng của bác sĩ.
            </p>
            <button type="button" class="preset-btn" style="background: var(--primary); color: white; border: none; padding: 0.45rem 1rem;" onclick="toggleMedView('all')">
              📋 Xem tất cả thuốc được gợi ý trong ca khám (${totalMedsCount})
            </button>
          </div>
        `;
      }
    }

    function toggleMedView(view) {
      currentMedFilter = view;
      document.getElementById('btnFilterDiseaseMeds').classList.toggle('active', view === 'disease');
      document.getElementById('btnFilterAllMeds').classList.toggle('active', view === 'all');
      renderMedicinesForSelectedDisease();
    }

    function renderLifestyleForSelectedDisease(d) {
      document.getElementById('lifestyleTitle').innerHTML = `🥗 Tư Vấn Lối Sống & Phục Hồi: <span style="color: #0f766e;">${escapeHtml(d.name)}</span>`;
      document.getElementById('lifestyleSubtitle').textContent = `Chế độ dinh dưỡng, phòng ngừa và sinh hoạt bằng tiếng Việt cho bệnh ${d.name}`;

      // Diets
      const dietsList = document.getElementById('lifestyleDiets');
      const diets = (d.diets && d.diets.length > 0) ? d.diets : (currentPrediction.lifestyleAdvice ? currentPrediction.lifestyleAdvice.diets : []);
      dietsList.innerHTML = (diets && diets.length > 0)
        ? diets.map(item => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>Duy trì chế độ ăn thanh đạm, hợp vệ sinh, uống đủ nước.</li>';

      // Precautions
      const precList = document.getElementById('lifestylePrecautions');
      const precs = (d.precautions && d.precautions.length > 0) ? d.precautions : (currentPrediction.lifestyleAdvice ? currentPrediction.lifestyleAdvice.precautions : []);
      precList.innerHTML = (precs && precs.length > 0)
        ? precs.map(item => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>Nghỉ ngơi, theo dõi sức khỏe và tái khám ngay khi có dấu hiệu bất thường.</li>';

      // Workouts
      const workList = document.getElementById('lifestyleWorkouts');
      const works = (d.workouts && d.workouts.length > 0) ? d.workouts : (currentPrediction.lifestyleAdvice ? currentPrediction.lifestyleAdvice.workouts : []);
      workList.innerHTML = (works && works.length > 0)
        ? works.map(item => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>Vận động nhẹ nhàng phù hợp với thể trạng, tránh gắng sức quá mức.</li>';
    }

    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ==========================================
    // Disease Medicine Search & Tab Navigation Logic (Ý 4: Hai chiều)
    // ==========================================
    let activeMainTab = 'cdss'; // 'cdss' | 'drugSearch' | 'ddi'
    let currentSearchMode = 'disease'; // 'disease' | 'medicine'
    let allDiseasesCache = [];
    let allMedicinesCache = [];
    let currentSearchData = null;
    let currentSearchMedFilter = 'all';
    let currentReverseSearchData = null;
    let currentReverseFilter = 'all';
    const selectedDdiDrugs = new Set();

    const DDI_PRESETS = {
      1: ["Aspirin", "Blood thinners"],
      2: ["Aspirin", "NSAIDs"],
      3: ["Beta-blockers", "Calcium channel blockers"],
      4: ["NSAIDs", "ACE inhibitors"],
      5: ["Insulin", "Beta-blockers"],
      6: ["Antacids", "Antibiotics"],
      7: ["Corticosteroids", "NSAIDs"],
      8: ["Paracetamol", "Antifungal Cream"]
    };

    function switchMainTab(tab) {
      activeMainTab = tab;
      const tabCdss = document.getElementById('tabBtnCdss');
      const tabDrug = document.getElementById('tabBtnDrugSearch');
      const tabDdi = document.getElementById('tabBtnDdi');
      const cdssSection = document.getElementById('cdssMainSection');
      const drugSection = document.getElementById('drugSearchSection');
      const ddiSection = document.getElementById('ddiSection');

      tabCdss.classList.remove('active');
      tabDrug.classList.remove('active');
      if (tabDdi) tabDdi.classList.remove('active');

      cdssSection.style.display = 'none';
      drugSection.style.display = 'none';
      if (ddiSection) ddiSection.style.display = 'none';

      if (tab === 'cdss') {
        tabCdss.classList.add('active');
        cdssSection.style.display = 'grid';
      } else if (tab === 'drugSearch') {
        tabDrug.classList.add('active');
        drugSection.style.display = 'block';
        const input = document.getElementById('diseaseSearchInput');
        if (input) input.focus();
      } else if (tab === 'ddi') {
        if (tabDdi) tabDdi.classList.add('active');
        if (ddiSection) ddiSection.style.display = 'block';
        const input = document.getElementById('ddiDrugInput');
        if (input) input.focus();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function applyDdiPreset(id) {
      const list = DDI_PRESETS[id];
      if (!list) return;
      selectedDdiDrugs.clear();
      list.forEach(d => selectedDdiDrugs.add(d));
      renderDdiSelectedChips();
      runDdiCheck();
    }

    function addDdiDrugFromInput() {
      const input = document.getElementById('ddiDrugInput');
      const val = input ? input.value.trim() : '';
      if (!val) return;
      selectedDdiDrugs.add(val);
      input.value = '';
      input.focus();
      renderDdiSelectedChips();
    }

    function removeDdiDrug(name) {
      selectedDdiDrugs.delete(name);
      renderDdiSelectedChips();
    }

    function clearAllDdiDrugs() {
      selectedDdiDrugs.clear();
      renderDdiSelectedChips();
      const empty = document.getElementById('ddiEmptyState');
      const content = document.getElementById('ddiResultContent');
      if (empty) empty.style.display = 'block';
      if (content) content.style.display = 'none';
    }

    function renderDdiSelectedChips() {
      const container = document.getElementById('ddiSelectedChips');
      const countEl = document.getElementById('ddiDrugCount');
      if (countEl) countEl.textContent = selectedDdiDrugs.size;
      if (!container) return;

      if (selectedDdiDrugs.size === 0) {
        container.innerHTML = '<span class="ddi-no-drug-tip">Chưa có thuốc nào được chọn. Hãy nhập tên thuốc ở trên hoặc chọn nhanh từ các ca lâm sàng mẫu bên dưới.</span>';
        return;
      }

      container.innerHTML = Array.from(selectedDdiDrugs).map(d => `
        <span class="ddi-chip">
          💊 ${escapeHtml(d)}
          <button type="button" class="ddi-chip-remove" onclick="removeDdiDrug('${escapeHtml(d)}')" title="Bỏ thuốc này">×</button>
        </span>
      `).join('');
    }

    function checkDdiFromCurrentPrescription() {
      if (!currentPrediction || !currentPrediction.diseases || !currentPrediction.diseases[selectedDiseaseIndex]) return;
      const d = currentPrediction.diseases[selectedDiseaseIndex];
      const meds = currentPrediction.medicines || [];
      const diseaseMeds = meds.filter(m => m.disease === d.name);
      const targetMeds = (diseaseMeds.length >= 2 ? diseaseMeds : meds).slice(0, 6);

      if (targetMeds.length < 2) {
        alert('Đơn thuốc hiện tại chỉ có ' + targetMeds.length + ' loại thuốc. Cần tối thiểu 2 thuốc để kiểm tra tương tác.');
        return;
      }

      selectedDdiDrugs.clear();
      targetMeds.forEach(m => selectedDdiDrugs.add(m.name));
      renderDdiSelectedChips();
      switchMainTab('ddi');
      runDdiCheck();
    }

    async function runDdiCheck() {
      if (selectedDdiDrugs.size < 2) {
        alert('Vui lòng chọn hoặc nhập tối thiểu 2 loại thuốc để kiểm tra tương tác dược lý.');
        return;
      }

      const btn = document.getElementById('btnRunDdi');
      const icon = document.getElementById('ddiBtnIcon');
      const text = document.getElementById('ddiBtnText');
      const spinner = document.getElementById('ddiBtnSpinner');

      btn.disabled = true;
      icon.style.display = 'none';
      text.textContent = 'Đang phân tích tương tác...';
      spinner.style.display = 'inline-block';

      try {
        const internalKey = document.getElementById('internalKey').value.trim();
        const payload = {
          drugs: Array.from(selectedDdiDrugs)
        };

        const res = await fetch('/internal/check-ddi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': internalKey
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Lỗi hệ thống (${res.status})`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          renderDdiResults(json.data);
        } else {
          throw new Error(json.message || 'Không nhận được dữ liệu phản hồi.');
        }
      } catch (err) {
        alert('Lỗi kiểm tra tương tác thuốc: ' + err.message);
      } finally {
        btn.disabled = false;
        icon.style.display = 'inline-block';
        text.textContent = 'Kiểm Tra Tương Tác Thuốc';
        spinner.style.display = 'none';
      }
    }

    function renderDdiResults(data) {
      const emptyState = document.getElementById('ddiEmptyState');
      const content = document.getElementById('ddiResultContent');
      emptyState.style.display = 'none';
      content.style.display = 'block';

      if (data.totalInteractions === 0) {
        content.innerHTML = `
          <div class="ddi-safe-banner">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🛡️</div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: #15803d; margin-bottom: 0.5rem;">
              Phối Hợp An Toàn: Không Phát Hiện Tương Tác Đối Kháng Nguy Hiểm
            </h3>
            <p style="font-size: 0.9rem; color: #166534; max-width: 650px; margin: 0 auto; line-height: 1.55;">
              ${escapeHtml(data.message)}
            </p>
            <div style="margin-top: 1.25rem; font-size: 0.8rem; color: #15803d; font-weight: 600;">
              Đã đối chiếu chéo ${data.drugsAnalyzed ? data.drugsAnalyzed.length : 0} loại thuốc: ${data.drugsAnalyzed ? data.drugsAnalyzed.map(d => `<strong>${escapeHtml(d)}</strong>`).join(', ') : ''}
            </div>
          </div>
        `;
        return;
      }

      const s = data.severitySummary || {};
      const alertClass = data.hasCriticalConflict ? 'ddi-alert-critical' : 'ddi-alert-warning';
      const alertIcon = data.hasCriticalConflict ? '🚨' : '⚠️';
      const alertTitle = data.hasCriticalConflict
        ? `CẢNH BÁO TƯƠNG TÁC THUỐC NGUY HIỂM (${data.totalInteractions} TƯƠNG TÁC ĐƯỢC PHÁT HIỆN)`
        : `LƯU Ý TƯƠNG TÁC DƯỢC LÝ (${data.totalInteractions} TƯƠNG TÁC ĐƯỢC PHÁT HIỆN)`;

      const cardsHtml = data.interactions.map(item => {
        let badgeClass = 'badge-ddi-moderate';
        if (item.severity === 'contraindicated') badgeClass = 'badge-ddi-contraindicated';
        else if (item.severity === 'major') badgeClass = 'badge-ddi-major';
        else if (item.severity === 'minor') badgeClass = 'badge-ddi-minor';

        return `
          <div class="ddi-interaction-card ${escapeHtml(item.severity)}">
            <div class="ddi-card-header">
              <div class="ddi-drug-pair">
                <span>💊</span> <strong>${escapeHtml(item.drug1)}</strong>
                <span style="color: var(--slate-400); font-size: 1.25rem;">⇄</span>
                <span>💊</span> <strong>${escapeHtml(item.drug2)}</strong>
              </div>
              <span class="${badgeClass}">${escapeHtml(item.severityLabel)}</span>
            </div>
            <div class="ddi-card-body">
              <div class="ddi-field-box">
                <strong>🔬 Cơ chế tương tác:</strong> ${escapeHtml(item.mechanism || 'Chưa cập nhật cơ chế chi tiết')}
              </div>
              <div class="ddi-field-box" style="color: #991b1b;">
                <strong>⚠️ Hậu quả lâm sàng:</strong> ${escapeHtml(item.clinicalEffect || 'Nguy cơ ảnh hưởng hiệu quả điều trị')}
              </div>
              <div class="ddi-action-box">
                <strong>💡 Hướng xử trí lâm sàng & Khuyến nghị bác sĩ:</strong> ${escapeHtml(item.recommendation || 'Tham khảo dược sĩ hoặc bác sĩ chuyên khoa để điều chỉnh phác đồ.')}
              </div>
            </div>
          </div>
        `;
      }).join('');

      content.innerHTML = `
        <!-- Summary Alert Banner -->
        <div class="ddi-alert-banner ${alertClass}">
          <div style="font-size: 2.25rem;">${alertIcon}</div>
          <div style="flex: 1;">
            <h4 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.35rem;">${alertTitle}</h4>
            <p style="font-size: 0.88rem; line-height: 1.5; margin-bottom: 0.75rem;">
              ${escapeHtml(data.message)}
            </p>
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
              ${s.contraindicated ? `<span class="badge-ddi-contraindicated">🔴 ${s.contraindicated} Chống chỉ định</span>` : ''}
              ${s.major ? `<span class="badge-ddi-major">🟠 ${s.major} Mức độ nặng</span>` : ''}
              ${s.moderate ? `<span class="badge-ddi-moderate">🟡 ${s.moderate} Thận trọng</span>` : ''}
              ${s.minor ? `<span class="badge-ddi-minor">🔵 ${s.minor} Mức độ nhẹ</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Interaction Cards List -->
        <div>
          ${cardsHtml}
        </div>
      `;
    }

    function setSearchMode(mode) {
      currentSearchMode = mode;
      const btnDisease = document.getElementById('btnModeDisease');
      const btnMedicine = document.getElementById('btnModeMedicine');
      const heroTitle = document.getElementById('searchHeroTitle');
      const heroDesc = document.getElementById('searchHeroDesc');
      const input = document.getElementById('diseaseSearchInput');
      const searchBtnText = document.getElementById('searchBtnText');
      const presetsLabel = document.getElementById('searchPresetsLabel');
      const emptyIcon = document.getElementById('searchEmptyIcon');
      const emptyTitle = document.getElementById('searchEmptyTitle');
      const emptyDesc = document.getElementById('searchEmptyDesc');

      if (mode === 'medicine') {
        if (btnDisease) btnDisease.classList.remove('active');
        if (btnMedicine) btnMedicine.classList.add('active');
        if (heroTitle) heroTitle.innerHTML = '<span>🔄</span> Tra Cứu Ngược: Tìm Danh Mục Bệnh Lý Theo Tên Thuốc';
        if (heroDesc) heroDesc.textContent = 'Nhập tên thương mại hoặc hoạt chất của thuốc (ví dụ: Paracetamol, Fluconazole, Antibiotics, Antacids, Corticosteroids, PPIs...) để tra cứu xem thuốc này được chỉ định điều trị cho những bệnh lý nào, theo phác đồ hàng 1 hay hàng 2, kèm liều dùng và lưu ý lâm sàng.';
        if (input) {
          input.placeholder = 'Nhập tên thuốc hoặc hoạt chất cần tra cứu (ví dụ: Paracetamol, Fluconazole, Antacids...)';
          input.setAttribute('list', 'medicineDatalist');
        }
        if (searchBtnText) searchBtnText.textContent = 'Tìm Bệnh Theo Thuốc';
        if (presetsLabel) presetsLabel.textContent = 'Gợi ý thuốc phổ biến:';
        if (emptyIcon) emptyIcon.textContent = '🔄';
        if (emptyTitle) emptyTitle.textContent = 'Tra Cứu Bệnh Lý Chỉ Định Theo Tên Thuốc';
        if (emptyDesc) emptyDesc.textContent = 'Vui lòng nhập tên thuốc hoặc hoạt chất vào thanh tìm kiếm ở trên hoặc chọn nhanh từ danh sách gợi ý để xem toàn bộ bệnh lý được chỉ định điều trị.';
      } else {
        if (btnDisease) btnDisease.classList.add('active');
        if (btnMedicine) btnMedicine.classList.remove('active');
        if (heroTitle) heroTitle.innerHTML = '<span>💊</span> Tra Cứu Toàn Bộ Thuốc Điều Trị Theo Tên Bệnh';
        if (heroDesc) heroDesc.textContent = 'Nhập tên bất kỳ bệnh lý nào (tiếng Việt có dấu hoặc không dấu, tên tiếng Anh hoặc mã bệnh) để tra cứu toàn bộ danh mục thuốc chỉ định theo phác đồ y khoa, bao gồm thuốc hàng 1 (First-line), thuốc hàng 2 (Second-line), liều dùng, cách dùng, chống chỉ định và hướng dẫn chăm sóc.';
        if (input) {
          input.placeholder = 'Nhập tên bệnh lý cần tra cứu (ví dụ: Sốt xuất huyết, Hen phế quản, Sốt rét, Loét dạ dày...)';
          input.setAttribute('list', 'diseaseDatalist');
        }
        if (searchBtnText) searchBtnText.textContent = 'Tìm Kiếm Thuốc';
        if (presetsLabel) presetsLabel.textContent = 'Gợi ý bệnh phổ biến:';
        if (emptyIcon) emptyIcon.textContent = '💊';
        if (emptyTitle) emptyTitle.textContent = 'Tra Cứu Danh Mục Thuốc Theo Tên Bệnh Lý';
        if (emptyDesc) emptyDesc.textContent = 'Vui lòng nhập tên bệnh vào thanh tìm kiếm ở trên hoặc chọn nhanh từ danh sách gợi ý để xem toàn bộ thuốc điều trị theo phác đồ.';
      }

      updateSuggestionPills();
      clearDiseaseSearch();
    }

    function updateSuggestionPills() {
      const pillsList = document.getElementById('searchPillsList');
      if (!pillsList) return;

      if (currentSearchMode === 'medicine') {
        const meds = [
          'Paracetamol', 'Fluconazole', 'Antibiotics', 'Antacids',
          'Antihistamines', 'Corticosteroids', 'Proton Pump Inhibitors (PPIs)',
          'Clotrimazole', 'Terbinafine', 'Ketoconazole'
        ];
        pillsList.innerHTML = meds.map(m =>
          `<button type="button" class="search-pill" onclick="quickSearch('${escapeHtml(m)}')">💊 ${escapeHtml(m)}</button>`
        ).join('');
      } else {
        const diseases = [
          'Sốt xuất huyết', 'Sốt rét', 'Loét dạ dày tá tràng', 'Cảm cúm',
          'Hen phế quản', 'Đau nửa đầu', 'Viêm khớp', 'Tăng huyết áp',
          'Đái tháo đường', 'Viêm phế quản'
        ];
        pillsList.innerHTML = diseases.map(d =>
          `<button type="button" class="search-pill" onclick="quickSearch('${escapeHtml(d)}')">🩺 ${escapeHtml(d)}</button>`
        ).join('');
      }
    }

    function jumpToDrugSearchFromDetail() {
      if (currentPrediction && currentPrediction.diseases && currentPrediction.diseases[selectedDiseaseIndex]) {
        const d = currentPrediction.diseases[selectedDiseaseIndex];
        jumpToDrugSearch(d.name);
      }
    }

    function jumpToDrugSearch(diseaseName) {
      switchMainTab('drugSearch');
      setSearchMode('disease');
      const input = document.getElementById('diseaseSearchInput');
      if (input) {
        input.value = diseaseName;
        handleSearchInputChange();
      }
      searchMedicinesByDisease(diseaseName);
    }

    function handleSearchInputChange() {
      const val = document.getElementById('diseaseSearchInput').value.trim();
      const btnClear = document.getElementById('btnClearSearch');
      if (btnClear) {
        btnClear.style.display = val ? 'block' : 'none';
      }
    }

    function clearDiseaseSearch() {
      const input = document.getElementById('diseaseSearchInput');
      if (input) {
        input.value = '';
        input.focus();
      }
      const btnClear = document.getElementById('btnClearSearch');
      if (btnClear) btnClear.style.display = 'none';
      document.getElementById('searchEmptyState').style.display = 'block';
      document.getElementById('searchResultContent').style.display = 'none';
      currentSearchData = null;
      currentReverseSearchData = null;
    }

    function quickSearch(term) {
      const input = document.getElementById('diseaseSearchInput');
      if (input) {
        input.value = term;
        handleSearchInputChange();
      }
      if (currentSearchMode === 'medicine') {
        searchDiseasesByMedicine(term);
      } else {
        searchMedicinesByDisease(term);
      }
    }

    function quickSearchDisease(diseaseName) {
      setSearchMode('disease');
      quickSearch(diseaseName);
    }

    function handleDiseaseSearchSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      const input = document.getElementById('diseaseSearchInput');
      const val = input ? input.value.trim() : '';
      if (!val) {
        alert(currentSearchMode === 'medicine' ? 'Vui lòng nhập tên thuốc hoặc hoạt chất để tra cứu.' : 'Vui lòng nhập tên bệnh lý để tra cứu thuốc.');
        return;
      }
      if (currentSearchMode === 'medicine') {
        searchDiseasesByMedicine(val);
      } else {
        searchMedicinesByDisease(val);
      }
    }

    async function loadAllDiseases() {
      try {
        const internalKey = document.getElementById('internalKey').value.trim();
        const res = await fetch('/internal/diseases', {
          headers: { 'X-Internal-Key': internalKey }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            allDiseasesCache = json.data;
            const datalist = document.getElementById('diseaseDatalist');
            if (datalist) {
              datalist.innerHTML = allDiseasesCache.map(d =>
                `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name_en)} (${escapeHtml(d.specialty)})</option>`
              ).join('');
            }
          }
        }
      } catch (err) {
        console.warn('Could not load diseases datalist:', err);
      }
    }

    async function loadAllMedicines() {
      try {
        const internalKey = document.getElementById('internalKey').value.trim();
        const res = await fetch('/internal/medicines', {
          headers: { 'X-Internal-Key': internalKey }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            allMedicinesCache = json.data;
            const datalist = document.getElementById('medicineDatalist');
            if (datalist) {
              datalist.innerHTML = allMedicinesCache.map(m =>
                `<option value="${escapeHtml(m.name)}">${escapeHtml(m.activeIngredient || m.name)} (${escapeHtml(m.group || '')})</option>`
              ).join('');
            }
          }
        }
      } catch (err) {
        console.warn('Could not load medicines datalist:', err);
      }
    }

    async function searchMedicinesByDisease(diseaseName) {
      if (!diseaseName || !diseaseName.trim()) return;

      const submitBtn = document.getElementById('btnSearchSubmit');
      const btnIcon = document.getElementById('searchBtnIcon');
      const btnText = document.getElementById('searchBtnText');
      const btnSpinner = document.getElementById('searchBtnSpinner');

      submitBtn.disabled = true;
      btnIcon.style.display = 'none';
      btnText.textContent = 'Đang tra cứu...';
      btnSpinner.style.display = 'inline-block';

      try {
        const internalKey = document.getElementById('internalKey').value.trim();
        const res = await fetch(`/internal/medicines-by-disease?disease=${encodeURIComponent(diseaseName.trim())}`, {
          method: 'GET',
          headers: {
            'X-Internal-Key': internalKey
          }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Lỗi hệ thống (${res.status})`);
        }

        const data = await res.json();
        if (data.success && data.data) {
          currentSearchData = data.data;
          currentSearchMedFilter = 'all';
          renderDiseaseSearchResults(data.data);
        } else {
          throw new Error(data.message || 'Không nhận được dữ liệu phản hồi.');
        }
      } catch (err) {
        alert('Lỗi tra cứu: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        btnIcon.style.display = 'inline-block';
        btnText.textContent = 'Tìm Kiếm Thuốc';
        btnSpinner.style.display = 'none';
      }
    }

    function renderDiseaseSearchResults(data) {
      const emptyState = document.getElementById('searchEmptyState');
      const content = document.getElementById('searchResultContent');

      emptyState.style.display = 'none';
      content.style.display = 'block';

      if (!data.found || !data.disease) {
        const suggestionsHtml = (data.suggestedDiseases && data.suggestedDiseases.length > 0)
          ? `
            <div style="margin-top: 1.25rem;">
              <div style="font-size: 0.85rem; font-weight: 700; color: #9a3412; margin-bottom: 0.65rem;">
                💡 Gợi ý bệnh lý gần đúng trong hệ thống y khoa:
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
                ${data.suggestedDiseases.map(s => `
                  <button type="button" class="preset-btn" onclick="quickSearch('${escapeHtml(s.name)}')">
                    🩺 ${escapeHtml(s.name)} <span style="font-size: 0.75rem; color: var(--slate-500);">(${escapeHtml(s.specialty || '')})</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `
          : '';

        content.innerHTML = `
          <div class="card" style="padding: 2.75rem 2rem; text-align: center; border-color: #fed7aa; background: #fffaf5;">
            <div style="font-size: 2.75rem; margin-bottom: 0.75rem;">🔍</div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #9a3412; margin-bottom: 0.5rem;">
              ${escapeHtml(data.message || 'Không tìm thấy bệnh lý phù hợp')}
            </h3>
            <p style="font-size: 0.875rem; color: #7c2d12; max-width: 560px; margin: 0 auto; line-height: 1.5;">
              Vui lòng kiểm tra lại từ khóa hoặc chọn từ các gợi ý bệnh lý phổ biến bên dưới để tra cứu thuốc.
            </p>
            ${suggestionsHtml}
          </div>
        `;
        return;
      }

      const d = data.disease;
      const meds = data.medicines || [];
      const line1Count = meds.filter(m => m.line === 1).length;
      const line2Count = meds.filter(m => m.line === 2).length;

      const symptomsHtml = (d.symptoms && d.symptoms.length > 0)
        ? d.symptoms.map(s => `<span class="symptom-tag characteristic">✓ ${escapeHtml(s)}</span>`).join('')
        : '<span style="font-size: 0.85rem; color: var(--slate-500);">Đang cập nhật biểu hiện lâm sàng.</span>';

      const dietsHtml = (d.diets && d.diets.length > 0)
        ? d.diets.map(item => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>Duy trì chế độ dinh dưỡng thanh đạm, lành mạnh, uống nhiều nước.</li>';

      const precsHtml = (d.precautions && d.precautions.length > 0)
        ? d.precautions.map(item => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>Nghỉ ngơi hợp lý, theo dõi sát diễn biến thể trạng và tái khám định kỳ.</li>';

      const worksHtml = (d.workouts && d.workouts.length > 0)
        ? d.workouts.map(item => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>Vận động nhẹ nhàng phù hợp thể trạng, tránh làm việc nặng gắng sức.</li>';

      content.innerHTML = `
        <!-- Disease Overview Card -->
        <div class="search-disease-card">
          <div class="search-disease-header">
            <div>
              <div class="search-disease-title">
                <span>🩺</span> ${escapeHtml(d.name)}
                ${d.name_en ? `<span class="search-disease-en">(${escapeHtml(d.name_en)})</span>` : ''}
              </div>
            </div>
            <div class="search-badges-row">
              <span class="badge-specialty">🏥 Chuyên khoa: ${escapeHtml(d.specialty || 'Nội khoa')}</span>
              <span class="badge-med-count">💊 ${data.totalMedicines} loại thuốc chỉ định</span>
              <span class="badge-id">Mã: ${escapeHtml(d.id)}</span>
            </div>
          </div>
          <div class="search-disease-body">
            ${d.description ? `<div class="search-disease-desc">${escapeHtml(d.description)}</div>` : ''}

            <!-- Symptoms Row -->
            <div style="margin-bottom: 1.25rem;">
              <div style="font-size: 0.875rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.45rem; display: flex; align-items: center; gap: 0.4rem;">
                <span>📋</span> Triệu Chứng Đặc Trưng Của Bệnh:
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                ${symptomsHtml}
              </div>
            </div>

            <!-- Lifestyle Advice Grid -->
            <div>
              <div style="font-size: 0.875rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.4rem;">
                <span>🥗</span> Hướng Dẫn Dinh Dưỡng, Phòng Ngừa & Sinh Hoạt:
              </div>
              <div class="lifestyle-grid">
                <div class="lifestyle-col">
                  <div class="lifestyle-title diets">🥑 Chế độ Dinh dưỡng</div>
                  <ul class="lifestyle-list">${dietsHtml}</ul>
                </div>
                <div class="lifestyle-col">
                  <div class="lifestyle-title precautions">🛡️ Phòng ngừa & Tự chăm sóc</div>
                  <ul class="lifestyle-list">${precsHtml}</ul>
                </div>
                <div class="lifestyle-col">
                  <div class="lifestyle-title workouts">🏃 Lối sống & Thể chất</div>
                  <ul class="lifestyle-list">${worksHtml}</ul>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Medicines Section -->
        <div class="search-meds-container">
          <div class="search-meds-header">
            <div class="search-meds-title">
              <span>💊</span> Danh Mục Thuốc Điều Trị Theo Phác Đồ (${data.totalMedicines} thuốc)
            </div>
            <div class="med-filter-toggle">
              <button type="button" class="med-toggle-btn ${currentSearchMedFilter === 'all' ? 'active' : ''}" onclick="filterSearchMeds(event, 'all')">
                Tất cả (${data.totalMedicines})
              </button>
              <button type="button" class="med-toggle-btn ${currentSearchMedFilter === 'line1' ? 'active' : ''}" onclick="filterSearchMeds(event, 'line1')">
                🥇 Hàng 1 (${line1Count})
              </button>
              <button type="button" class="med-toggle-btn ${currentSearchMedFilter === 'line2' ? 'active' : ''}" onclick="filterSearchMeds(event, 'line2')">
                🥈 Hàng 2 (${line2Count})
              </button>
              <button type="button" class="med-toggle-btn ${currentSearchMedFilter === 'rx' ? 'active' : ''}" onclick="filterSearchMeds(event, 'rx')">
                🔴 Thuốc Rx
              </button>
              <button type="button" class="med-toggle-btn ${currentSearchMedFilter === 'otc' ? 'active' : ''}" onclick="filterSearchMeds(event, 'otc')">
                🟢 Thuốc OTC
              </button>
            </div>
          </div>

          <div id="searchMedsList">
            <!-- Dynamic medicine cards rendered by renderSearchMedsList() -->
          </div>
        </div>
      `;

      renderSearchMedsList();
    }

    function filterSearchMeds(e, filter) {
      currentSearchMedFilter = filter;
      document.querySelectorAll('.search-meds-header .med-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      if (e && e.target) {
        e.target.classList.add('active');
      }
      renderSearchMedsList();
    }

    function renderSearchMedsList() {
      const container = document.getElementById('searchMedsList');
      if (!container || !currentSearchData || !currentSearchData.medicines) return;

      let list = currentSearchData.medicines;
      if (currentSearchMedFilter === 'line1') {
        list = list.filter(m => m.line === 1);
      } else if (currentSearchMedFilter === 'line2') {
        list = list.filter(m => m.line === 2);
      } else if (currentSearchMedFilter === 'rx') {
        list = list.filter(m => m.prescriptionRequired === true);
      } else if (currentSearchMedFilter === 'otc') {
        list = list.filter(m => m.prescriptionRequired === false);
      }

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-med-box">
            <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">ℹ️</div>
            <div style="font-weight: 700; color: var(--slate-700);">Không có thuốc nào phù hợp với bộ lọc này.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(m => {
        const lineBadge = m.line === 1
          ? '<span class="badge-line-1">🥇 Phác đồ hàng 1 (First-line)</span>'
          : '<span class="badge-line-2">🥈 Phác đồ hàng 2 (Second-line)</span>';

        const rxBadge = m.prescriptionRequired
          ? '<span class="med-rx-badge rx-required">🔴 Rx - Cần Đơn Bác Sĩ</span>'
          : '<span class="med-rx-badge rx-otc">🟢 OTC - Không Kê Đơn</span>';

        const groupBadge = m.group ? `<span class="badge-group">${escapeHtml(m.group)}</span>` : '';
        const activeIngredient = m.activeIngredient ? `<span class="search-med-active">Hoạt chất: ${escapeHtml(m.activeIngredient)}</span>` : '';

        const contraHtml = (m.contraindications && m.contraindications.length > 0)
          ? `<div class="search-med-field" style="color: #991b1b; background: #fee2e2; padding: 0.35rem 0.65rem; border-radius: 6px; margin-top: 0.5rem;">
               <strong>⚠️ Chống chỉ định / Dị ứng:</strong> ${escapeHtml(m.contraindications.join(', '))}
             </div>`
          : '';

        return `
          <div class="search-med-card ${m.line === 2 ? 'line-2' : ''}">
            <div class="search-med-top">
              <div class="search-med-name-group">
                <span class="search-med-title">💊 ${escapeHtml(m.name)}</span>
                ${activeIngredient}
                ${groupBadge}
              </div>
              <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                ${lineBadge}
                ${rxBadge}
              </div>
            </div>

            <div class="search-med-grid">
              <div class="search-med-field">
                <strong>🎯 Chỉ định:</strong> ${escapeHtml(m.usage || 'Điều trị theo phác đồ')}
              </div>
              <div class="search-med-field">
                <strong>📋 Liều dùng khuyến nghị:</strong>
                <span class="search-med-dosage">${escapeHtml(m.dosage || 'Theo chỉ định của bác sĩ')}</span>
              </div>
              <div class="search-med-field" style="grid-column: 1 / -1;">
                <strong>💡 Hướng dẫn sử dụng:</strong> ${escapeHtml(m.instruction || 'Tuân thủ hướng dẫn trên nhãn thuốc')}
              </div>
            </div>

            ${contraHtml}
          </div>
        `;
      }).join('');
    }

    // ==========================================
    // Reverse Search (Medicine -> Indicated Diseases)
    // ==========================================
    async function searchDiseasesByMedicine(medicineName) {
      if (!medicineName || !medicineName.trim()) return;

      const submitBtn = document.getElementById('btnSearchSubmit');
      const btnIcon = document.getElementById('searchBtnIcon');
      const btnText = document.getElementById('searchBtnText');
      const btnSpinner = document.getElementById('searchBtnSpinner');

      submitBtn.disabled = true;
      btnIcon.style.display = 'none';
      btnText.textContent = 'Đang tra cứu bệnh...';
      btnSpinner.style.display = 'inline-block';

      try {
        const internalKey = document.getElementById('internalKey').value.trim();
        const res = await fetch(`/internal/diseases-by-medicine?medicine=${encodeURIComponent(medicineName.trim())}`, {
          method: 'GET',
          headers: {
            'X-Internal-Key': internalKey
          }
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Lỗi hệ thống (${res.status})`);
        }

        const data = await res.json();
        if (data.success && data.data) {
          currentReverseSearchData = data.data;
          currentReverseFilter = 'all';
          renderMedicineSearchReverseResults(data.data);
        } else {
          throw new Error(data.message || 'Không nhận được dữ liệu phản hồi.');
        }
      } catch (err) {
        alert('Lỗi tra cứu thuốc: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        btnIcon.style.display = 'inline-block';
        btnText.textContent = 'Tìm Bệnh Theo Thuốc';
        btnSpinner.style.display = 'none';
      }
    }

    function renderMedicineSearchReverseResults(data) {
      const emptyState = document.getElementById('searchEmptyState');
      const content = document.getElementById('searchResultContent');

      emptyState.style.display = 'none';
      content.style.display = 'block';

      if (!data.found || !data.medicine) {
        const suggestionsHtml = (data.suggestedMedicines && data.suggestedMedicines.length > 0)
          ? `
            <div style="margin-top: 1.25rem;">
              <div style="font-size: 0.85rem; font-weight: 700; color: #9a3412; margin-bottom: 0.65rem;">
                💡 Gợi ý thuốc gần đúng trong hệ thống y khoa:
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
                ${data.suggestedMedicines.map(s => `
                  <button type="button" class="preset-btn" onclick="quickSearch('${escapeHtml(s.name)}')">
                    💊 ${escapeHtml(s.name)} <span style="font-size: 0.75rem; color: var(--slate-500);">(${escapeHtml(s.group || '')})</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `
          : '';

        content.innerHTML = `
          <div class="card" style="padding: 2.75rem 2rem; text-align: center; border-color: #fed7aa; background: #fffaf5;">
            <div style="font-size: 2.75rem; margin-bottom: 0.75rem;">🔍</div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #9a3412; margin-bottom: 0.5rem;">
              ${escapeHtml(data.message || 'Không tìm thấy thuốc phù hợp')}
            </h3>
            <p style="font-size: 0.875rem; color: #7c2d12; max-width: 560px; margin: 0 auto; line-height: 1.5;">
              Vui lòng kiểm tra lại tên thuốc/hoạt chất hoặc chọn từ các gợi ý thuốc phổ biến bên dưới.
            </p>
            ${suggestionsHtml}
          </div>
        `;
        return;
      }

      const m = data.medicine;
      const diseases = data.indicatedDiseases || [];
      const line1Count = diseases.filter(d => d.line === 1).length;
      const line2Count = diseases.filter(d => d.line === 2).length;

      const rxBadge = m.prescriptionRequired
        ? '<span class="med-rx-badge rx-required">🔴 Rx - Cần Đơn Bác Sĩ</span>'
        : '<span class="med-rx-badge rx-otc">🟢 OTC - Không Kê Đơn</span>';

      const contraHtml = (m.contraindications && m.contraindications.length > 0)
        ? `<div class="search-med-field" style="color: #991b1b; background: #fee2e2; padding: 0.45rem 0.75rem; border-radius: 6px; margin-top: 0.65rem;">
             <strong>⚠️ Chống chỉ định / Lưu ý an toàn:</strong> ${escapeHtml(m.contraindications.join(', '))}
           </div>`
        : '';

      content.innerHTML = `
        <!-- Medicine Profile Card -->
        <div class="search-disease-card">
          <div class="search-disease-header">
            <div>
              <div class="search-disease-title">
                <span>💊</span> ${escapeHtml(m.name)}
                ${m.activeIngredient ? `<span class="search-disease-en">(Hoạt chất: ${escapeHtml(m.activeIngredient)})</span>` : ''}
              </div>
            </div>
            <div class="search-badges-row">
              ${m.group ? `<span class="badge-group">Nhóm: ${escapeHtml(m.group)}</span>` : ''}
              ${rxBadge}
              <span class="badge-med-count">🎯 Chỉ định cho ${data.totalDiseases} bệnh lý</span>
            </div>
          </div>
          <div class="search-disease-body">
            <div class="search-med-grid" style="margin-top: 0;">
              <div class="search-med-field">
                <strong>🎯 Tác dụng & Cơ chế:</strong> ${escapeHtml(m.usage || 'Chỉ định điều trị')}
              </div>
              <div class="search-med-field">
                <strong>📋 Liều dùng chuẩn:</strong>
                <span class="search-med-dosage">${escapeHtml(m.dosage || 'Theo chỉ định của bác sĩ')}</span>
              </div>
              <div class="search-med-field" style="grid-column: 1 / -1;">
                <strong>💡 Hướng dẫn sử dụng an toàn:</strong> ${escapeHtml(m.instruction || 'Tuân thủ hướng dẫn trên nhãn hoặc chỉ định bác sĩ')}
              </div>
            </div>
            ${contraHtml}
          </div>
        </div>

        <!-- Indicated Diseases Section -->
        <div class="search-meds-container">
          <div class="search-meds-header">
            <div class="search-meds-title">
              <span>🩺</span> Danh Mục Bệnh Lý Được Chỉ Định Điều Trị (${data.totalDiseases} bệnh lý)
            </div>
            <div class="med-filter-toggle">
              <button type="button" class="med-toggle-btn ${currentReverseFilter === 'all' ? 'active' : ''}" onclick="filterReverseDiseases(event, 'all')">
                Tất cả (${data.totalDiseases})
              </button>
              <button type="button" class="med-toggle-btn ${currentReverseFilter === 'line1' ? 'active' : ''}" onclick="filterReverseDiseases(event, 'line1')">
                🥇 Hàng 1 (${line1Count})
              </button>
              <button type="button" class="med-toggle-btn ${currentReverseFilter === 'line2' ? 'active' : ''}" onclick="filterReverseDiseases(event, 'line2')">
                🥈 Hàng 2 (${line2Count})
              </button>
            </div>
          </div>

          <div id="reverseDiseasesList">
            <!-- Dynamic indicated disease cards rendered by renderReverseDiseasesList() -->
          </div>
        </div>
      `;

      renderReverseDiseasesList();
    }

    function filterReverseDiseases(e, filter) {
      currentReverseFilter = filter;
      document.querySelectorAll('.search-meds-container .med-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      if (e && e.target) {
        e.target.classList.add('active');
      }
      renderReverseDiseasesList();
    }

    function renderReverseDiseasesList() {
      const container = document.getElementById('reverseDiseasesList');
      if (!container || !currentReverseSearchData || !currentReverseSearchData.indicatedDiseases) return;

      let list = currentReverseSearchData.indicatedDiseases;
      if (currentReverseFilter === 'line1') {
        list = list.filter(d => d.line === 1);
      } else if (currentReverseFilter === 'line2') {
        list = list.filter(d => d.line === 2);
      }

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-med-box">
            <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">ℹ️</div>
            <div style="font-weight: 700; color: var(--slate-700);">Không có bệnh lý nào phù hợp với bộ lọc này.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(d => {
        const lineBadge = d.line === 1
          ? '<span class="badge-line-1">🥇 Phác đồ hàng 1 (First-line)</span>'
          : '<span class="badge-line-2">🥈 Phác đồ hàng 2 (Second-line)</span>';

        const noteHtml = d.note
          ? `<div style="font-size: 0.825rem; color: #0369a1; background: #e0f2fe; padding: 0.35rem 0.65rem; border-radius: 6px; margin-top: 0.5rem; border: 1px solid #bae6fd;">
               💡 <strong>Chỉ định cụ thể:</strong> ${escapeHtml(d.note)}
             </div>`
          : '';

        return `
          <div class="indication-disease-card ${d.line === 2 ? 'line-2' : ''}">
            <div class="indication-disease-top">
              <div class="indication-disease-name-group">
                <span class="indication-disease-title">🩺 ${escapeHtml(d.name)}</span>
                ${d.name_en ? `<span class="indication-disease-en">(${escapeHtml(d.name_en)})</span>` : ''}
                <span class="badge-specialty">🏥 ${escapeHtml(d.specialty || 'Nội khoa')}</span>
              </div>
              <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                ${lineBadge}
                <button type="button" class="btn-jump-disease" onclick="jumpToDiseaseDetailFromReverse('${escapeHtml(d.name)}')">
                  🩺 Xem chi tiết bệnh này & phác đồ đầy đủ →
                </button>
              </div>
            </div>
            ${d.description ? `<div style="font-size: 0.85rem; color: var(--slate-600); line-height: 1.5; margin-top: 0.35rem;">${escapeHtml(d.description)}</div>` : ''}
            ${noteHtml}
          </div>
        `;
      }).join('');
    }

    function jumpToDiseaseDetailFromReverse(diseaseName) {
      setSearchMode('disease');
      const input = document.getElementById('diseaseSearchInput');
      if (input) {
        input.value = diseaseName;
        handleSearchInputChange();
      }
      searchMedicinesByDisease(diseaseName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Check health on load & load diseases and medicines
    window.addEventListener('DOMContentLoaded', async () => {
      loadAllDiseases();
      loadAllMedicines();

      try {
        const res = await fetch('/health');
        if (res.ok) {
          const h = await res.json();
          document.getElementById('serverStatusText').textContent = `AI Service v${h.model_version || '2026.10.0'}`;
        }
      } catch (err) {
        document.getElementById('serverStatusBadge').style.background = '#fee2e2';
        document.getElementById('serverStatusBadge').style.color = '#dc2626';
        document.getElementById('serverStatusBadge').style.borderColor = '#fca5a5';
        document.getElementById('serverStatusText').textContent = 'Mất kết nối Server';
      }
    });
