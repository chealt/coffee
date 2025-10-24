const previousVisibleSibling = (element) => {
  const visibleSiblings = element.parentElement.querySelectorAll('[role="option"]:not([aria-hidden="true"])');
  const currentIndex = Array.from(visibleSiblings).indexOf(element);

  return visibleSiblings[currentIndex - 1];
};

const nextVisibleSibling = (element) => {
  const visibleSiblings = element.parentElement.querySelectorAll('[role="option"]:not([aria-hidden="true"])');
  const currentIndex = Array.from(visibleSiblings).indexOf(element);

  return visibleSiblings[currentIndex + 1];
};

class Select extends HTMLElement {
  connectedCallback() {
    this.searchable = this.dataset.searchable === 'true';
    this.hiddenInput = this.querySelector('input[type="hidden"]');
    this.inputValueElement = this.querySelector('.input-value');
    this.options = this.querySelectorAll('[role="option"]');

    if (this.searchable) {
      this.options.forEach((element) => {
        element.addEventListener('click', () => {
          const value = element.dataset.inputValue;
          const label = element.dataset.inputLabel;

          this.hiddenInput.value = value;

          this.hiddenInput.dispatchEvent(
            new InputEvent('input', {
              data: value
            })
          );

          this.inputValueElement.innerText = label;
          element.closest('dialog')?.close();
        });

        element.addEventListener('keyup', (event) => {
          const filterInput = element.closest('dialog')?.querySelector('chealt-filter input');
          if (event.key === 'Enter') {
            element.click();
          } else if (event.key === 'ArrowDown') {
            const nextElement = nextVisibleSibling(element) || filterInput;

            nextElement?.focus();
          } else if (event.key === 'ArrowUp') {
            const previousElement = previousVisibleSibling(element) || filterInput;

            previousElement?.focus();
          }
        });
      });
    }
  }
}

if (!customElements.get('coffee-select')) {
  customElements.define('coffee-select', Select);
}
