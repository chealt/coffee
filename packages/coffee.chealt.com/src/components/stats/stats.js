class Stats extends HTMLElement {
  connectedCallback() {
    this.parts = this.querySelectorAll('.part');

    this.parts.forEach((part) => {
      part.addEventListener('mouseover', (event) => {
        this.activateLabel.bind(this)(event.target.dataset.label);
        this.activatePart.bind(this)(event.target.dataset.label);
      });
      part.addEventListener('mouseout', () => {
        this.activateLabel.bind(this)(this.dataset.defaultLabel);
        this.activatePart.bind(this)(this.dataset.defaultLabel);
      });
    });
  }

  activateLabel(label) {
    this.querySelectorAll('.labels .label').forEach(({ classList }) => classList.remove('active'));
    this.querySelector(`.label[data-part="${label}"]`).classList.add('active');
  }

  activatePart(label) {
    this.querySelectorAll('.part').forEach(({ classList }) => classList.remove('active'));
    this.querySelectorAll(`.part[data-label="${label}"]`).forEach(({ classList }) => classList.add('active'));
  }
}

if (!customElements.get('coffee-stats')) {
  customElements.define('coffee-stats', Stats);
}
