import * as DOMPurifyModule from 'dompurify';
import { FormField } from '../types/form-creator-type.js';
import { escapeHtml } from '../utils/helpers.js';

const DOMPurify = (DOMPurifyModule as any).default || DOMPurifyModule;

type FormFieldAction = NonNullable<FormField['action']>;
type FormFieldVisibilityAction = NonNullable<FormField['visibilityAction']>;

export interface FormPropertiesContext {
  fields: FormField[];
  existingFieldNames: Set<string>;
  existingRadioGroups: Set<string>;
  propertiesPanel: HTMLDivElement | HTMLElement;
  rerenderSelectedField: (field: FormField) => void;
  deleteField: (field: FormField) => void;
  renderField: (field: FormField) => void;
  LucideWindow: Window & { lucide?: { createIcons(): void } };
}

function getTextFieldHtml(field: FormField): string {
  return `
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Value</label>
            <input type="text" id="propValue" value="${escapeHtml(field.defaultValue)}" ${field.combCells > 0 ? `maxlength="${field.combCells}"` : field.maxLength > 0 ? `maxlength="${field.maxLength}"` : ''} class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Max Length (0 for unlimited)</label>
            <input type="number" id="propMaxLength" value="${field.maxLength}" min="0" ${field.combCells > 0 ? 'disabled' : ''} class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50">
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Divide into boxes (0 to disable)</label>
            <input type="number" id="propComb" value="${field.combCells}" min="0" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Font Size</label>
            <input type="number" id="propFontSize" value="${field.fontSize}" min="8" max="72" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Text Color</label>
            <input type="color" id="propTextColor" value="${field.textColor}">
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Alignment</label>
            <select id="propAlignment" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option value="left" ${field.alignment === 'left' ? 'selected' : ''}>Left</option>
            <option value="center" ${field.alignment === 'center' ? 'selected' : ''}>Center</option>
            <option value="right" ${field.alignment === 'right' ? 'selected' : ''}>Right</option>
            </select>
        </div>
        <div class="flex items-center justify-between bg-gray-600 p-2 rounded mt-2">
            <label for="propMultiline" class="text-xs font-semibold text-gray-300">Multi-line</label>
            <button id="propMultilineBtn" class="w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${field.multiline ? 'bg-indigo-600' : 'bg-gray-500'} relative">
                <span class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${field.multiline ? 'translate-x-6' : 'translate-x-0'}"></span>
            </button>
        </div>
    `;
}

function getCheckboxFieldHtml(field: FormField): string {
  return `
        <div class="flex items-center justify-between bg-gray-600 p-2 rounded">
            <label for="propChecked" class="text-xs font-semibold text-gray-300">Checked State</label>
            <button id="propCheckedBtn" class="w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${field.checked ? 'bg-indigo-600' : 'bg-gray-500'} relative">
                <span class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${field.checked ? 'translate-x-6' : 'translate-x-0'}"></span>
            </button>
        </div>
    `;
}

function getRadioFieldHtml(field: FormField): string {
  return `
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Group Name (Must be same for group)</label>
            <input type="text" id="propGroupName" value="${escapeHtml(field.groupName)}" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Export Value</label>
            <input type="text" id="propExportValue" value="${escapeHtml(field.exportValue)}" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div class="flex items-center justify-between bg-gray-600 p-2 rounded mt-2">
            <label for="propChecked" class="text-xs font-semibold text-gray-300">Checked State</label>
            <button id="propCheckedBtn" class="w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${field.checked ? 'bg-indigo-600' : 'bg-gray-500'} relative">
                <span class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${field.checked ? 'translate-x-6' : 'translate-x-0'}"></span>
            </button>
        </div>
    `;
}

