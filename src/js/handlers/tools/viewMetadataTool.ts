import { showAlert, hideLoader, showLoader } from '../../ui.js';
import {
  getPDFDocument,
  readFileAsArrayBuffer,
  formatIsoDate,
} from '../../utils/helpers.js';
import { state } from '../../state.js';

export async function viewMetadataTool() {
  const resultsDiv = document.getElementById('metadata-results');
  showLoader('Analyzing full PDF metadata...');

  try {
    const pdfBytes = await readFileAsArrayBuffer(state.files[0]);
    const pdfjsDoc = await getPDFDocument({
      data: pdfBytes as ArrayBuffer,
    }).promise;
    const [metadataResult, fieldObjects] = await Promise.all([
      pdfjsDoc.getMetadata(),
      pdfjsDoc.getFieldObjects(),
    ]);

    const { info, metadata } = metadataResult;
    const rawXmpString = metadata ? metadata.getRaw() : null;

    resultsDiv.textContent = ''; // Clear safely

    const createSection = (title: string) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-4';
      const h3 = document.createElement('h3');
      h3.className = 'text-lg font-semibold text-white mb-2';
      h3.textContent = title;
      const ul = document.createElement('ul');
      ul.className =
        'space-y-3 text-sm bg-gray-900 p-4 rounded-lg border border-gray-700';
      wrapper.append(h3, ul);
      return { wrapper, ul };
    };

    const createListItem = (key: string, value: string) => {
      const li = document.createElement('li');
      li.className = 'flex flex-col sm:flex-row';
      const strong = document.createElement('strong');
      strong.className = 'w-40 flex-shrink-0 text-gray-400';
      strong.textContent = key;
      const div = document.createElement('div');
      div.className = 'flex-grow text-white break-all';
      div.textContent = value;
      li.append(strong, div);
      return li;
    };

    const parsePdfDate = (pdfDate: string): string => {
      if (!pdfDate || !pdfDate.startsWith('D:')) return pdfDate;
      try {
        const year = pdfDate.substring(2, 6);
        const month = pdfDate.substring(6, 8);
        const day = pdfDate.substring(8, 10);
        const hour = pdfDate.substring(10, 12);
        const minute = pdfDate.substring(12, 14);
        const second = pdfDate.substring(14, 16);
        return new Date(
          `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
        ).toLocaleString();
      } catch {
        return pdfDate;
      }
    };

    const infoSection = createSection('Info Dictionary');
    if (info && Object.keys(info).length > 0) {
      for (const key in info) {
        const value = (info as Record<string, unknown>)[key];
        let displayValue: string;

        if (value === null || typeof value === 'undefined') {
          displayValue = '- Not Set -';
        } else if (
          typeof value === 'object' &&
          'name' in (value as object) &&
          (value as Record<string, unknown>).name
        ) {
          displayValue = String((value as Record<string, unknown>).name);
        } else if (typeof value === 'object') {
          try {
            displayValue = JSON.stringify(value);
          } catch {
            displayValue = '[object Object]';
          }
        } else if (
          (key === 'CreationDate' || key === 'ModDate') &&
          typeof value === 'string'
        ) {
          displayValue = parsePdfDate(value);
        } else {
          displayValue = String(value);
        }

        infoSection.ul.appendChild(createListItem(key, displayValue));
      }
    } else {
      infoSection.ul.innerHTML = `<li><span class="text-gray-500 italic">- No Info Dictionary data found -</span></li>`;
    }
    resultsDiv.appendChild(infoSection.wrapper);

    const fieldsSection = createSection('Interactive Form Fields');
    if (fieldObjects && Object.keys(fieldObjects).length > 0) {
      for (const fieldName in fieldObjects) {
        const field = fieldObjects[fieldName][0] as Record<string, unknown>;
        const value = field.fieldValue || '- Not Set -';
        fieldsSection.ul.appendChild(createListItem(fieldName, String(value)));
      }
    } else {
      fieldsSection.ul.innerHTML = `<li><span class="text-gray-500 italic">- No interactive form fields found -</span></li>`;
    }
    resultsDiv.appendChild(fieldsSection.wrapper);

    const createXmpListItem = (key: string, value: string, indent = 0) => {
      const li = document.createElement('li');
      li.className = 'flex flex-col sm:flex-row';

      const strong = document.createElement('strong');
      strong.className = 'w-56 flex-shrink-0 text-gray-400';
      strong.textContent = key;
      strong.style.paddingLeft = `${indent * 1.2}rem`;

      const div = document.createElement('div');
      div.className = 'flex-grow text-white break-all';
      div.textContent = value;

      li.append(strong, div);
      return li;
    };

    const createXmpHeaderItem = (key: string, indent = 0) => {
      const li = document.createElement('li');
      li.className = 'flex pt-2';
      const strong = document.createElement('strong');
      strong.className = 'w-full flex-shrink-0 text-gray-300 font-medium';
      strong.textContent = key;
      strong.style.paddingLeft = `${indent * 1.2}rem`;
      li.append(strong);
      return li;
    };

    const appendXmpNodes = (
      xmlNode: Element,
      ulElement: HTMLUListElement,
      indentLevel: number
    ) => {
      const xmpDateKeys = [
        'xap:CreateDate',
        'xap:ModifyDate',
        'xap:MetadataDate',
      ];

      const childNodes = Array.from(xmlNode.children);

      for (const child of childNodes) {
        if (child.nodeType !== 1) continue;

        let key = child.tagName;
        const elementChildren = Array.from(child.children).filter(
          (c) => c.nodeType === 1
        );

        if (key === 'rdf:li') {
          appendXmpNodes(child, ulElement, indentLevel);
          continue;
        }
        if (key === 'rdf:Alt') {
          key = '(alt container)';
        }

        if (
          child.getAttribute('rdf:parseType') === 'Resource' &&
          elementChildren.length === 0
        ) {
          ulElement.appendChild(
            createXmpListItem(key, '(Empty Resource)', indentLevel)
          );
          continue;
        }

        if (elementChildren.length > 0) {
          ulElement.appendChild(createXmpHeaderItem(key, indentLevel));
          appendXmpNodes(child, ulElement, indentLevel + 1);
        } else {
          let value = (child.textContent ?? '').trim();
          if (value) {
            if (xmpDateKeys.includes(key)) {
              value = formatIsoDate(value);
            }
            ulElement.appendChild(createXmpListItem(key, value, indentLevel));
          }
        }
      }
    };

    const xmpSection = createSection('XMP Metadata');
    if (rawXmpString) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rawXmpString, 'application/xml');

        const descriptions = xmlDoc.getElementsByTagName('rdf:Description');
        if (descriptions.length > 0) {
          for (const desc of descriptions) {
            appendXmpNodes(desc, xmpSection.ul, 0);
          }
        } else {
          appendXmpNodes(xmlDoc.documentElement, xmpSection.ul, 0);
        }

        if (xmpSection.ul.children.length === 0) {
          xmpSection.ul.innerHTML = `<li><span class="text-gray-500 italic">- No parseable XMP properties found -</span></li>`;
        }
      } catch (xmlError) {
        console.error('Failed to parse XMP XML:', xmlError);
        xmpSection.ul.innerHTML = `<li><span class="text-red-500 italic">- Error parsing XMP XML. Displaying raw. -</span></li>`;
        const pre = document.createElement('pre');
        pre.className = 'text-xs text-gray-300 whitespace-pre-wrap break-all';
        pre.textContent = rawXmpString;
        xmpSection.ul.appendChild(pre);
      }
    } else {
      xmpSection.ul.innerHTML = `<li><span class="text-gray-500 italic">- No XMP metadata found -</span></li>`;
    }
    resultsDiv.appendChild(xmpSection.wrapper);

    resultsDiv.classList.remove('hidden');
  } catch (e) {
    console.error('Failed to view metadata or fields:', e);
    showAlert(
      'Error',
      'Could not fully analyze the PDF. It may be corrupted or have an unusual structure.'
    );
  } finally {
    hideLoader();
  }
}
