class CoffeePricePerGram extends HTMLElement {
  connectedCallback() {
    this.renderChart();
  }

  renderChart() {
    const form = this.closest('form');
    const currency = form.currency.value;
    const price = form.price.value;
    const weight = form.weight.value;
    const percentage = this.dataset.percentage;

    const chartData = this.dataset.chartData;
    const chart = this.querySelector('[data-chart]');

    console.log({
      currency,
      price,
      weight
    });
  }
}

if (!customElements.get('coffee-price-per-gram')) {
  customElements.define('coffee-price-per-gram', CoffeePricePerGram);
}