function getDropdownFieldHtml(field: FormField): string {
  return `
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Options (One per line or comma separated)</label>
            <textarea id="propOptions" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 h-24">${escapeHtml(field.options?.join('\n') ?? '')}</textarea>
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Selected Option</label>
            <select id="propSelectedOption" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">None</option>
                ${field.options?.map((opt) => `<option value="${escapeHtml(opt)}" ${field.defaultValue === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
            </select>
        </div>
        <div class="text-xs text-gray-400 italic mt-2">
            To actually fill or change the options, use our PDF Form Filler tool.
        </div>
    `;
}

function getButtonFieldHtml(
  field: FormField,
  context: FormPropertiesContext
): string {
  return `
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Label</label>
            <input type="text" id="propLabel" value="${escapeHtml(field.label)}" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Action</label>
            <select id="propAction" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="none" ${field.action === 'none' ? 'selected' : ''}>None</option>
                <option value="reset" ${field.action === 'reset' ? 'selected' : ''}>Reset Form</option>
                <option value="print" ${field.action === 'print' ? 'selected' : ''}>Print Form</option>
                <option value="url" ${field.action === 'url' ? 'selected' : ''}>Open URL</option>
                <option value="js" ${field.action === 'js' ? 'selected' : ''}>Run Javascript</option>
                <option value="showHide" ${field.action === 'showHide' ? 'selected' : ''}>Show/Hide Field</option>
            </select>
        </div>
        <div id="propUrlContainer" class="${field.action === 'url' ? '' : 'hidden'}">
            <label class="block text-xs font-semibold text-gray-300 mb-1">URL</label>
            <input type="text" id="propActionUrl" value="${escapeHtml(field.actionUrl || '')}" placeholder="https://example.com" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div id="propJsContainer" class="${field.action === 'js' ? '' : 'hidden'}">
            <label class="block text-xs font-semibold text-gray-300 mb-1">Javascript Code</label>
            <textarea id="propJsScript" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 h-24 font-mono">${escapeHtml(field.jsScript || '')}</textarea>
        </div>
        <div id="propShowHideContainer" class="${field.action === 'showHide' ? '' : 'hidden'}">
            <div class="mb-2">
                <label class="block text-xs font-semibold text-gray-300 mb-1">Target Field</label>
                <select id="propTargetField" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">Select a field...</option>
                    ${context.fields
                      .filter((f) => f.id !== field.id)
                      .map(
                        (f) =>
                          `<option value="${escapeHtml(f.name)}" ${field.targetFieldName === f.name ? 'selected' : ''}>${escapeHtml(f.name)} (${escapeHtml(f.type)})</option>`
                      )
                      .join('')}
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-300 mb-1">Visibility</label>
                <select id="propVisibilityAction" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="show" ${field.visibilityAction === 'show' ? 'selected' : ''}>Show</option>
                    <option value="hide" ${field.visibilityAction === 'hide' ? 'selected' : ''}>Hide</option>
                    <option value="toggle" ${field.visibilityAction === 'toggle' ? 'selected' : ''}>Toggle</option>
                </select>
            </div>
        </div>
    `;
}

function getSignatureFieldHtml(field: FormField): string {
  return `
        <div class="text-xs text-gray-400 italic mb-2">
            Signature fields are AcroForm signature fields and would only be visible in an advanced PDF viewer.
        </div>
    `;
}

function getDateFieldHtml(field: FormField): string {
  const formats = [
    'm/d',
    'm/d/yy',
    'm/d/yyyy',
    'mm/dd/yy',
    'mm/dd/yyyy',
    'mm/yy',
    'mm/yyyy',
    'd-mmm',
    'd-mmm-yy',
    'd-mmm-yyyy',
    'dd-mmm-yy',
    'dd-mmm-yyyy',
    'yy-mm-dd',
    'yyyy-mm-dd',
    'mmm-yy',
    'mmm-yyyy',
    'mmm d, yyyy',
    'mmmm-yy',
    'mmmm-yyyy',
    'mmmm d, yyyy',
    'dd/mm/yy',
    'dd/mm/yyyy',
    'yyyy/mm/dd',
    'dd.mm.yy',
    'dd.mm.yyyy',
    'm/d/yy h:MM tt',
    'm/d/yyyy h:MM tt',
    'm/d/yy HH:MM',
    'm/d/yyyy HH:MM',
    'yyyy-mm',
    'yyyy',
  ];
  const isCustom = !formats.includes(field.dateFormat || 'mm/dd/yyyy');
  return `
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Date Format</label>
            <select id="propDateFormat" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                ${formats.map((f) => `<option value="${f}" ${field.dateFormat === f ? 'selected' : ''}>${f}</option>`).join('')}
                <option value="custom" ${isCustom ? 'selected' : ''}>Custom</option>
            </select>
        </div>
        <div id="customFormatContainer" class="${isCustom ? '' : 'hidden'} mt-2">
            <label class="block text-xs font-semibold text-gray-300 mb-1">Custom Format</label>
            <input type="text" id="propCustomFormat" value="${isCustom ? escapeHtml(field.dateFormat ?? '') : ''}" placeholder="e.g. dd/mm/yyyy HH:MM:ss" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div class="mt-3 p-2 bg-gray-700 rounded">
            <span class="text-xs text-gray-400">Example of current format:</span>
            <span id="dateFormatExample" class="text-sm text-white font-medium ml-2"></span>
        </div>
        <div class="bg-blue-900/30 border border-blue-700/50 rounded p-2 mt-2">
            <p class="text-xs text-blue-200">
                <i data-lucide="info" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
                <span><strong>Browser Note:</strong> Firefox and Chrome may show their native date picker format during selection. The correct format will apply when you finish entering the date.</span>
            </p>
        </div>
    `;
}

function getImageFieldHtml(field: FormField): string {
  return `
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Label / Prompt</label>
            <input type="text" id="propLabel" value="${escapeHtml(field.label)}" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div class="text-xs text-gray-400 italic mt-2">
            Clicking this field in the PDF will open a file picker to upload an image.
        </div>
    `;
}

function getBarcodeFieldHtml(field: FormField): string {
  return `
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Barcode Format</label>
            <select id="propBarcodeFormat" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="qrcode" ${field.barcodeFormat === 'qrcode' ? 'selected' : ''}>QR Code</option>
                <option value="code128" ${field.barcodeFormat === 'code128' ? 'selected' : ''}>Code 128</option>
                <option value="code39" ${field.barcodeFormat === 'code39' ? 'selected' : ''}>Code 39</option>
                <option value="ean13" ${field.barcodeFormat === 'ean13' ? 'selected' : ''}>EAN-13</option>
                <option value="upca" ${field.barcodeFormat === 'upca' ? 'selected' : ''}>UPC-A</option>
                <option value="datamatrix" ${field.barcodeFormat === 'datamatrix' ? 'selected' : ''}>DataMatrix</option>
                <option value="pdf417" ${field.barcodeFormat === 'pdf417' ? 'selected' : ''}>PDF417</option>
            </select>
        </div>
        <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">Barcode Value</label>
            <input type="text" id="propBarcodeValue" value="${escapeHtml(field.barcodeValue || '')}" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div id="barcodeFormatHint" class="text-xs text-gray-400 italic"></div>
    `;
}

function getSpecificPropsHtml(
  field: FormField,
  context: FormPropertiesContext
): string {
  switch (field.type) {
    case 'text':
      return getTextFieldHtml(field);
    case 'checkbox':
      return getCheckboxFieldHtml(field);
    case 'radio':
      return getRadioFieldHtml(field);
    case 'dropdown':
    case 'optionlist':
      return getDropdownFieldHtml(field);
    case 'button':
      return getButtonFieldHtml(field, context);
    case 'signature':
      return getSignatureFieldHtml(field);
    case 'date':
      return getDateFieldHtml(field);
    case 'image':
      return getImageFieldHtml(field);
    case 'barcode':
      return getBarcodeFieldHtml(field);
    default:
      return '';
  }
}

function getCommonPropertiesHtml(
  field: FormField,
  context: FormPropertiesContext,
  specificProps: string
): string {
  return `
    <div class="space-y-3">
      <div>
        <label class="block text-xs font-semibold text-gray-300 mb-1">Field Name ${field.type === 'radio' ? '(Group Name)' : ''}</label>
        <input type="text" id="propName" value="${escapeHtml(field.name)}" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
        <div id="nameError" class="hidden text-red-400 text-xs mt-1"></div>
      </div>
      ${
        field.type === 'radio' &&
        (context.existingRadioGroups.size > 0 ||
          context.fields.some((f) => f.type === 'radio' && f.id !== field.id))
          ? `
      <div>
        <label class="block text-xs font-semibold text-gray-300 mb-1">Existing Radio Groups</label>
        <select id="existingGroups" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
          <option value="">-- Select existing group --</option>
          ${Array.from(context.existingRadioGroups)
            .map(
              (name) =>
                `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
            )
            .join('')}
          ${Array.from(
            new Set(
              context.fields
                .filter((f) => f.type === 'radio' && f.id !== field.id)
                .map((f) => f.name)
            )
          )
            .map((name) =>
              !context.existingRadioGroups.has(name)
                ? `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
                : ''
            )
            .join('')}
        </select>
        <p class="text-xs text-gray-400 mt-1">Select to add this button to an existing group</p>
      </div>
      `
          : ''
      }
      ${specificProps}
      <div>
        <label class="block text-xs font-semibold text-gray-300 mb-1">Tooltip / Help Text</label>
        <input type="text" id="propTooltip" value="${escapeHtml(field.tooltip)}" placeholder="Description for screen readers" class="w-full bg-gray-600 border border-gray-500 text-white rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500">
      </div>
      <div class="flex items-center">
        <input type="checkbox" id="propRequired" ${field.required ? 'checked' : ''} class="mr-2">
        <label for="propRequired" class="text-xs font-semibold text-gray-300">Required</label>
      </div>
      <div class="flex items-center">
        <input type="checkbox" id="propReadOnly" ${field.readOnly ? 'checked' : ''} class="mr-2">
        <label for="propReadOnly" class="text-xs font-semibold text-gray-300">Read Only</label>
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-300 mb-1">Border Color</label>
        <input type="color" id="propBorderColor" value="${field.borderColor || '#000000'}">
      </div>
      <div class="flex items-center">
        <input type="checkbox" id="propHideBorder" ${field.hideBorder ? 'checked' : ''} class="mr-2">
        <label for="propHideBorder" class="text-xs font-semibold text-gray-300">Hide Border</label>
      </div>
      <div class="flex items-center">
        <input type="checkbox" id="propTransparentBackground" ${field.transparentBackground ? 'checked' : ''} class="mr-2">
        <label for="propTransparentBackground" class="text-xs font-semibold text-gray-300">Transparent Background</label>
      </div>
      <button id="deleteBtn" class="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition text-sm font-semibold">
        Delete Field
      </button>
    </div>
  `;
}

function attachCommonListeners(
  field: FormField,
  context: FormPropertiesContext
): void {
  const propName = document.getElementById('propName') as HTMLInputElement;
  const nameError = document.getElementById('nameError') as HTMLDivElement;
  const propTooltip = document.getElementById(
    'propTooltip'
  ) as HTMLInputElement;
  const propRequired = document.getElementById(
    'propRequired'
  ) as HTMLInputElement;
  const propReadOnly = document.getElementById(
    'propReadOnly'
  ) as HTMLInputElement;
  const deleteBtn = document.getElementById('deleteBtn') as HTMLButtonElement;

  const validateName = (newName: string): boolean => {
    if (!newName) {
      nameError.textContent = 'Field name cannot be empty';
      nameError.classList.remove('hidden');
      propName.classList.add('border-red-500');
      return false;
    }

    if (field.type === 'radio') {
      nameError.classList.add('hidden');
      propName.classList.remove('border-red-500');
      return true;
    }

    const isDuplicateInFields = context.fields.some(
      (f) => f.id !== field.id && f.name === newName
    );
    const isDuplicateInPdf = context.existingFieldNames.has(newName);

    if (isDuplicateInFields || isDuplicateInPdf) {
      nameError.textContent = `Field name "${newName}" already exists in this ${isDuplicateInPdf ? 'PDF' : 'form'}. Please try using a unique name.`;
      nameError.classList.remove('hidden');
      propName.classList.add('border-red-500');
      return false;
    }

    nameError.classList.add('hidden');
    propName.classList.remove('border-red-500');
    return true;
  };

  propName.addEventListener('input', (e) => {
    const newName = (e.target as HTMLInputElement).value.trim();
    validateName(newName);
  });

  propName.addEventListener('change', (e) => {
    const newName = (e.target as HTMLInputElement).value.trim();

    if (!validateName(newName)) {
      (e.target as HTMLInputElement).value = field.name;
      return;
    }

    field.name = newName;
    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const label = fieldWrapper.querySelector('.field-label') as HTMLElement;
      if (label) label.textContent = field.name;
    }
  });

  propTooltip.addEventListener('input', (e) => {
    field.tooltip = (e.target as HTMLInputElement).value;
  });

  if (field.type === 'radio') {
    const existingGroupsSelect = document.getElementById(
      'existingGroups'
    ) as HTMLSelectElement;
    if (existingGroupsSelect) {
      existingGroupsSelect.addEventListener('change', (e) => {
        const selectedGroup = (e.target as HTMLSelectElement).value;
        if (selectedGroup) {
          propName.value = selectedGroup;
          field.name = selectedGroup;
          validateName(selectedGroup);

          const fieldWrapper = document.getElementById(field.id);
          if (fieldWrapper) {
            const label = fieldWrapper.querySelector(
              '.field-label'
            ) as HTMLElement;
            if (label) label.textContent = field.name;
          }
        }
      });
    }
  }

  propRequired.addEventListener('change', (e) => {
    field.required = (e.target as HTMLInputElement).checked;
  });

  propReadOnly.addEventListener('change', (e) => {
    field.readOnly = (e.target as HTMLInputElement).checked;
  });

  const propBorderColor = document.getElementById(
    'propBorderColor'
  ) as HTMLInputElement;
  const propHideBorder = document.getElementById(
    'propHideBorder'
  ) as HTMLInputElement;
  const propTransparentBackground = document.getElementById(
    'propTransparentBackground'
  ) as HTMLInputElement;

  propBorderColor.addEventListener('input', (e) => {
    field.borderColor = (e.target as HTMLInputElement).value;
  });

  propHideBorder.addEventListener('change', (e) => {
    field.hideBorder = (e.target as HTMLInputElement).checked;
    context.rerenderSelectedField(field);
  });

  propTransparentBackground.addEventListener('change', (e) => {
    field.transparentBackground = (e.target as HTMLInputElement).checked;
    context.rerenderSelectedField(field);
  });

  deleteBtn.addEventListener('click', () => {
    context.deleteField(field);
  });
}

function attachTextListeners(field: FormField): void {
  const propValue = document.getElementById('propValue') as HTMLInputElement;
  const propMaxLength = document.getElementById(
    'propMaxLength'
  ) as HTMLInputElement;
  const propComb = document.getElementById('propComb') as HTMLInputElement;
  const propFontSize = document.getElementById(
    'propFontSize'
  ) as HTMLInputElement;
  const propTextColor = document.getElementById(
    'propTextColor'
  ) as HTMLInputElement;
  const propAlignment = document.getElementById(
    'propAlignment'
  ) as HTMLSelectElement;

  propValue.addEventListener('input', (e) => {
    field.defaultValue = (e.target as HTMLInputElement).value;
    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const textEl = fieldWrapper.querySelector('.field-text') as HTMLElement;
      if (textEl) textEl.textContent = field.defaultValue;
    }
  });

  propMaxLength.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    field.maxLength = isNaN(val) ? 0 : Math.max(0, val);
    if (field.maxLength > 0) {
      propValue.maxLength = field.maxLength;
      if (field.defaultValue.length > field.maxLength) {
        field.defaultValue = field.defaultValue.substring(0, field.maxLength);
        propValue.value = field.defaultValue;
        const fieldWrapper = document.getElementById(field.id);
        if (fieldWrapper) {
          const textEl = fieldWrapper.querySelector(
            '.field-text'
          ) as HTMLElement;
          if (textEl) textEl.textContent = field.defaultValue;
        }
      }
    } else {
      propValue.removeAttribute('maxLength');
    }
  });

  propComb.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    field.combCells = isNaN(val) ? 0 : Math.max(0, val);

    if (field.combCells > 0) {
      propValue.maxLength = field.combCells;
      propMaxLength.value = field.combCells.toString();
      propMaxLength.disabled = true;
      field.maxLength = field.combCells;

      if (field.defaultValue.length > field.combCells) {
        field.defaultValue = field.defaultValue.substring(0, field.combCells);
        propValue.value = field.defaultValue;
      }
    } else {
      propMaxLength.disabled = false;
      propValue.removeAttribute('maxLength');
      if (field.maxLength > 0) {
        propValue.maxLength = field.maxLength;
      }
    }

    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const textEl = fieldWrapper.querySelector('.field-text') as HTMLElement;
      if (textEl) {
        textEl.textContent = field.defaultValue;
        if (field.combCells > 0) {
          textEl.style.backgroundImage = `repeating-linear-gradient(90deg, transparent, transparent calc((100% / ${field.combCells}) - 1px), #e5e7eb calc((100% / ${field.combCells}) - 1px), #e5e7eb calc(100% / ${field.combCells}))`;
          textEl.style.fontFamily = 'monospace';
          textEl.style.letterSpacing = `calc(${field.width / field.combCells}px - 1ch)`;
          textEl.style.paddingLeft = `calc((${field.width / field.combCells}px - 1ch) / 2)`;
          textEl.style.overflow = 'hidden';
          textEl.style.textAlign = 'left';
          textEl.style.justifyContent = 'flex-start';
        } else {
          textEl.style.backgroundImage = 'none';
          textEl.style.fontFamily = 'inherit';
          textEl.style.letterSpacing = 'normal';
          textEl.style.textAlign = field.alignment;
          textEl.style.justifyContent =
            field.alignment === 'left'
              ? 'flex-start'
              : field.alignment === 'right'
                ? 'flex-end'
                : 'center';
        }
      }
    }
  });

  propFontSize.addEventListener('input', (e) => {
    field.fontSize = parseInt((e.target as HTMLInputElement).value);
    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const textEl = fieldWrapper.querySelector('.field-text') as HTMLElement;
      if (textEl) textEl.style.fontSize = field.fontSize + 'px';
    }
  });

  propTextColor.addEventListener('input', (e) => {
    field.textColor = (e.target as HTMLInputElement).value;
    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const textEl = fieldWrapper.querySelector('.field-text') as HTMLElement;
      if (textEl) textEl.style.color = field.textColor;
    }
  });

  propAlignment.addEventListener('change', (e) => {
    field.alignment = (e.target as HTMLSelectElement).value as
      | 'left'
      | 'center'
      | 'right';
    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const textEl = fieldWrapper.querySelector('.field-text') as HTMLElement;
      if (textEl) {
        textEl.style.textAlign = field.alignment;
        textEl.style.justifyContent =
          field.alignment === 'left'
            ? 'flex-start'
            : field.alignment === 'right'
              ? 'flex-end'
              : 'center';
      }
    }
  });

  const propMultilineBtn = document.getElementById(
    'propMultilineBtn'
  ) as HTMLButtonElement;
  if (propMultilineBtn) {
    propMultilineBtn.addEventListener('click', () => {
      field.multiline = !field.multiline;
      const span = propMultilineBtn.querySelector('span');
      if (field.multiline) {
        propMultilineBtn.classList.remove('bg-gray-500');
        propMultilineBtn.classList.add('bg-indigo-600');
        span?.classList.remove('translate-x-0');
        span?.classList.add('translate-x-6');
      } else {
        propMultilineBtn.classList.remove('bg-indigo-600');
        propMultilineBtn.classList.add('bg-gray-500');
        span?.classList.remove('translate-x-6');
        span?.classList.add('translate-x-0');
      }

      const fieldWrapper = document.getElementById(field.id);
      if (fieldWrapper) {
        const textEl = fieldWrapper.querySelector('.field-text') as HTMLElement;
        if (textEl) {
          if (field.multiline) {
            textEl.style.whiteSpace = 'pre-wrap';
            textEl.style.alignItems = 'flex-start';
            textEl.style.overflow = 'hidden';
          } else {
            textEl.style.whiteSpace = 'nowrap';
            textEl.style.alignItems = 'center';
            textEl.style.overflow = 'hidden';
          }
        }
      }
    });
  }
}

