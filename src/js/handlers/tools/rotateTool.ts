import { state } from '../../state.js';
import { createIcons, icons } from 'lucide';
import { getRotationState } from '../../utils/rotation-state.js';

export function setupRotateTool() {
  const rotationState = getRotationState() as number[];
  rotationState.length = 0;
  for (let i = 0; i < state.pdfDoc.getPageCount(); i++) {
    rotationState.push(0);
  }

  const rotateAllControls = document.getElementById('rotate-all-controls');
  const rotateAllLeftBtn = document.getElementById('rotate-all-left-btn');
  const rotateAllRightBtn = document.getElementById('rotate-all-right-btn');
  const rotateAllCustomBtn = document.getElementById('rotate-all-custom-btn');
  const rotateAllCustomInput = document.getElementById(
    'custom-rotate-all-input'
  ) as HTMLInputElement;
  const rotateAllDecrementBtn = document.getElementById(
    'rotate-all-decrement-btn'
  );
  const rotateAllIncrementBtn = document.getElementById(
    'rotate-all-increment-btn'
  );

  rotateAllControls.classList.remove('hidden');
  createIcons({ icons });

  const rotateAll = (angle: number) => {
    for (let i = 0; i < rotationState.length; i++) {
      rotationState[i] = rotationState[i] + angle;
    }

    document.querySelectorAll('.page-rotator-item').forEach((item) => {
      const pageIndex = parseInt(
        (item as HTMLElement).dataset.pageIndex || '0'
      );
      const newRotation = rotationState[pageIndex];
      (item as HTMLElement).dataset.rotation = newRotation.toString();

      const thumbnail = item.querySelector('canvas, img');
      if (thumbnail) {
        (thumbnail as HTMLElement).style.transform =
          `rotate(${newRotation}deg)`;
      }

      const input = item.querySelector('input');
      if (input) {
        input.value = newRotation.toString();
      }
    });
  };
  rotateAllLeftBtn.onclick = () => rotateAll(-90);
  rotateAllRightBtn.onclick = () => rotateAll(90);

  if (rotateAllCustomBtn && rotateAllCustomInput) {
    rotateAllCustomBtn.onclick = () => {
      const angle = parseInt(rotateAllCustomInput.value);
      if (!isNaN(angle) && angle !== 0) {
        rotateAll(angle);
      }
    };

    if (rotateAllDecrementBtn) {
      rotateAllDecrementBtn.onclick = () => {
        const current = parseInt(rotateAllCustomInput.value) || 0;
        rotateAllCustomInput.value = (current - 1).toString();
      };
    }

    if (rotateAllIncrementBtn) {
      rotateAllIncrementBtn.onclick = () => {
        const current = parseInt(rotateAllCustomInput.value) || 0;
        rotateAllCustomInput.value = (current + 1).toString();
      };
    }
  }
}
