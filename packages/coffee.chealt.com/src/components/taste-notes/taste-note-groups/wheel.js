const animationOptions = {
  duration: 500,
  easing: 'ease-out',
  fill: 'forwards'
};

class TasteNoteWheel extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('[data-spin]');
    this.svg = this.querySelector('svg');
    this.wheel = this.querySelector('.wheel');
    this.randomCoffeeContainer = this.querySelector('.random-coffee-container');
    this.randomCoffee = this.querySelector('.random-coffee');
    this.groups = JSON.parse(this.dataset.groups);
    this.dataset.numberOfSegments = this.groups.length;
    this.tryAgainButton = this.querySelector('[data-try-again]');
    this.urlPrefix = this.dataset.urlPrefix;

    this.triggerButton.addEventListener('click', (event) => {
      event.preventDefault();

      this.spinTheWheel(this.svg);
    });

    this.tryAgainButton.addEventListener('click', (event) => {
      event.preventDefault();

      TasteNoteWheel.flip(this.randomCoffeeContainer, this.wheel);
    });
  }

  async spinTheWheel(svg) {
    this.triggerButton.disabled = true;

    const rotations = 1.8 * 360;
    const randomRotation = rotations + Math.floor(Math.random() * 360);
    const segmentSize = 360 / this.dataset.numberOfSegments;
    const degreesFromStart = 360 * (randomRotation / 360 - Math.floor(randomRotation / 360));
    // have to offset with 2 because the groups order is shifted by that on the SVG
    const selectedGroupIndex = this.groups.length - Math.floor(degreesFromStart / segmentSize) - 1 - 2;
    const selectedGroup = this.groups.slice(selectedGroupIndex)[0];

    this.animation = svg.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${randomRotation}deg)` }], {
      duration: 2 * 1000,
      easing: 'ease-out',
      fill: 'forwards'
    });

    this.animation.addEventListener('finish', () => {
      this.triggerButton.disabled = false;

      TasteNoteWheel.flip(this.wheel, this.randomCoffeeContainer);
    });

    const response = await fetch(`${this.urlPrefix}taste-note-groups/${selectedGroup}/coffees/random`);
    const coffeeHTML = await response.text();

    this.randomCoffee.innerHTML = coffeeHTML;
  }

  static flip(from, to) {
    from
      .animate(
        [{ transform: 'rotate3d(0, 1, 0, 0turn)' }, { transform: 'rotate3d(0, 1, 0, 0.25turn)' }],
        animationOptions
      )
      .addEventListener('finish', () => {
        to.animate(
          [{ transform: 'rotate3d(0, 1, 0, 0.25turn)' }, { transform: 'rotate3d(0, 1, 0, 0turn)' }],
          animationOptions
        );
      });
  }
}

if (!customElements.get('coffee-taste-note-wheel')) {
  customElements.define('coffee-taste-note-wheel', TasteNoteWheel);
}