function attachCheckboxListeners(field: FormField): void {
  const propCheckedBtn = document.getElementById(
    'propCheckedBtn'
  ) as HTMLButtonElement;
  propCheckedBtn.addEventListener('click', () => {
    field.checked = !field.checked;

    const span = propCheckedBtn.querySelector('span');
    if (field.checked) {
      propCheckedBtn.classList.remove('bg-gray-500');
      propCheckedBtn.classList.add('bg-indigo-600');
      span?.classList.remove('translate-x-0');
      span?.classList.add('translate-x-6');
    } else {
      propCheckedBtn.classList.remove('bg-indigo-600');
      propCheckedBtn.classList.add('bg-gray-500');
      span?.classList.remove('translate-x-6');
      span?.classList.add('translate-x-0');
    }

    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const contentEl = fieldWrapper.querySelector(
        '.field-content'
      ) as HTMLElement;
      if (contentEl) {
        if (field.type === 'checkbox') {
          contentEl.innerHTML = field.checked
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full p-1"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '';
        } else {
          contentEl.innerHTML = field.checked
            ? '<div class="w-3/4 h-3/4 bg-black rounded-full"></div>'
            : '';
        }
      }
    }
  });
}

function attachRadioListeners(field: FormField): void {
  attachCheckboxListeners(field);
  const propGroupName = document.getElementById(
    'propGroupName'
  ) as HTMLInputElement;
  const propExportValue = document.getElementById(
    'propExportValue'
  ) as HTMLInputElement;

  propGroupName.addEventListener('input', (e) => {
    field.groupName = (e.target as HTMLInputElement).value;
  });
  propExportValue.addEventListener('input', (e) => {
    field.exportValue = (e.target as HTMLInputElement).value;
  });
}

