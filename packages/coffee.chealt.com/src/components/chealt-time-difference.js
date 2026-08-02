class TimeDifference extends HTMLElement {
  static millisecondsPerDay = 1000 * 60 * 60 * 24;
  static calculateDifference({ from, to }) {
    if (!from) {
      return;
    }

    const fromDate = new Date(from);
    const toDate = to ? new Date(to) : new Date();

    const fromDateUTC = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const toDateUTC = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

    return Math.floor((toDateUTC - fromDateUTC) / TimeDifference.millisecondsPerDay);
  }

  connectedCallback() {
    this.differenceElement = this.querySelector('[data-difference]');

    if (!this.dataset.from) {
      throw new Error('Specify an element as the `from` date');
    }

    if (!this.dataset.to) {
      throw new Error('Specify an element as the `to` date');
    }

    this.from = document.querySelector(this.dataset.from);
    this.to = document.querySelector(this.dataset.to);

    this.addOnChangeListeners();
    this.triggerCalculateDifference.bind(this)();
  }

  addOnChangeListeners() {
    if (this.from.nodeName === 'INPUT') {
      this.from.addEventListener('change', this.triggerCalculateDifference.bind(this));
    }

    if (this.to.nodeName === 'INPUT') {
      this.to.addEventListener('change', this.triggerCalculateDifference.bind(this));
    }
  }

  triggerCalculateDifference() {
    if (!this.from) {
      throw new Error('`from` element is not available');
    } else if (!this.to) {
      throw new Error('`to` element is not available');
    } else {
      if (this.from.value) {
        this.to.min = this.from.value;
      }

      const difference = TimeDifference.calculateDifference({ from: this.from.value, to: this.to.value });

      if (difference) {
        this.differenceElement.innerHTML = difference;
        this.classList.remove('hidden');
      } else {
        this.differenceElement.innerHTML = '';
        this.classList.add('hidden');
      }
    }
  }
}

if (!customElements.get('chealt-time-difference')) {
  customElements.define('chealt-time-difference', TimeDifference);
}
