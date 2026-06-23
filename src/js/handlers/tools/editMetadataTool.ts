import { state } from '../../state.js';
import { createIcons, icons } from 'lucide';

export function editMetadataTool() {
  const form = document.getElementById('metadata-form');
  const container = document.getElementById('custom-metadata-container');
  const addBtn = document.getElementById('add-custom-meta-btn');

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  (document.getElementById('meta-title') as HTMLInputElement).value =
    state.pdfDoc.getTitle() || '';
  (document.getElementById('meta-author') as HTMLInputElement).value =
    state.pdfDoc.getAuthor() || '';
  (document.getElementById('meta-subject') as HTMLInputElement).value =
    state.pdfDoc.getSubject() || '';
  (document.getElementById('meta-keywords') as HTMLInputElement).value =
    state.pdfDoc.getKeywords() || '';
  (document.getElementById('meta-creator') as HTMLInputElement).value =
    state.pdfDoc.getCreator() || '';
  (document.getElementById('meta-producer') as HTMLInputElement).value =
    state.pdfDoc.getProducer() || '';
  (document.getElementById('meta-creation-date') as HTMLInputElement).value =
    formatDateForInput(state.pdfDoc.getCreationDate());
  (document.getElementById('meta-mod-date') as HTMLInputElement).value =
    formatDateForInput(state.pdfDoc.getModificationDate());

  addBtn.onclick = () => {
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className =
      'flex flex-col sm:flex-row items-stretch sm:items-center gap-2 custom-field-wrapper';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Key (e.g., Department)';
    keyInput.className =
      'custom-meta-key w-full sm:w-1/3 bg-gray-800 border border-gray-600 text-white rounded-lg p-2';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Value (e.g., Marketing)';
    valueInput.className =
      'custom-meta-value w-full sm:flex-grow bg-gray-800 border border-gray-600 text-white rounded-lg p-2';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className =
      'btn p-2 text-red-500 hover:bg-gray-700 rounded-full self-center sm:self-auto';
    removeBtn.innerHTML = '<i data-lucide="trash-2"></i>';
    removeBtn.addEventListener('click', () => fieldWrapper.remove());

    fieldWrapper.append(keyInput, valueInput, removeBtn);
    container.appendChild(fieldWrapper);
    createIcons({ icons });
  };

  form.classList.remove('hidden');
  createIcons({ icons });
}