function attachDropdownListeners(
  field: FormField,
  context: FormPropertiesContext
): void {
  const propOptions = document.getElementById(
    'propOptions'
  ) as HTMLTextAreaElement;
  propOptions.addEventListener('input', (e) => {
    const val = (e.target as HTMLTextAreaElement).value;
    field.options = val
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const propSelectedOption = document.getElementById(
      'propSelectedOption'
    ) as HTMLSelectElement;
    if (propSelectedOption) {
      const currentVal = field.defaultValue;
      propSelectedOption.innerHTML =
        '<option value="">None</option>' +
        field.options
          ?.map(
            (opt) =>
              `<option value="${escapeHtml(opt)}" ${currentVal === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`
          )
          .join('');

      if (currentVal && field.options && !field.options.includes(currentVal)) {
        field.defaultValue = '';
        propSelectedOption.value = '';
      }
    }
    context.renderField(field);
  });

  const propSelectedOption = document.getElementById(
    'propSelectedOption'
  ) as HTMLSelectElement;
  propSelectedOption.addEventListener('change', (e) => {
    field.defaultValue = (e.target as HTMLSelectElement).value;
    context.renderField(field);
  });
}

function attachButtonListeners(field: FormField): void {
  const propLabel = document.getElementById('propLabel') as HTMLInputElement;
  propLabel.addEventListener('input', (e) => {
    field.label = (e.target as HTMLInputElement).value;
    const fieldWrapper = document.getElementById(field.id);
    if (fieldWrapper) {
      const contentEl = fieldWrapper.querySelector(
        '.field-content'
      ) as HTMLElement;
      if (contentEl) contentEl.textContent = field.label || 'Button';
    }
  });

  const propAction = document.getElementById('propAction') as HTMLSelectElement;
  const propUrlContainer = document.getElementById(
    'propUrlContainer'
  ) as HTMLDivElement;
  const propJsContainer = document.getElementById(
    'propJsContainer'
  ) as HTMLDivElement;
  const propShowHideContainer = document.getElementById(
    'propShowHideContainer'
  ) as HTMLDivElement;

  propAction.addEventListener('change', (e) => {
    const actionValue = (e.target as HTMLSelectElement)
      .value as FormFieldAction;
    field.action = actionValue;

    propUrlContainer.classList.add('hidden');
    propJsContainer.classList.add('hidden');
    propShowHideContainer.classList.add('hidden');

    if (field.action === 'url') {
      propUrlContainer.classList.remove('hidden');
    } else if (field.action === 'js') {
      propJsContainer.classList.remove('hidden');
    } else if (field.action === 'showHide') {
      propShowHideContainer.classList.remove('hidden');
    }
  });

  const propActionUrl = document.getElementById(
    'propActionUrl'
  ) as HTMLInputElement;
  propActionUrl.addEventListener('input', (e) => {
    field.actionUrl = (e.target as HTMLInputElement).value;
  });

  const propJsScript = document.getElementById(
    'propJsScript'
  ) as HTMLTextAreaElement;
  if (propJsScript) {
    propJsScript.addEventListener('input', (e) => {
      field.jsScript = (e.target as HTMLTextAreaElement).value;
    });
  }

  const propTargetField = document.getElementById(
    'propTargetField'
  ) as HTMLSelectElement;
  if (propTargetField) {
    propTargetField.addEventListener('change', (e) => {
      field.targetFieldName = (e.target as HTMLSelectElement).value;
    });
  }

  const propVisibilityAction = document.getElementById(
    'propVisibilityAction'
  ) as HTMLSelectElement;
  if (propVisibilityAction) {
    propVisibilityAction.addEventListener('change', (e) => {
      field.visibilityAction = (e.target as HTMLSelectElement)
        .value as FormFieldVisibilityAction;
    });
  }
}

