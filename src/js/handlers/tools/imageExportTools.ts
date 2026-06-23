export function setupPdfToJpg() {
  const qualitySlider = document.getElementById(
    'jpg-quality'
  ) as HTMLInputElement;
  const qualityValue = document.getElementById('jpg-quality-value');
  if (qualitySlider && qualityValue) {
    const updateValue = () => {
      qualityValue.textContent = `${Math.round(parseFloat(qualitySlider.value) * 100)}%`;
    };
    qualitySlider.addEventListener('input', updateValue);
    updateValue();
  }
}

export function setupPdfToPng() {
  const qualitySlider = document.getElementById(
    'png-quality'
  ) as HTMLInputElement;
  const qualityValue = document.getElementById('png-quality-value');
  if (qualitySlider && qualityValue) {
    const updateValue = () => {
      qualityValue.textContent = `${qualitySlider.value}x`;
    };
    qualitySlider.addEventListener('input', updateValue);
    updateValue();
  }
}

export function setupPdfToWebp() {
  const qualitySlider = document.getElementById(
    'webp-quality'
  ) as HTMLInputElement;
  const qualityValue = document.getElementById('webp-quality-value');
  if (qualitySlider && qualityValue) {
    const updateValue = () => {
      qualityValue.textContent = `${Math.round(parseFloat(qualitySlider.value) * 100)}%`;
    };
    qualitySlider.addEventListener('input', updateValue);
    updateValue();
  }
}
