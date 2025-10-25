class Stats extends HTMLElement {
  connectedCallback() {
    this.dots = this.querySelectorAll('.dot');

    this.dots.forEach((dot) => {
      dot.addEventListener('mouseover', (event) => {
        this.activateLabel.bind(this)(event.target.dataset.label);
        this.activateDot.bind(this)(event.target.dataset.label);
      });
      dot.addEventListener('mouseout', () => {
        this.activateLabel.bind(this)(this.dataset.defaultLabel);
        this.activateDot.bind(this)(this.dataset.defaultLabel);
      });
    });
  }

  activateLabel(label) {
    this.querySelectorAll('.labels .label').forEach(({ classList }) => classList.remove('active'));
    this.querySelector(`.label[data-dot="${label}"]`).classList.add('active');
  }

  activateDot(label) {
    this.querySelectorAll('.dot').forEach(({ classList }) => classList.remove('active'));
    this.querySelectorAll(`.dot[data-label="${label}"]`).forEach(({ classList }) => classList.add('active'));
  }
}

if (!customElements.get('coffee-stats')) {
  customElements.define('coffee-stats', Stats);
}