function attachDateListeners(
  field: FormField,
  context: FormPropertiesContext
): void {
  const propDateFormat = document.getElementById(
    'propDateFormat'
  ) as HTMLSelectElement;
  const customFormatContainer = document.getElementById(
    'customFormatContainer'
  ) as HTMLDivElement;
  const propCustomFormat = document.getElementById(
    'propCustomFormat'
  ) as HTMLInputElement;
  const dateFormatExample = document.getElementById(
    'dateFormatExample'
  ) as HTMLSpanElement;

  const formatDateExample = (format: string): string => {
    const now = new Date();
    const d = now.getDate();
    const dd = d.toString().padStart(2, '0');
    const m = now.getMonth() + 1;
    const mm = m.toString().padStart(2, '0');
    const yy = now.getFullYear().toString().slice(-2);
    const yyyy = now.getFullYear().toString();
    const h = now.getHours() % 12 || 12;
    const HH = now.getHours().toString().padStart(2, '0');
    const MM = now.getMinutes().toString().padStart(2, '0');
    const tt = now.getHours() >= 12 ? 'PM' : 'AM';
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthNamesFull = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const mmm = monthNames[now.getMonth()];
    const mmmm = monthNamesFull[now.getMonth()];

    return format
      .replace(/mmmm/g, mmmm)
      .replace(/mmm/g, mmm)
      .replace(/mm/g, mm)
      .replace(/m/g, m.toString())
      .replace(/dddd/g, dd)
      .replace(/dd/g, dd)
      .replace(/d/g, d.toString())
      .replace(/yyyy/g, yyyy)
      .replace(/yy/g, yy)
      .replace(/HH/g, HH)
      .replace(/h/g, h.toString())
      .replace(/MM/g, MM)
      .replace(/tt/g, tt);
  };

  const updateExample = () => {
    if (dateFormatExample) {
      dateFormatExample.textContent = formatDateExample(
        field.dateFormat || 'mm/dd/yyyy'
      );
    }
  };

  updateExample();

  if (propDateFormat) {
    propDateFormat.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value === 'custom') {
        customFormatContainer?.classList.remove('hidden');
        if (propCustomFormat && propCustomFormat.value) {
          field.dateFormat = propCustomFormat.value;
        }
      } else {
        customFormatContainer?.classList.add('hidden');
        field.dateFormat = value;
      }
      updateExample();
      const fieldWrapper = document.getElementById(field.id);
      if (fieldWrapper) {
        const textSpan = fieldWrapper.querySelector(
          '.date-format-text'
        ) as HTMLElement;
        if (textSpan) {
          textSpan.textContent = field.dateFormat;
        }
      }
      setTimeout(() => context.LucideWindow.lucide?.createIcons(), 0);
    });
  }

  if (propCustomFormat) {
    propCustomFormat.addEventListener('input', (e) => {
      field.dateFormat = (e.target as HTMLInputElement).value || 'mm/dd/yyyy';
      updateExample();
      const fieldWrapper = document.getElementById(field.id);
      if (fieldWrapper) {
        const textSpan = fieldWrapper.querySelector(
          '.date-format-text'
        ) as HTMLElement;
        if (textSpan) {
          textSpan.textContent = field.dateFormat;
        }
      }
    });
  }
}

function attachImageListeners(
  field: FormField,
  context: FormPropertiesContext
): void {
  const propLabel = document.getElementById('propLabel') as HTMLInputElement;
  propLabel.addEventListener('input', (e) => {
    field.label = (e.target as HTMLInputElement).value;
    context.renderField(field);
  });
}

function attachBarcodeListeners(
  field: FormField,
  context: FormPropertiesContext
): void {
  const propBarcodeFormat = document.getElementById(
    'propBarcodeFormat'
  ) as HTMLSelectElement;
  const propBarcodeValue = document.getElementById(
    'propBarcodeValue'
  ) as HTMLInputElement;

  const barcodeSampleValues: Record<string, string> = {
    qrcode: 'https://example.com',
    code128: 'ABC-123',
    code39: 'ABC123',
    ean13: '590123412345',
    upca: '01234567890',
    datamatrix: 'https://example.com',
    pdf417: 'https://example.com',
  };

  const barcodeFormatHints: Record<string, string> = {
    qrcode: 'Any text, URL, or data',
    code128: 'ASCII characters (letters, numbers, symbols)',
    code39: 'Uppercase A-Z, digits 0-9, and - . $ / + % SPACE',
    ean13: 'Exactly 12 or 13 digits',
    upca: 'Exactly 11 or 12 digits',
    datamatrix: 'Any text, URL, or data',
    pdf417: 'Any text, URL, or data',
  };

  const hintEl = document.getElementById('barcodeFormatHint');
  if (hintEl)
    hintEl.textContent =
      barcodeFormatHints[field.barcodeFormat || 'qrcode'] || '';

  if (propBarcodeFormat) {
    propBarcodeFormat.addEventListener('change', (e) => {
      const newFormat = (e.target as HTMLSelectElement).value;
      field.barcodeFormat = newFormat;
      field.barcodeValue = barcodeSampleValues[newFormat] || 'hello';
      if (propBarcodeValue) propBarcodeValue.value = field.barcodeValue;
      if (hintEl) hintEl.textContent = barcodeFormatHints[newFormat] || '';
      context.renderField(field);
    });
  }

  if (propBarcodeValue) {
    propBarcodeValue.addEventListener('input', (e) => {
      field.barcodeValue = (e.target as HTMLInputElement).value;
      context.renderField(field);
    });
  }
}

function attachSpecificListeners(
  field: FormField,
  context: FormPropertiesContext
): void {
  switch (field.type) {
    case 'text':
      attachTextListeners(field);
      break;
    case 'checkbox':
      attachCheckboxListeners(field);
      break;
    case 'radio':
      attachRadioListeners(field);
      break;
    case 'dropdown':
    case 'optionlist':
      attachDropdownListeners(field, context);
      break;
    case 'button':
      attachButtonListeners(field);
      break;
    case 'signature':
      /* no-op */ break;
    case 'date':
      attachDateListeners(field, context);
      break;
    case 'image':
      attachImageListeners(field, context);
      break;
    case 'barcode':
      attachBarcodeListeners(field, context);
      break;
  }
}

export function setupPropertiesPanel(
  field: FormField,
  context: FormPropertiesContext
): void {
  const specificProps = getSpecificPropsHtml(field, context);
  const propertiesHtml = getCommonPropertiesHtml(field, context, specificProps);

  context.propertiesPanel.innerHTML = DOMPurify.sanitize(propertiesHtml, {
    ADD_ATTR: ['target'],
  });

  attachCommonListeners(field, context);
  attachSpecificListeners(field, context);
}
